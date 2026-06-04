import type { SourceId } from '../../shared/types'
import type { ImageSource } from './types'
import { unsplash } from './unsplash'
import { pexels } from './pexels'
import { pixabay } from './pixabay'
import { openverse } from './openverse'

/** Registre des 4 sources, indexé par `SourceId` (consommé par le downloader). */
export const sources: Record<SourceId, ImageSource> = {
  unsplash,
  pexels,
  pixabay,
  openverse
}

export type { ImageHit, ImageSource } from './types'
export { SourceException } from './types'
