import { mkdir, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  ApiKeys,
  DownloadRequest,
  DownloadSummary,
  MediaType,
  ProgressEvent,
  SourceError,
  SourceId,
  SourceResult
} from '../shared/types'
import { supportsVideo } from '../shared/media'
import { getApiKeys } from './config'
import { sources } from './sources'
import { SourceException, type MediaHit } from './sources/types'

/**
 * Orchestration du téléchargement (DEV_PLAN §4 & §7).
 *
 * Pour chaque source activée : `search()` → liste d'images, puis téléchargement
 * avec un **pool de concurrence** (4 par source) → écriture
 * `<source>_<id>.<ext>`. Les sources tournent en parallèle via
 * `Promise.allSettled` : une source en échec n'arrête pas les autres.
 * Un `ProgressEvent` est émis à chaque étape (recherche, chaque image, fin).
 * Idempotence douce : un fichier déjà présent (même id) est sauté.
 */

/** Téléchargements simultanés par source (évite de saturer réseau/API). */
const CONCURRENCY = 4
/** Concurrence réduite en vidéo : fichiers bien plus lourds. */
const VIDEO_CONCURRENCY = 2

/** Délai max de téléchargement d'un média (ms) avant abandon. Vidéo = plus long. */
const DOWNLOAD_TIMEOUT_MS = 30_000
const VIDEO_DOWNLOAD_TIMEOUT_MS = 120_000

type Outcome = 'downloaded' | 'skipped' | 'failed'

/** Clé API d'une source (Openverse est anonyme → chaîne vide). */
function keyFor(id: SourceId, keys: ApiKeys): string {
  return id === 'openverse' ? '' : keys[id]
}

function toSourceError(e: unknown): SourceError {
  if (e instanceof SourceException) return e.error
  return { type: 'api', message: e instanceof Error ? e.message : String(e) }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Extension déduite de l'URL (chemin, puis param `fm` d'Unsplash). */
function extFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const m = u.pathname.match(/\.(jpe?g|png|gif|webp|avif|mp4|webm|mov|m4v)$/i)
    if (m) return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase()
    const fm = u.searchParams.get('fm')
    if (fm && /^(jpe?g|png|gif|webp|avif)$/i.test(fm)) {
      return fm.toLowerCase() === 'jpeg' ? 'jpg' : fm.toLowerCase()
    }
  } catch {
    // URL invalide → fallback géré par l'appelant
  }
  return null
}

/** Extension déduite du `Content-Type` de la réponse. */
function extFromContentType(ct: string | null): string | null {
  if (!ct) return null
  const mime = ct.split(';')[0].trim().toLowerCase()
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov'
  }
  return map[mime] ?? null
}

/**
 * Télécharge une image. `'skipped'` si déjà présente, `'failed'` si la requête
 * réseau échoue (toléré, n'arrête pas la source). Une erreur d'écriture disque
 * lève une `SourceException` `fs` (systémique → arrête la source).
 */
async function downloadOne(
  hit: MediaHit,
  source: SourceId,
  dir: string,
  mediaType: MediaType
): Promise<Outcome> {
  const urlExt = extFromUrl(hit.url)
  if (urlExt && (await exists(join(dir, `${source}_${hit.id}.${urlExt}`)))) return 'skipped'

  const timeout = mediaType === 'video' ? VIDEO_DOWNLOAD_TIMEOUT_MS : DOWNLOAD_TIMEOUT_MS
  let res: Response
  try {
    res = await fetch(hit.url, { signal: AbortSignal.timeout(timeout) })
  } catch {
    // Timeout réseau ou erreur de connexion → toléré (n'arrête pas la source).
    return 'failed'
  }
  if (!res.ok) return 'failed'

  // Repli d'extension : `mp4` en vidéo (URLs Pixabay parfois sans extension), `jpg` en photo.
  const fallbackExt = mediaType === 'video' ? 'mp4' : 'jpg'
  const ext = urlExt ?? extFromContentType(res.headers.get('content-type')) ?? fallbackExt
  const path = join(dir, `${source}_${hit.id}.${ext}`)
  if (await exists(path)) return 'skipped'

  let buf: Buffer
  try {
    buf = Buffer.from(await res.arrayBuffer())
  } catch {
    return 'failed'
  }
  try {
    await writeFile(path, buf)
  } catch (e) {
    throw new SourceException({ type: 'fs', message: `Écriture : ${(e as Error).message}` })
  }
  return 'downloaded'
}

