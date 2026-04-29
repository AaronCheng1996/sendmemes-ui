export type Album = {
  id: number
  name: string
  has_cover: boolean
  cover_image_id?: number
  positive_rating?: number
  preview_url?: string
}

export type Image = {
  id: number
  url: string
  source?: string
  guild_id?: string
  album_id?: number
  file_id?: number
  preview_url?: string
}

export type Page<T> = {
  items: T[]
  total: number
  offset: number
  limit: number
}

export type EffectiveSchedule = {
  guild_id: string
  send_channel_id: string
  send_interval: string
  send_history_size: number
  source_send_channel_id: string
  source_send_interval: string
  source_send_history_size: string
}
