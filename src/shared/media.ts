/**
 * Capacité vidéo des sources — source de vérité unique partagée main ⇄ renderer.
 *
 * Contrairement à `types.ts` (type-only), ce module exporte une **valeur runtime**
 * (la liste des sources à API vidéo). Il reste néanmoins **pur** : aucun import
 * `node:*` / `electron` → importable sans risque par le renderer (web) comme par
 * le process main.
 *
 * - Le renderer s'en sert pour **griser** les sources sans vidéo (Unsplash)
 *   quand le switch est sur « Vidéos ».
 * - Le downloader s'en sert comme **double sécurité** (filtre les sources non
 *   capables avant de lancer une recherche vidéo).
 */

import type { SourceId } from './types'

/** Sources disposant d'une API vidéo. Les autres n'apparaissent qu'en mode photo. */
export const VIDEO_CAPABLE_SOURCES: readonly SourceId[] = ['pexels', 'pixabay']

/** Une source peut-elle fournir des vidéos ? */
export function supportsVideo(id: SourceId): boolean {
  return VIDEO_CAPABLE_SOURCES.includes(id)
}
