import { useConnection } from '../composables/useConnection'
import type { Album, AlbumSendMode, EffectiveSchedule, Image, ManualScheduleTriggerResult, Page } from '../types/admin'

const EMPTY_ALBUM_CONFIG = '{}'

function albumWritePayload(input: { name: string; send_mode: AlbumSendMode }) {
  return { ...input, send_config_json: EMPTY_ALBUM_CONFIG }
}

function ensureNumber(v: string): number {
  return Number(v) || 0
}

export type SortOrder = 'asc' | 'desc'

export type AlbumListParams = {
  offset?: number
  limit?: number
  sortBy?: string
  sortOrder?: SortOrder
  filterField?: string
  filterQ?: string
}

export type ImageListParams = {
  offset?: number
  limit?: number
  /** Server-side album scope (optional) */
  albumId?: string
  sortBy?: string
  sortOrder?: SortOrder
  filterField?: string
  filterQ?: string
}

function appendListQS(sp: URLSearchParams, p: { sortBy?: string; sortOrder?: SortOrder; filterField?: string; filterQ?: string }) {
  const sortBy = p.sortBy?.trim() || 'id'
  sp.set('sort_by', sortBy)
  sp.set('sort_order', p.sortOrder === 'desc' ? 'desc' : 'asc')
  const fq = (p.filterQ ?? '').trim()
  if (fq) {
    sp.set('filter_field', (p.filterField && p.filterField !== 'all' ? p.filterField : 'all') || 'all')
    sp.set('filter_q', fq)
  }
}

export async function adminFetch(path: string, init?: RequestInit) {
  const { normalizedBase, adminKey } = useConnection()
  const headers = new Headers(init?.headers || {})
  headers.set('Content-Type', 'application/json')
  headers.set('X-Admin-Key', adminKey.value)
  const res = await fetch(`${normalizedBase.value}${path}`, { ...init, headers })
  if (!res.ok) {
    let errMsg = `${res.status} ${res.statusText}`
    try {
      const payload = (await res.json()) as { error?: string }
      if (payload.error) errMsg = payload.error
    } catch {
      // ignore non-json error payload
    }
    throw new Error(errMsg)
  }
  if (res.status === 204) return null
  return res.json()
}

export async function listAlbums(p: AlbumListParams = {}) {
  const sp = new URLSearchParams()
  sp.set('offset', String(p.offset ?? 0))
  sp.set('limit', String(p.limit ?? 50))
  appendListQS(sp, p)
  return (await adminFetch(`/v1/admin/albums?${sp}`)) as Page<Album>
}

export async function createAlbum(input: { name: string; send_mode: AlbumSendMode }) {
  return adminFetch('/v1/admin/albums', {
    method: 'POST',
    body: JSON.stringify(albumWritePayload(input)),
  })
}

export async function updateAlbum(id: number, input: { name: string; send_mode: AlbumSendMode }) {
  return adminFetch(`/v1/admin/albums/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(albumWritePayload(input)),
  })
}

/** One-off preview to the configured schedule send channel; optional guild scopes DB schedule row. */
export async function sendAlbumTest(albumId: number, guildId?: string) {
  return (await adminFetch(`/v1/admin/albums/${albumId}/send-test`, {
    method: 'POST',
    body: JSON.stringify({ guild_id: guildId?.trim() ?? '' }),
  })) as ManualScheduleTriggerResult
}

export async function deleteAlbum(id: number) {
  return adminFetch(`/v1/admin/albums/${id}`, { method: 'DELETE' })
}

export async function listImages(p: ImageListParams = {}) {
  const sp = new URLSearchParams()
  sp.set('offset', String(p.offset ?? 0))
  sp.set('limit', String(p.limit ?? 50))
  const aid = p.albumId?.trim()
  if (aid) sp.set('album_id', aid)
  appendListQS(sp, p)
  return (await adminFetch(`/v1/admin/images?${sp}`)) as Page<Image>
}

export async function createImage(input: {
  url: string
  source: string
  guild_id: string
  album_id: string
  file_id: string
}) {
  return adminFetch('/v1/admin/images', {
    method: 'POST',
    body: JSON.stringify({
      url: input.url.trim(),
      source: input.source.trim(),
      guild_id: input.guild_id.trim(),
      album_id: ensureNumber(input.album_id),
      file_id: ensureNumber(input.file_id),
    }),
  })
}

export async function updateImage(id: number, input: {
  url: string
  source: string
  guild_id: string
  album_id: string
  file_id: string
}) {
  return adminFetch(`/v1/admin/images/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      url: input.url.trim(),
      source: input.source.trim(),
      guild_id: input.guild_id.trim(),
      album_id: ensureNumber(input.album_id),
      file_id: ensureNumber(input.file_id),
    }),
  })
}

export async function deleteImage(id: number) {
  return adminFetch(`/v1/admin/images/${id}`, { method: 'DELETE' })
}

export async function getSchedule(guildID?: string) {
  const guildQuery = guildID?.trim() ? `?guild_id=${encodeURIComponent(guildID.trim())}` : ''
  return (await adminFetch(`/v1/admin/schedule${guildQuery}`)) as EffectiveSchedule
}

export async function putSchedule(payload: {
  guild_id: string
  send_channel_id: string
  send_interval: string
  send_history_size: number
}) {
  return adminFetch('/v1/admin/schedule', { method: 'PUT', body: JSON.stringify(payload) })
}
