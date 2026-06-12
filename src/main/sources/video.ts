/**
 * Helpers partagés par les sources **vidéo** (Pexels, Pixabay).
 *
 * Choix de résolution : on vise ~1080p (bon compromis poids/qualité b-roll).
 * `VIDEO_TARGET_HEIGHT` est volontairement isolé ici pour qu'un futur sélecteur
 * de qualité (Réglages) n'ait qu'à faire varier cette cible.
 */

/**
 * Résolution cible par défaut, exprimée sur le **petit côté** (px).
 * Raisonner sur `min(width, height)` rend le choix indépendant de l'orientation :
 * un 1920×1080 (paysage) et un 1080×1920 (portrait) tombent tous deux sur 1080.
 * Un futur sélecteur de qualité n'aura qu'à faire varier cette cible.
 */
export const VIDEO_TARGET_SHORT_SIDE = 1080

/** Variante téléchargeable d'une vidéo : URL + dimensions en pixels. */
export interface VideoVariant {
  url: string
  width: number
  height: number
}

/** Petit côté d'une variante (0 si dimensions inconnues → traité comme « sous la cible »). */
function shortSide(v: VideoVariant): number {
  return Math.min(v.width || 0, v.height || 0)
}

/**
 * Choisit la variante la plus proche de `target` (sur le petit côté) parmi
 * `candidates` : le **plus grand petit-côté ≤ target** ; à défaut (toutes
 * au-dessus) le **plus petit** disponible. Les candidats sans URL sont ignorés.
 *
 * Les égalités conservent le **premier** candidat → passer les variantes par
 * ordre de préférence décroissant (ex. large → medium → small).
 * Renvoie `null` si aucune variante exploitable.
 */
export function pickVideoVariant(
  candidates: VideoVariant[],
  target: number = VIDEO_TARGET_SHORT_SIDE
): string | null {
  const valid = candidates.filter((c) => c.url)
  if (valid.length === 0) return null

  const atOrBelow = valid.filter((c) => shortSide(c) <= target)
  if (atOrBelow.length > 0) {
    // La plus haute définition qui ne dépasse pas la cible.
    return atOrBelow.reduce((a, b) => (shortSide(b) > shortSide(a) ? b : a)).url
  }
  // Toutes au-dessus de la cible → la plus petite (la moins lourde).
  return valid.reduce((a, b) => (shortSide(b) < shortSide(a) ? b : a)).url
}
