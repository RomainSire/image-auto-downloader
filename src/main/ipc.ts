import { ipcMain } from 'electron'
import { getConfig, setConfig } from './config'
import type { Config } from '../shared/types'

/**
 * Enregistrement central des handlers IPC.
 * Phase 2 : config uniquement. `select-folder` / `download` / `open-folder`
 * arrivent en Phase 5.
 */
export function registerIpcHandlers(): void {
  ipcMain.handle('get-config', () => getConfig())
  ipcMain.handle('set-config', (_event, partial: Partial<Config>) => setConfig(partial))
}
