import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Config } from '../shared/types'

// API sûre exposée au renderer (`window.api`). Le type est déclaré dans
// index.d.ts. Phase 2 : config. selectFolder / download / onProgress /
// openFolder arrivent aux phases 5/8.
const api = {
  getConfig: (): Promise<Config> => ipcRenderer.invoke('get-config'),
  setConfig: (partial: Partial<Config>): Promise<Config> =>
    ipcRenderer.invoke('set-config', partial)
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
