/**
 * Types partagés entre main, preload et renderer.
 *
 * ⚠️ Ce module ne doit contenir AUCUN import runtime (pas d'`electron`,
 * pas de `node:*`) : il est importé dans les trois process, y compris le
 * renderer (web). On n'y met que des `type`/`interface`.
 */

export type Lang = 'en' | 'fr' | 'ja'

/** Sources, chacune nécessitant une clé API. */
export interface ApiKeys {
  unsplash: string
  pexels: string
  pixabay: string
}

/** Identifiant de clé API → libellé humain pour les champs Réglages. */
export type ApiKeyId = keyof ApiKeys

/** Contenu de `userData/config.json` (cf. DEV_PLAN §5.1). */
export interface Config {
  apiKeys: ApiKeys
  /** Pré-remplit le champ destination au lancement (ex. "D:\\BRoll"). */
  lastDestination: string
  /** "en" | "fr" | "ja" — défaut "en". */
  language: Lang
}

// ---------------------------------------------------------------------------
// Contrats de téléchargement (DEV_PLAN §5.3), partagés main ⇄ preload ⇄ renderer.
// ---------------------------------------------------------------------------

/** Les sources d'images/vidéos. */
export type SourceId = 'unsplash' | 'pexels' | 'pixabay'

/** Type de média téléchargé. Le switch de l'UI bascule entre les deux. */
export type MediaType = 'photo' | 'video'

export interface DownloadRequest {
  keyword: string
  /** Chemin Windows réel, ex. "D:\\BRoll". */
  destFolder: string
  /** Sous-dossier éditable, ex. "2026-06-04-ramen". */
  subFolder: string
  /** Photos ou vidéos (défaut UI : 'photo'). En vidéo, seules Pexels/Pixabay répondent. */
  mediaType: MediaType
  sources: Record<SourceId, { enabled: boolean; count: number }>
}

export interface ProgressEvent {
  source: SourceId
  done: number
  total: number
  phase: 'searching' | 'downloading' | 'done' | 'error'
}

export type SourceError =
  /** HTTP 429 / quota épuisé (Unsplash : aussi 403). */
  | { type: 'rate_limit'; message: string }
  /** Autre erreur API : clé invalide, 4xx/5xx, réponse inattendue, réseau. */
  | { type: 'api'; message: string }
  /** Échec d'écriture disque. */
  | { type: 'fs'; message: string }

export interface SourceResult {
  source: SourceId
  downloaded: number
  requested: number
  error?: SourceError
}

export interface DownloadSummary {
  /** Pour activer le bouton « Ouvrir le dossier ». */
  subFolderAbsolutePath: string
  results: SourceResult[]
}
