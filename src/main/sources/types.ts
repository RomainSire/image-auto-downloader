import type { SourceError, SourceId } from '../../shared/types'

/**
 * Contrats internes au process main pour les 4 sources d'images.
 *
 * Note (écart assumé vs DEV_PLAN §5.3) : `search()` renvoie des `ImageHit`
 * `{ id, url }` plutôt que de simples URLs. L'`id` natif de chaque source est
 * stable et sert directement au nommage `<source>_<id>.ext` (§5.4) et à
 * l'idempotence « skip si déjà présent » (§7) — bien plus fiable que de
 * ré-extraire un id depuis l'URL. C'est purement interne à main/ (le renderer
 * ne voit jamais ces objets, il passe par le contrat `download`).
 */
export interface ImageHit {
  /** Identifiant natif de la source (stable). */
  id: string
  /** URL téléchargeable directe, taille large/full. */
  url: string
}

export interface ImageSource {
  id: SourceId
  /**
   * Renvoie jusqu'à `count` images pour `keyword`, en paginant si besoin.
   * `apiKey` est ignoré par les sources anonymes (Openverse → chaîne vide).
   * En cas d'échec, lève une `SourceException` (mappée en `SourceError`).
   */
  search(keyword: string, count: number, apiKey: string): Promise<ImageHit[]>
}

/** Erreur typée levée par une source ; portée par `Promise.allSettled` côté downloader. */
export class SourceException extends Error {
  constructor(readonly error: SourceError) {
    super(error.message)
    this.name = 'SourceException'
  }
}
