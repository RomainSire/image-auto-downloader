import { ElectronAPI } from '@electron-toolkit/preload'
import type { Config } from '../shared/types'

/**
 * API exposée au renderer via contextBridge (`window.api`).
 * Phase 2 : config. Étendue dans les phases suivantes avec
 * selectFolder / download / onProgress / openFolder.
 */
export interface Api {
  getConfig: () => Promise<Config>
  setConfig: (partial: Partial<Config>) => Promise<Config>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
