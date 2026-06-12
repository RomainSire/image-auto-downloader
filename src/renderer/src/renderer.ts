import type {
  ApiKeyId,
  Config,
  DownloadRequest,
  Lang,
  ProgressEvent,
  SourceError,
  SourceId,
  SourceResult
} from '../../shared/types'
import { applyTranslations, getLanguage, initLanguage, setLanguage, t } from './i18n'

/** Les 3 sources nécessitant une clé (Openverse est anonyme). */
const API_KEY_IDS: ApiKeyId[] = ['unsplash', 'pexels', 'pixabay']

/** Les 4 sources, dans l'ordre d'affichage. */
const SOURCE_IDS: SourceId[] = ['unsplash', 'pexels', 'pixabay', 'openverse']

/** L'utilisateur a-t-il édité le sous-dossier à la main ? (stoppe l'auto-remplissage) */
let subFolderEdited = false

/** Chemin du dernier sous-dossier téléchargé avec succès (bouton « Ouvrir le dossier »). */
let lastDownloadPath: string | null = null

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    showVersions()
    wireSettings()
    wireDownload()
    wireLanguage()
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
    // Langue : appliquer AVANT le 1er rendu visible (DEV_PLAN §5.5).
    initLanguage(config.language)
    applyTranslations()
    updateLangButtons()

    fillSettings(config)
    // Pré-remplit le dossier de destination du formulaire principal.
    input('destFolder').value = config.lastDestination

    const missing = API_KEY_IDS.filter((id) => !config.apiKeys[id].trim())
    setMainStatus(missing)

    // 1er lancement / clés manquantes → ouvrir le panneau Réglages.
    if (missing.length) openSettings(missing)
  } catch (error) {
    if (status) {
      status.textContent = t('status.configError', { error: String(error) })
      status.className = 'status status-error'
    }
  }
}

/**
 * Bandeau d'état des clés API : affiché **uniquement** s'il manque des clés.
 * Quand tout est configuré, le bandeau est masqué (pas de message « tout OK »).
 */
function setMainStatus(missing: ApiKeyId[]): void {
  const status = document.getElementById('apiStatus')
  if (!status) return
  if (missing.length) {
    status.textContent = t('status.missingKeys', { n: missing.length, keys: missing.join(', ') })
    status.className = 'status status-error'
    status.hidden = false
  } else {
    status.textContent = ''
    status.hidden = true
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
}

function openSettings(missing?: ApiKeyId[]): void {
  const hint = byId('settingsHint')
  if (hint) {
    if (missing && missing.length) {
      hint.textContent = t('settings.hintMissing', { keys: missing.join(', ') })
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
    }
  }

  setStatus(t('settings.saving'))
  try {
    await window.api.setConfig(partial)
    setStatus(t('settings.saved'), 'ok')
    // Met à jour le bandeau d'état de la page principale.
    void refreshMainStatus()
  } catch (error) {
    setStatus(t('settings.saveError', { error: String(error) }), 'error')
  }
}

/** Recharge juste le bandeau d'état (sans rouvrir le panneau). */
async function refreshMainStatus(): Promise<void> {
  const config = await window.api.getConfig()
  setMainStatus(API_KEY_IDS.filter((id) => !config.apiKeys[id].trim()))
}

// ---- Sélecteur de langue ----

function wireLanguage(): void {
  byId('langGroup')
    ?.querySelectorAll<HTMLButtonElement>('.lang-btn')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang as Lang | undefined
        if (lang) void changeLanguage(lang)
      })
    })
}

/** Bascule la langue : applique au DOM, persiste, et rafraîchit les états dynamiques. */
async function changeLanguage(lang: Lang): Promise<void> {
  await setLanguage(lang)
  updateLangButtons()
  // Les chaînes dynamiques déjà affichées (bandeau d'état) sont régénérées.
  void refreshMainStatus()
}

/** Surligne le bouton de langue actif. */
function updateLangButtons(): void {
  const current = getLanguage()
  byId('langGroup')
    ?.querySelectorAll<HTMLButtonElement>('.lang-btn')
    .forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.lang === current)
    })
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
  byId('browseDest')?.addEventListener('click', () => void handleBrowse())
  byId('openFolderBtn')?.addEventListener('click', () => void handleOpenFolder())
}

