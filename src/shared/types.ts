/**
 * Types partagés entre main, preload et renderer.
 *
 * ⚠️ Ce module ne doit contenir AUCUN import runtime (pas d'`electron`,
 * pas de `node:*`) : il est importé dans les trois process, y compris le
 * renderer (web). On n'y met que des `type`/`interface`.
 */

export type Lang = 'en' | 'fr' | 'ja'

/** Sources nécessitant une clé API (Openverse est anonyme → absente). */
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
