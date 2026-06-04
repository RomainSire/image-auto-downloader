import { fetchJson, paginate, requireKey } from './http'
import type { ImageHit, ImageSource } from './types'

/**
 * Pexels — https://www.pexels.com/api/documentation/#photos-search
 * Auth : header `Authorization: {API_KEY}`. `per_page` max 80.
 * Rate limit : 429. Pagination via le champ `next_page`.
 */

const PER_PAGE_MAX = 80
const RATE_LIMIT_STATUSES = [429]

interface PexelsResponse {
  total_results: number
  page: number
  per_page: number
  photos: { id: number; src: { large2x: string; original: string } }[]
  next_page?: string
}

export const pexels: ImageSource = {
  id: 'pexels',
  async search(keyword, count, apiKey): Promise<ImageHit[]> {
    requireKey(apiKey)
    return paginate(count, PER_PAGE_MAX, async (perPage, page) => {
      const url =
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(keyword)}` +
        `&per_page=${perPage}&page=${page}`
      const data = await fetchJson<PexelsResponse>(
        url,
        { Authorization: apiKey },
        RATE_LIMIT_STATUSES
      )
      const hits = data.photos.map((p) => ({
        id: String(p.id),
        url: p.src.large2x || p.src.original
      }))
      return { hits, hasMore: Boolean(data.next_page) }
    })
  }
}
