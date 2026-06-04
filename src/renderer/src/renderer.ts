import type {
  ApiKeyId,
  Config,
  DownloadRequest,
  ProgressEvent,
  SourceError,
  SourceId,
  SourceResult
} from '../../shared/types'

/** Les 3 sources nécessitant une clé (Openverse est anonyme). */
const API_KEY_IDS: ApiKeyId[] = ['unsplash', 'pexels', 'pixabay']

/** Les 4 sources, dans l'ordre d'affichage. */
const SOURCE_IDS: SourceId[] = ['unsplash', 'pexels', 'pixabay', 'openverse']

/** L'utilisateur a-t-il édité le sous-dossier à la main ? (stoppe l'auto-remplissage) */
let subFolderEdited = false

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    showVersions()
    wireSettings()
    wireDownload()
    void loadConfig()
  })
}

function showVersions(): void {
  const versions = window.electron.process.versions
  replaceText('.electron-version', `Electron v${versions.electron}`)
  replaceText('.chrome-version', `Chromium v${versions.chrome}`)
  replaceText('.node-version', `Node v${versions.node}`)
}

/** Charge la config, remplit les champs, ouvre Réglages si une clé manque. */
async function loadConfig(): Promise<void> {
  const status = document.getElementById('apiStatus')
  try {
    const config = await window.api.getConfig()
    fillSettings(config)
    // Pré-remplit le dossier de destination du formulaire principal.
    input('destFolder').value = config.lastDestination

    const missing = API_KEY_IDS.filter((id) => !config.apiKeys[id].trim())
    if (status) {
      if (missing.length) {
        status.textContent = `⚠ ${missing.length} clé(s) API manquante(s) : ${missing.join(', ')}`
        status.className = 'status status-error'
      } else {
        status.textContent = '✓ Toutes les clés API sont configurées'
        status.className = 'status status-ok'
      }
    }

    // 1er lancement / clés manquantes → ouvrir le panneau Réglages.
    if (missing.length) openSettings(missing)
  } catch (error) {
    if (status) {
      status.textContent = `✗ Impossible de lire la config : ${String(error)}`
      status.className = 'status status-error'
    }
  }
}

// ---- Panneau Réglages ----

function wireSettings(): void {
  byId('openSettings')?.addEventListener('click', () => openSettings())
  byId('closeSettings')?.addEventListener('click', closeSettings)

  const overlay = byId('settings')
  overlay?.addEventListener('click', (e) => {
    // Clic sur le fond (hors panneau) → fermer.
    if (e.target === overlay) closeSettings()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && !overlay.hidden) closeSettings()
  })

  byId('settingsForm')?.addEventListener('submit', (e) => {
    e.preventDefault()
    void saveSettings()
  })
}

function fillSettings(config: Config): void {
  for (const id of API_KEY_IDS) {
    input(`key-${id}`).value = config.apiKeys[id]
  }
  input('dest').value = config.lastDestination
}

function openSettings(missing?: ApiKeyId[]): void {
  const hint = byId('settingsHint')
  if (hint) {
    if (missing && missing.length) {
      hint.textContent = `Renseignez les clés manquantes (${missing.join(', ')}) pour commencer.`
      hint.hidden = false
    } else {
      hint.hidden = true
    }
  }
  setStatus('')
  const overlay = byId('settings')
  if (overlay) overlay.hidden = false
}

function closeSettings(): void {
  const overlay = byId('settings')
  if (overlay) overlay.hidden = true
}

async function saveSettings(): Promise<void> {
  const partial: Partial<Config> = {
    apiKeys: {
      unsplash: input('key-unsplash').value.trim(),
      pexels: input('key-pexels').value.trim(),
      pixabay: input('key-pixabay').value.trim()
    },
    lastDestination: input('dest').value.trim()
  }

  setStatus('Enregistrement…')
  try {
    await window.api.setConfig(partial)
    setStatus('✓ Enregistré', 'ok')
    // Met à jour le bandeau d'état de la page principale.
    void refreshMainStatus()
  } catch (error) {
    setStatus(`✗ Échec : ${String(error)}`, 'error')
  }
}

