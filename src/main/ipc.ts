import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { getConfig, setConfig } from './config'
import { download } from './downloader'
import type { Config, DownloadRequest, DownloadSummary, ProgressEvent } from '../shared/types'

/** Canal IPC main → renderer pour la progression d'un téléchargement. */
export const PROGRESS_CHANNEL = 'download-progress'

/**
 * Enregistrement central des handlers IPC (DEV_PLAN §5.2).
 * Config (Phase 2) + `select-folder` / `download` / `open-folder` (Phase 5).
 */
export function registerIpcHandlers(): void {
  ipcMain.handle('get-config', () => getConfig())
  ipcMain.handle('set-config', (_event, partial: Partial<Config>) => setConfig(partial))

  // Dialog natif de sélection de dossier → chemin absolu ou null si annulé.
  ipcMain.handle('select-folder', async (event): Promise<string | null> => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options = { properties: ['openDirectory' as const] }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Téléchargement : la progression est relayée au renderer via `event.sender`
  // (le callback `onProgress` du downloader ne peut pas traverser l'IPC).
  ipcMain.handle('download', (event, req: DownloadRequest): Promise<DownloadSummary> => {
    const onProgress = (p: ProgressEvent): void => {
      if (!event.sender.isDestroyed()) event.sender.send(PROGRESS_CHANNEL, p)
    }
    return download(req, onProgress)
  })

  // Ouvre le dossier dans l'Explorateur (shell.openPath).
  ipcMain.handle('open-folder', (_event, absolutePath: string) => shell.openPath(absolutePath))
}