/** Exécute `worker(idx)` pour `idx ∈ [0, total)` avec au plus `limit` en parallèle. */
async function runPool(
  total: number,
  limit: number,
  worker: (idx: number) => Promise<void>
): Promise<void> {
  let next = 0
  let failure: unknown
  async function runner(): Promise<void> {
    while (failure === undefined && next < total) {
      const idx = next++
      try {
        await worker(idx)
      } catch (e) {
        failure = e // arrête tous les runners (cas erreur disque)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, total) }, runner))
  if (failure !== undefined) throw failure
}

/** Recherche selon le type de média ; lève si la source ne gère pas la vidéo. */
function searchMedia(
  id: SourceId,
  keyword: string,
  count: number,
  apiKey: string,
  mediaType: MediaType
): Promise<MediaHit[]> {
  const source = sources[id]
  if (mediaType === 'video') {
    if (!source.searchVideos) {
      throw new SourceException({ type: 'api', message: 'Source vidéo non supportée.' })
    }
    return source.searchVideos(keyword, count, apiKey)
  }
  return source.search(keyword, count, apiKey)
}

/** Pipeline d'une source : recherche → téléchargements → `SourceResult`. Ne lève jamais. */
async function runSource(
  id: SourceId,
  keyword: string,
  count: number,
  apiKey: string,
  dir: string,
  mediaType: MediaType,
  onProgress: (p: ProgressEvent) => void
): Promise<SourceResult> {
  try {
    onProgress({ source: id, phase: 'searching', done: 0, total: count })
    const hits = await searchMedia(id, keyword, count, apiKey, mediaType)
    const total = hits.length
    if (total === 0) {
      onProgress({ source: id, phase: 'done', done: 0, total: 0 })
      return { source: id, downloaded: 0, requested: count }
    }

    let done = 0
    let downloaded = 0
    const concurrency = mediaType === 'video' ? VIDEO_CONCURRENCY : CONCURRENCY
    onProgress({ source: id, phase: 'downloading', done, total })
    try {
      await runPool(total, concurrency, async (idx) => {
        const outcome = await downloadOne(hits[idx], id, dir, mediaType)
        if (outcome !== 'failed') downloaded++
        done++
        onProgress({ source: id, phase: 'downloading', done, total })
      })
    } catch (e) {
      // Erreur disque → on arrête la source mais on rend ce qui a été fait.
      onProgress({ source: id, phase: 'error', done, total })
      return { source: id, downloaded, requested: count, error: toSourceError(e) }
    }

    onProgress({ source: id, phase: 'done', done, total })
    return { source: id, downloaded, requested: count }
  } catch (e) {
    // Erreur de recherche (clé invalide, rate limit, réseau…).
    onProgress({ source: id, phase: 'error', done: 0, total: count })
    return { source: id, downloaded: 0, requested: count, error: toSourceError(e) }
  }
}

/**
 * Télécharge les images des sources activées dans `${destFolder}/${subFolder}/`.
 * `onProgress` reçoit un `ProgressEvent` à chaque étape (branché sur l'IPC en Phase 5).
 */
export async function download(
  req: DownloadRequest,
  onProgress: (p: ProgressEvent) => void = () => {}
): Promise<DownloadSummary> {
  const dir = join(req.destFolder, req.subFolder)
  await mkdir(dir, { recursive: true })

  const keys = await getApiKeys()
  const enabledIds = (Object.keys(req.sources) as SourceId[]).filter(
    (id) =>
      req.sources[id].enabled &&
      req.sources[id].count > 0 &&
      // Double sécurité : en vidéo, ignorer les sources sans API vidéo.
      (req.mediaType !== 'video' || supportsVideo(id))
  )

  const settled = await Promise.allSettled(
    enabledIds.map((id) =>
      runSource(
        id,
        req.keyword,
        req.sources[id].count,
        keyFor(id, keys),
        dir,
        req.mediaType,
        onProgress
      )
    )
  )

  const results: SourceResult[] = settled.map((s, i) =>
    s.status === 'fulfilled'
      ? s.value
      : {
          source: enabledIds[i],
          downloaded: 0,
          requested: req.sources[enabledIds[i]].count,
          error: toSourceError(s.reason)
        }
  )

  return { subFolderAbsolutePath: dir, results }
}
