import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// API sûre exposée au renderer (Phase 1 : squelette). Le type est déclaré
// dans index.d.ts (`window.api: Api`). Les méthodes réelles (selectFolder,
// getConfig, setConfig, download, onProgress, openFolder) arrivent aux phases 2/5.
const api = {
  ping: (): Promise<string> => ipcRenderer.invoke('ping')
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
