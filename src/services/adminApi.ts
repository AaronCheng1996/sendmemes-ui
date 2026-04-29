import { useConnection } from '../composables/useConnection'
import type { Album, EffectiveSchedule, Image, Page } from '../types/admin'

function ensureNumber(v: string): number {
  return Number(v) || 0
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

export async function listAlbums(offset = 0, limit = 50) {
  const qs = `offset=${offset}&limit=${limit}`
  return (await adminFetch(`/v1/admin/albums?${qs}`)) as Page<Album>
}

export async function createAlbum(name: string) {
  return adminFetch('/v1/admin/albums', { method: 'POST', body: JSON.stringify({ name }) })
}

export async function updateAlbum(id: number, name: string) {
  return adminFetch(`/v1/admin/albums/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) })
}

export async function deleteAlbum(id: number) {
  return adminFetch(`/v1/admin/albums/${id}`, { method: 'DELETE' })
}

export async function listImages(albumID?: string, offset = 0, limit = 50) {
  const albumQuery = albumID?.trim() ? `&album_id=${encodeURIComponent(albumID.trim())}` : ''
  const qs = `offset=${offset}&limit=${limit}${albumQuery}`
  return (await adminFetch(`/v1/admin/images?${qs}`)) as Page<Image>
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
