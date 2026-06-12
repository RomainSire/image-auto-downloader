import { fetchJson, paginate, requireKey } from './http'
import { pickVideoVariant, type VideoVariant } from './video'
import type { MediaHit, MediaSource } from './types'

/**
 * Pixabay — https://pixabay.com/api/docs/
 * Auth : clé en query param. `per_page` 3–200. `q` max 100 caractères.
 * Rate limit : 429. `totalHits` plafonne à 500 le nombre de médias accessibles.
 * - Photos : `GET /api/?image_type=photo` → `hits[].largeImageURL`
 * - Vidéos : `GET /api/videos/`           → `hits[].videos.{large,medium,small,tiny}`
 */

const PER_PAGE_MAX = 200
const PER_PAGE_MIN = 3
const RATE_LIMIT_STATUSES = [429]

interface PixabayResponse {
  total: number
  totalHits: number
  hits: { id: number; largeImageURL: string; webformatURL: string }[]
}

interface PixabayVideoFile {
  url: string
  width: number
  height: number
  size: number
}

interface PixabayVideoResponse {
  total: number
  totalHits: number
  hits: {
    id: number
    videos: Record<'large' | 'medium' | 'small' | 'tiny', PixabayVideoFile>
  }[]
}

/** Variantes par préférence décroissante (large d'abord → résout les égalités vers large). */
const PIXABAY_VIDEO_SIZES = ['large', 'medium', 'small', 'tiny'] as const

export const pixabay: MediaSource = {
  id: 'pixabay',
  async search(keyword, count, apiKey): Promise<MediaHit[]> {
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
  },

  async searchVideos(keyword, count, apiKey): Promise<MediaHit[]> {
    requireKey(apiKey)
    const q = keyword.slice(0, 100)
    return paginate(count, PER_PAGE_MAX, async (perPage, page) => {
      const reqPerPage = Math.max(PER_PAGE_MIN, perPage)
      const url =
        `https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey)}` +
        `&q=${encodeURIComponent(q)}&per_page=${reqPerPage}&page=${page}`
      const data = await fetchJson<PixabayVideoResponse>(url, {}, RATE_LIMIT_STATUSES)
      const hits: MediaHit[] = []
      for (const h of data.hits) {
        const candidates: VideoVariant[] = PIXABAY_VIDEO_SIZES.map((s) => h.videos[s]).map((f) => ({
          url: f?.url ?? '',
          width: f?.width ?? 0,
          height: f?.height ?? 0
        }))
        const url = pickVideoVariant(candidates)
        if (url) hits.push({ id: String(h.id), url })
      }
      return { hits, hasMore: page * reqPerPage < data.totalHits }
    })
  }
}
