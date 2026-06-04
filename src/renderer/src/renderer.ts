import type { ApiKeyId, Config } from '../../shared/types'

/** Les 3 sources nécessitant une clé (Openverse est anonyme). */
const API_KEY_IDS: ApiKeyId[] = ['unsplash', 'pexels', 'pixabay']

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    showVersions()
    wireSettings()
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
