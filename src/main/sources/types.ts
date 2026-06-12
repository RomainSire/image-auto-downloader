import type { SourceError, SourceId } from '../../shared/types'

/**
 * Contrats internes au process main pour les sources de médias (photos & vidéos).
 *
 * Note (écart assumé vs DEV_PLAN §5.3) : `search()` renvoie des `MediaHit`
 * `{ id, url }` plutôt que de simples URLs. L'`id` natif de chaque source est
 * stable et sert directement au nommage `<source>_<id>.ext` (§5.4) et à
 * l'idempotence « skip si déjà présent » (§7) — bien plus fiable que de
 * ré-extraire un id depuis l'URL. C'est purement interne à main/ (le renderer
 * ne voit jamais ces objets, il passe par le contrat `download`).
 */
export interface MediaHit {
  /** Identifiant natif de la source (stable). */
  id: string
  /** URL téléchargeable directe (photo taille large/full, ou fichier vidéo). */
  url: string
}

/** Alias rétrocompatible : le shape vaut pour photo et vidéo. */
export type ImageHit = MediaHit

export interface MediaSource {
  id: SourceId
  /**
   * Renvoie jusqu'à `count` photos pour `keyword`, en paginant si besoin.
   * `apiKey` est ignoré par les sources anonymes (Openverse → chaîne vide).
   * En cas d'échec, lève une `SourceException` (mappée en `SourceError`).
   */
  search(keyword: string, count: number, apiKey: string): Promise<MediaHit[]>
  /**
   * Idem pour les **vidéos** — présent uniquement sur les sources à API vidéo
   * (Pexels, Pixabay). Absent sur Unsplash/Openverse (grisées en mode vidéo).
   */
  searchVideos?(keyword: string, count: number, apiKey: string): Promise<MediaHit[]>
}

/** Alias rétrocompatible vers l'ancien nom. */
export type ImageSource = MediaSource

/** Erreur typée levée par une source ; portée par `Promise.allSettled` côté downloader. */
export class SourceException extends Error {
  constructor(readonly error: SourceError) {
    super(error.message)
    this.name = 'SourceException'
  }
}
