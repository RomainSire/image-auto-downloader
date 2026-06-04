import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Config, DownloadRequest, DownloadSummary, ProgressEvent } from '../shared/types'

const PROGRESS_CHANNEL = 'download-progress'

// API sûre exposée au renderer (`window.api`). Le type est déclaré dans
// index.d.ts. Config (Phase 2) + selectFolder / download / onProgress /
// openFolder (Phase 5).
const api = {
  getConfig: (): Promise<Config> => ipcRenderer.invoke('get-config'),
  setConfig: (partial: Partial<Config>): Promise<Config> =>
    ipcRenderer.invoke('set-config', partial),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),
  download: (req: DownloadRequest): Promise<DownloadSummary> => ipcRenderer.invoke('download', req),
  openFolder: (absolutePath: string): Promise<string> =>
    ipcRenderer.invoke('open-folder', absolutePath),
  // S'abonne aux events de progression ; renvoie une fonction de désabonnement.
  onProgress: (cb: (p: ProgressEvent) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, p: ProgressEvent): void => cb(p)
    ipcRenderer.on(PROGRESS_CHANNEL, listener)
    return () => ipcRenderer.removeListener(PROGRESS_CHANNEL, listener)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
