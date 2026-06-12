import type { SourceId } from '../../shared/types'
import type { MediaSource } from './types'
import { unsplash } from './unsplash'
import { pexels } from './pexels'
import { pixabay } from './pixabay'

/** Registre des sources, indexé par `SourceId` (consommé par le downloader). */
export const sources: Record<SourceId, MediaSource> = {
  unsplash,
  pexels,
  pixabay
}

export type { ImageHit, ImageSource } from './types'
export { SourceException } from './types'
