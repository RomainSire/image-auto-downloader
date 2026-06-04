import { fetchJson, paginate, requireKey } from './http'
import type { ImageHit, ImageSource } from './types'

/**
 * Pixabay — https://pixabay.com/api/docs/
 * Auth : clé en query param. `per_page` 3–200. `q` max 100 caractères.
 * Rate limit : 429. `totalHits` plafonne à 500 le nombre d'images accessibles.
 */

const PER_PAGE_MAX = 200
const PER_PAGE_MIN = 3
const RATE_LIMIT_STATUSES = [429]

interface PixabayResponse {
  total: number
  totalHits: number
  hits: { id: number; largeImageURL: string; webformatURL: string }[]
}

export const pixabay: ImageSource = {
  id: 'pixabay',
  async search(keyword, count, apiKey): Promise<ImageHit[]> {
    requireKey(apiKey)
    const q = keyword.slice(0, 100)
    return paginate(count, PER_PAGE_MAX, async (perPage, page) => {
      // Pixabay impose per_page ≥ 3 ; on tronque ensuite via `paginate`.
      const reqPerPage = Math.max(PER_PAGE_MIN, perPage)
      const url =
        `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}` +
        `&q=${encodeURIComponent(q)}&per_page=${reqPerPage}&page=${page}&image_type=photo`
      const data = await fetchJson<PixabayResponse>(url, {}, RATE_LIMIT_STATUSES)
      const hits = data.hits.map((h) => ({
        id: String(h.id),
        url: h.largeImageURL || h.webformatURL
      }))
      return { hits, hasMore: page * reqPerPage < data.totalHits }
    })
  }
}
