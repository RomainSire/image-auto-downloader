function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    showVersions()
    checkApi()
  })
}

function showVersions(): void {
  const versions = window.electron.process.versions
  replaceText('.electron-version', `Electron v${versions.electron}`)
  replaceText('.chrome-version', `Chromium v${versions.chrome}`)
  replaceText('.node-version', `Node v${versions.node}`)
}

// Phase 1 : prouve que `window.api` est exposé et que l'IPC répond.
async function checkApi(): Promise<void> {
  const status = document.getElementById('apiStatus')
  if (!status) return

  if (!window.api || typeof window.api.ping !== 'function') {
    status.textContent = '✗ window.api indisponible'
    status.classList.add('status-error')
    return
  }

  try {
    const reply = await window.api.ping()
    status.textContent = `✓ window.api prêt (ping → ${reply})`
    status.classList.add('status-ok')
  } catch (error) {
    status.textContent = `✗ Erreur IPC : ${String(error)}`
    status.classList.add('status-error')
  }
}

function replaceText(selector: string, text: string): void {
  const element = document.querySelector<HTMLElement>(selector)
  if (element) {
    element.innerText = text
  }
}

init()
