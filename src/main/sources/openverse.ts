import { fetchJson, paginate } from './http'
import type { ImageHit, ImageSource } from './types'

/**
 * Openverse — https://api.openverse.org/v1/ (vérifié live le 2026-06-04)
 * Auth : AUCUNE (anonyme), `apiKey` ignoré.
 * Filtre licence OBLIGATOIRE `license=cc0,pdm` → sans attribution, usage
 * commercial OK (sinon des résultats `by-nc-nd` non utilisables en b-roll).
 * `page_size` max 20 en anonyme (21 → 401). Rate limit : 401 / 429.
 */

const PAGE_SIZE_MAX = 20
const RATE_LIMIT_STATUSES = [401, 429]

interface OpenverseResponse {
  result_count: number
  page_count: number
  page: number
  results: { id: string; url: string }[]
}

export const openverse: ImageSource = {
  id: 'openverse',
  async search(keyword, count): Promise<ImageHit[]> {
    return paginate(count, PAGE_SIZE_MAX, async (perPage, page) => {
      const url =
        `https://api.openverse.org/v1/images/?q=${encodeURIComponent(keyword)}` +
        `&page_size=${perPage}&page=${page}&license=cc0,pdm`
      const data = await fetchJson<OpenverseResponse>(url, {}, RATE_LIMIT_STATUSES)
      const hits = data.results.map((r) => ({ id: r.id, url: r.url }))
      return { hits, hasMore: page < data.page_count }
    })
  }
}