/** Recharge juste le bandeau d'état (sans rouvrir le panneau). */
async function refreshMainStatus(): Promise<void> {
  const status = document.getElementById('apiStatus')
  if (!status) return
  const config = await window.api.getConfig()
  const missing = API_KEY_IDS.filter((id) => !config.apiKeys[id].trim())
  if (missing.length) {
    status.textContent = `⚠ ${missing.length} clé(s) API manquante(s) : ${missing.join(', ')}`
    status.className = 'status status-error'
  } else {
    status.textContent = '✓ Toutes les clés API sont configurées'
    status.className = 'status status-ok'
  }
}

// ---- Téléchargement ----

function wireDownload(): void {
  // Auto-remplissage du sous-dossier (YYYY-MM-DD-{slug}) tant que l'utilisateur
  // ne l'a pas édité manuellement.
  input('keyword').addEventListener('input', () => {
    if (!subFolderEdited) input('subFolder').value = defaultSubFolder(input('keyword').value)
  })
  input('subFolder').addEventListener('input', () => {
    subFolderEdited = true
  })

  byId('downloadBtn')?.addEventListener('click', () => void handleDownload())
}

/** Sous-dossier proposé : `YYYY-MM-DD-{slug(keyword)}` (vide si pas de mot-clé). */
function defaultSubFolder(keyword: string): string {
  const slug = slugify(keyword)
  return slug ? `${today()}-${slug}` : ''
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function today(): string {
  const d = new Date()
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function handleDownload(): Promise<void> {
  const keyword = input('keyword').value.trim()
  const destFolder = input('destFolder').value.trim()

  // Le sous-dossier peut être resté vide (pas encore d'auto-remplissage).
  let subFolder = input('subFolder').value.trim()
  if (!subFolder) {
    subFolder = defaultSubFolder(keyword)
    input('subFolder').value = subFolder
  }

  // Validation légère (la validation complète arrive en Phase 10).
  if (!keyword) return setDownloadStatus('✗ Saisissez un mot-clé.', 'error')
  if (!destFolder) return setDownloadStatus('✗ Indiquez un dossier de destination.', 'error')

  const sources = readSources()
  const active = SOURCE_IDS.filter((id) => sources[id].enabled && sources[id].count > 0)
  if (active.length === 0) {
    return setDownloadStatus('✗ Activez au moins une source (nombre ≥ 1).', 'error')
  }

  const req: DownloadRequest = { keyword, destFolder, subFolder, sources }

  // Réinitialise l'affichage des blocs et verrouille le bouton.
  resetSourceDisplays(active)
  const btn = byId('downloadBtn') as HTMLButtonElement | null
  if (btn) btn.disabled = true
  setDownloadStatus('Téléchargement en cours…')

  // Mémorise la destination pour le prochain lancement (best effort).
  void window.api.setConfig({ lastDestination: destFolder })

  const unsubscribe = window.api.onProgress(renderProgress)
  try {
    const summary = await window.api.download(req)
    renderSummary(summary.results)
    const total = summary.results.reduce((n, r) => n + r.downloaded, 0)
    const failed = summary.results.filter((r) => r.error)
    if (failed.length) {
      setDownloadStatus(
        `${total} image(s) téléchargée(s) — ${failed.length} source(s) en erreur.`,
        'error'
      )
    } else {
      setDownloadStatus(
        `✓ ${total} image(s) téléchargée(s) dans ${summary.subFolderAbsolutePath}`,
        'ok'
      )
    }
  } catch (error) {
    setDownloadStatus(`✗ Échec du téléchargement : ${String(error)}`, 'error')
  } finally {
    unsubscribe()
    if (btn) btn.disabled = false
  }
}

/** Lit l'état (activé + nombre) des 4 blocs sources. */
function readSources(): DownloadRequest['sources'] {
  const out = {} as DownloadRequest['sources']
  for (const id of SOURCE_IDS) {
    const block = sourceBlock(id)
    const enabled = block.querySelector<HTMLInputElement>('.source-enabled')?.checked ?? false
    const raw = block.querySelector<HTMLInputElement>('.source-count')?.value ?? '0'
    const count = Math.max(0, Math.trunc(Number(raw) || 0))
    out[id] = { enabled, count }
  }
  return out
}

/** Remet les blocs à zéro : `0/count` pour les sources actives, `—` sinon. */
function resetSourceDisplays(active: SourceId[]): void {
  for (const id of SOURCE_IDS) {
    const block = sourceBlock(id)
    const progress = block.querySelector<HTMLElement>('.source-progress')
    const error = block.querySelector<HTMLElement>('.source-error')
    if (error) {
      error.hidden = true
      error.textContent = ''
    }
    if (progress) {
      if (active.includes(id)) {
        const count = block.querySelector<HTMLInputElement>('.source-count')?.value ?? '0'
        progress.textContent = `0/${count}`
        progress.dataset.state = 'pending'
      } else {
        progress.textContent = '—'
        progress.dataset.state = 'idle'
      }
    }
  }
}

/** Met à jour le bloc d'une source à la réception d'un `ProgressEvent`. */
function renderProgress(p: ProgressEvent): void {
  const block = sourceBlock(p.source)
  const progress = block.querySelector<HTMLElement>('.source-progress')
  if (!progress) return
  switch (p.phase) {
    case 'searching':
      progress.textContent = 'Recherche…'
      progress.dataset.state = 'pending'
      break
    case 'downloading':
      progress.textContent = `${p.done}/${p.total}`
      progress.dataset.state = 'downloading'
      break
    case 'done':
      progress.textContent = `${p.done}/${p.total} ✓`
      progress.dataset.state = 'done'
      break
    case 'error':
      progress.textContent = `${p.done}/${p.total}`
      progress.dataset.state = 'error'
      break
  }
}

/** Affiche le bilan final par source (compteurs + erreurs éventuelles). */
function renderSummary(results: SourceResult[]): void {
  for (const r of results) {
    const block = sourceBlock(r.source)
    const progress = block.querySelector<HTMLElement>('.source-progress')
    const error = block.querySelector<HTMLElement>('.source-error')
    if (progress) {
      progress.textContent = `${r.downloaded}/${r.requested}${r.error ? '' : ' ✓'}`
      progress.dataset.state = r.error ? 'error' : 'done'
    }
    if (error && r.error) {
      error.textContent = errorLabel(r.error)
      error.hidden = false
    }
  }
}

function errorLabel(e: SourceError): string {
  const prefix =
    e.type === 'rate_limit' ? 'Limite atteinte' : e.type === 'fs' ? 'Erreur disque' : 'Erreur API'
  return `${prefix} — ${e.message}`
}

function setDownloadStatus(text: string, kind?: 'ok' | 'error'): void {
  const el = byId('downloadStatus')
  if (!el) return
  el.textContent = text
  el.className = 'download-status' + (kind ? ` download-status-${kind}` : '')
}

function sourceBlock(id: SourceId): HTMLElement {
  const el = document.querySelector<HTMLElement>(`.source-block[data-source="${id}"]`)
  if (!el) throw new Error(`Bloc source introuvable : ${id}`)
  return el
}

// ---- Helpers DOM ----

function setStatus(text: string, kind?: 'ok' | 'error'): void {
  const el = byId('settingsStatus')
  if (!el) return
  el.textContent = text
  el.className = 'settings-status' + (kind ? ` settings-status-${kind}` : '')
}

function byId(id: string): HTMLElement | null {
  return document.getElementById(id)
}

function input(id: string): HTMLInputElement {
  const el = document.getElementById(id)
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`Champ introuvable : #${id}`)
  }
  return el
}

function replaceText(selector: string, text: string): void {
  const element = document.querySelector<HTMLElement>(selector)
  if (element) element.innerText = text
}

init()