/** Picker natif : remplit le champ destination (ignoré si l'utilisateur annule). */
async function handleBrowse(): Promise<void> {
  const folder = await window.api.selectFolder()
  if (folder) input('destFolder').value = folder
}

/** Ouvre dans l'Explorateur le sous-dossier du dernier téléchargement réussi. */
async function handleOpenFolder(): Promise<void> {
  if (!lastDownloadPath) return
  const error = await window.api.openFolder(lastDownloadPath)
  // shell.openPath renvoie une chaîne non vide en cas d'échec.
  if (error) setDownloadStatus(t('download.openFolderError', { error }), 'error')
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

  // Validation des entrées (DEV_PLAN Phase 10).
  if (!keyword) return setDownloadStatus(t('download.errNoKeyword'), 'error')
  if (!destFolder) return setDownloadStatus(t('download.errNoDest'), 'error')

  const sources = readSources()
  const active = SOURCE_IDS.filter((id) => sources[id].enabled && sources[id].count > 0)
  if (active.length === 0) {
    return setDownloadStatus(t('download.errNoSource'), 'error')
  }

  // Le dossier de destination doit exister (le sous-dossier, lui, est créé).
  if (!(await window.api.folderExists(destFolder))) {
    return setDownloadStatus(t('download.errDestMissing', { path: destFolder }), 'error')
  }

  const req: DownloadRequest = { keyword, destFolder, subFolder, sources }

  // Réinitialise l'affichage des blocs et verrouille le bouton.
  resetSourceDisplays(active)
  const btn = byId('downloadBtn') as HTMLButtonElement | null
  if (btn) btn.disabled = true
  // Le chemin précédent n'est plus pertinent tant que ce job n'a rien produit.
  setOpenFolderEnabled(false)
  setDownloadStatus(t('download.inProgress'))

  // Mémorise la destination pour le prochain lancement (best effort).
  void window.api.setConfig({ lastDestination: destFolder })

  const unsubscribe = window.api.onProgress(renderProgress)
  try {
    const summary = await window.api.download(req)
    renderSummary(summary.results)
    const total = summary.results.reduce((n, r) => n + r.downloaded, 0)
    const failed = summary.results.filter((r) => r.error)
    // Active « Ouvrir le dossier » dès qu'au moins une image a été écrite.
    if (total > 0) {
      lastDownloadPath = summary.subFolderAbsolutePath
      setOpenFolderEnabled(true)
    }
    if (failed.length) {
      setDownloadStatus(t('download.doneWithErrors', { total, failed: failed.length }), 'error')
    } else if (total === 0) {
      // Aucune erreur mais aucune image : recherche sans résultat.
      setDownloadStatus(t('download.empty'))
    } else {
      setDownloadStatus(t('download.doneOk', { total, path: summary.subFolderAbsolutePath }), 'ok')
    }
  } catch (error) {
    setDownloadStatus(t('download.failed', { error: String(error) }), 'error')
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
      delete error.dataset.state
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
      progress.textContent = t('progress.searching')
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
    // 0 résultat sans erreur = état « vide » (ni succès vert, ni erreur rouge).
    const empty = !r.error && r.downloaded === 0
    if (progress) {
      progress.textContent = `${r.downloaded}/${r.requested}${r.error || empty ? '' : ' ✓'}`
      progress.dataset.state = r.error ? 'error' : empty ? 'empty' : 'done'
    }
    if (error) {
      if (r.error) {
        error.textContent = errorLabel(r.error)
        error.dataset.state = 'error'
        error.hidden = false
      } else if (empty) {
        error.textContent = t('source.empty')
        error.dataset.state = 'empty'
        error.hidden = false
      }
    }
  }
}

function errorLabel(e: SourceError): string {
  return `${t(`error.${e.type}`)} — ${e.message}`
}

function setOpenFolderEnabled(enabled: boolean): void {
  const btn = byId('openFolderBtn') as HTMLButtonElement | null
  if (btn) btn.disabled = !enabled
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
