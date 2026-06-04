import { fetchJson, paginate, requireKey } from './http'
import type { ImageHit, ImageSource } from './types'

/**
 * Unsplash — https://unsplash.com/documentation#search-photos
 * Auth : header `Authorization: Client-ID {ACCESS_KEY}`. `per_page` max 30.
 * Rate limit : 403 / 429.
 */

const PER_PAGE_MAX = 30
const RATE_LIMIT_STATUSES = [403, 429]

interface UnsplashResponse {
  total: number
  total_pages: number
  results: { id: string; urls: { full: string; regular: string } }[]
}

export const unsplash: ImageSource = {
  id: 'unsplash',
  async search(keyword, count, apiKey): Promise<ImageHit[]> {
    requireKey(apiKey)
    return paginate(count, PER_PAGE_MAX, async (perPage, page) => {
      const url =
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}` +
        `&per_page=${perPage}&page=${page}`
      const data = await fetchJson<UnsplashResponse>(
        url,
        { Authorization: `Client-ID ${apiKey}` },
        RATE_LIMIT_STATUSES
      )
      const hits = data.results.map((r) => ({ id: r.id, url: r.urls.full || r.urls.regular }))
      return { hits, hasMore: page < data.total_pages }
    })
  }
}
