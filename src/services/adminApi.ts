import { useConnection } from '../composables/useConnection'
import type { Album, AlbumSendMode, DeliveryRule, Image, ManualScheduleTriggerResult, Page, SyncEvent, SyncSettings } from '../types/admin'

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

/** One-off preview send; empty channel falls back to the first enabled scheduled rule. */
export async function sendAlbumTest(albumId: number, channelId?: string) {
  return (await adminFetch(`/v1/admin/albums/${albumId}/send-test`, {
    method: 'POST',
    body: JSON.stringify({ channel_id: channelId?.trim() ?? '' }),
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

export type DeliveryRuleInput = {
  name: string
  guild_id: string
  trigger_type: string
  channel_id: string
  send_interval: string
  history_size: number
  enabled: boolean
}

export async function listRules() {
  return (await adminFetch('/v1/admin/delivery-rules')) as DeliveryRule[]
}

export async function createRule(input: DeliveryRuleInput) {
  return (await adminFetch('/v1/admin/delivery-rules', {
    method: 'POST',
    body: JSON.stringify(input),
  })) as DeliveryRule
}

export async function updateRule(id: number, input: DeliveryRuleInput) {
  return (await adminFetch(`/v1/admin/delivery-rules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })) as DeliveryRule
}

export async function deleteRule(id: number) {
  return adminFetch(`/v1/admin/delivery-rules/${id}`, { method: 'DELETE' })
}

export async function getSyncSettings() {
  return (await adminFetch('/v1/admin/sync-settings')) as SyncSettings
}

export async function putSyncSettings(syncInterval: string) {
  return (await adminFetch('/v1/admin/sync-settings', {
    method: 'PUT',
    body: JSON.stringify({ sync_interval: syncInterval.trim() }),
  })) as SyncSettings
}

/** Run a pCloud sync immediately; returns the run report. */
export async function triggerSyncNow() {
  return adminFetch('/v1/admin/sync/trigger-now', { method: 'POST' })
}

/** Sync discovery events (new albums / new files), newest first. */
export async function listSyncEvents(p: { offset?: number; limit?: number } = {}) {
  const sp = new URLSearchParams()
  sp.set('offset', String(p.offset ?? 0))
  sp.set('limit', String(p.limit ?? 50))
  return (await adminFetch(`/v1/admin/sync-events?${sp}`)) as Page<SyncEvent>
}
