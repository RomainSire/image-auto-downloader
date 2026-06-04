import { ElectronAPI } from '@electron-toolkit/preload'
import type { Config, DownloadRequest, DownloadSummary, ProgressEvent } from '../shared/types'

/**
 * API exposée au renderer via contextBridge (`window.api`).
 * Config (Phase 2) + selectFolder / download / onProgress / openFolder (Phase 5).
 */
export interface Api {
  getConfig: () => Promise<Config>
  setConfig: (partial: Partial<Config>) => Promise<Config>
  /** Dialog natif openDirectory → chemin absolu, ou null si annulé. */
  selectFolder: () => Promise<string | null>
  download: (req: DownloadRequest) => Promise<DownloadSummary>
  openFolder: (absolutePath: string) => Promise<string>
  /** Vrai si le chemin existe et est un dossier (validation destination). */
  folderExists: (absolutePath: string) => Promise<boolean>
  /** S'abonne à la progression ; renvoie une fonction de désabonnement. */
  onProgress: (cb: (p: ProgressEvent) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
