import { fetchJson, paginate, requireKey } from './http'
import { pickVideoVariant } from './video'
import type { MediaHit, MediaSource } from './types'

/**
 * Pexels — https://www.pexels.com/api/documentation/
 * Auth : header `Authorization: {API_KEY}`. `per_page` max 80.
 * Rate limit : 429. Pagination via le champ `next_page`.
 * - Photos : `GET /v1/search`            → `photos[].src`
 * - Vidéos : `GET /videos/search`        → `videos[].video_files[]`
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

interface PexelsVideoResponse {
  total_results: number
  page: number
  per_page: number
  videos: {
    id: number
    video_files: {
      quality: string
      file_type: string
      width: number
      height: number
      link: string
    }[]
  }[]
  next_page?: string
}

export const pexels: MediaSource = {
  id: 'pexels',
  async search(keyword, count, apiKey): Promise<MediaHit[]> {
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
  },

  async searchVideos(keyword, count, apiKey): Promise<MediaHit[]> {
    requireKey(apiKey)
    return paginate(count, PER_PAGE_MAX, async (perPage, page) => {
      // NB : l'endpoint vidéo est /videos/search (pas /v1/videos/search).
      const url =
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}` +
        `&per_page=${perPage}&page=${page}`
      const data = await fetchJson<PexelsVideoResponse>(
        url,
        { Authorization: apiKey },
        RATE_LIMIT_STATUSES
      )
      const hits: MediaHit[] = []
      for (const v of data.videos) {
        // On ne garde que les fichiers MP4, et on vise ~1080p.
        const candidates = v.video_files
          .filter((f) => f.file_type === 'video/mp4' && f.link)
          .map((f) => ({ url: f.link, width: f.width, height: f.height }))
        const url = pickVideoVariant(candidates)
        if (url) hits.push({ id: String(v.id), url })
      }
      return { hits, hasMore: Boolean(data.next_page) }
    })
  }
}
