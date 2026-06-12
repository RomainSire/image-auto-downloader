import { SourceException, type ImageHit } from './types'

/**
 * Helpers réseau partagés par les 4 sources : appel JSON avec mapping d'erreurs
 * vers `SourceError`, et pagination générique jusqu'à `count`.
 */

const USER_AGENT = 'b-roll-downloader/1.1 (+https://github.com/RomainSire/b-roll-downloader)'

/** Délai max d'une requête de recherche (ms) avant abandon. */
const SEARCH_TIMEOUT_MS = 15_000

/**
 * GET JSON avec mapping d'erreurs HTTP → `SourceException`.
 * `rateLimitStatuses` : statuts à considérer comme `rate_limit` pour cette
 * source (toujours 429 ; Unsplash ajoute 403).
 */
export async function fetchJson<T>(
  url: string,
  headers: Record<string, string> = {},
  rateLimitStatuses: number[] = [429]
): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, ...headers },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS)
    })
  } catch (e) {
    const message =
      (e as Error)?.name === 'TimeoutError'
        ? `Délai dépassé (${SEARCH_TIMEOUT_MS / 1000} s).`
        : `Réseau : ${(e as Error).message}`
    throw new SourceException({ type: 'api', message })
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (rateLimitStatuses.includes(res.status)) {
      throw new SourceException({
        type: 'rate_limit',
        message: `Quota atteint (HTTP ${res.status}).`
      })
    }
    const snippet = body ? ` — ${body.slice(0, 200)}` : ''
    throw new SourceException({ type: 'api', message: `HTTP ${res.status}${snippet}` })
  }

  try {
    return (await res.json()) as T
  } catch {
    throw new SourceException({ type: 'api', message: 'Réponse non-JSON inattendue.' })
  }
}

/**
 * Pagine jusqu'à obtenir `count` images (ou épuisement des résultats).
 * `fetchPage(perPage, page)` renvoie les hits de la page + `hasMore` (calculé à
 * partir du total/`page_count` de l'API → évite de demander une page hors plage).
 * Dédoublonne par `id`, tronque à `count`.
 */
export async function paginate(
  count: number,
  perPageMax: number,
  fetchPage: (perPage: number, page: number) => Promise<{ hits: ImageHit[]; hasMore: boolean }>
): Promise<ImageHit[]> {
  const out: ImageHit[] = []
  const seen = new Set<string>()
  let page = 1

  while (out.length < count) {
    const perPage = Math.min(perPageMax, count - out.length)
    const { hits, hasMore } = await fetchPage(perPage, page)
    for (const h of hits) {
      if (!seen.has(h.id)) {
        seen.add(h.id)
        out.push(h)
      }
    }
    if (!hasMore || hits.length === 0) break
    page++
    if (page > 100) break // garde-fou anti-boucle
  }

  return out.slice(0, count)
}

/** Garde-fou : refuse une recherche sans clé pour les sources qui en exigent une. */
export function requireKey(apiKey: string): void {
  if (!apiKey.trim()) {
    throw new SourceException({ type: 'api', message: 'Clé API manquante.' })
  }
}
