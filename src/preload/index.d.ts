import { ElectronAPI } from '@electron-toolkit/preload'

/**
 * API exposée au renderer via contextBridge (`window.api`).
 * Phase 1 : squelette. Étendue dans les phases suivantes avec
 * selectFolder / getConfig / setConfig / download / onProgress / openFolder.
 */
export interface Api {
  ping: () => Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
