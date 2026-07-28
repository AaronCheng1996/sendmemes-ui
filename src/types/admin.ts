export type AlbumSendMode = 'Order' | 'Random' | 'Single' | 'Video' | 'Custom'

export type MediaKind = 'image' | 'video'

export type Album = {
  id: number
  name: string
  has_cover: boolean
  cover_image_id?: number
  send_mode: AlbumSendMode
  send_config_json?: string
  positive_rating?: number
  preview_url?: string
  /** Set when a sync no longer finds the album's source folder; such albums are
   *  skipped by scheduled delivery until the folder reappears. */
  missing_since?: string
}

export type Image = {
  id: number
  url: string
  source?: string
  guild_id?: string
  album_id?: number
  file_id?: number
  kind: MediaKind
  size_bytes?: number
  preview_url?: string
}

export type Page<T> = {
  items: T[]
  total: number
  offset: number
  limit: number
}

export type TriggerType = 'new_album' | 'new_files' | 'scheduled'

export type DeliveryRule = {
  id: number
  name: string
  guild_id: string
  trigger_type: TriggerType
  channel_id: string
  send_interval?: string
  history_size: number
  enabled: boolean
  caption_template?: string
  /** Computed on read for scheduled rules only; never persisted. */
  next_run_at?: string
  schedule_description?: string
}

export type SyncSettings = {
  sync_interval: string
}

export type SyncEventType = 'album_created' | 'files_added'

export type SyncEvent = {
  id: number
  event_type: SyncEventType
  album_id?: number
  album_name: string
  new_images: number
  new_videos: number
  file_names?: string[]
  created_at: string
}

export type ManualScheduleTriggerResult = {
  triggered: boolean
  album_id?: number
  album_name?: string
  channel_id?: string
  message_id?: string
}

export type SystemStatus = {
  server_time: string
  database_status: string
  discord_connected: boolean
  discord_user?: string
  sync_interval: string
  rule_count: number
  next_scheduled_run?: string
  last_sync_at?: string
  album_count: number
  image_count: number
  video_count: number
}

export type JobStatus = 'running' | 'succeeded' | 'failed'

export type JobKind = 'send_test' | 'schedule_send' | 'sync'

export type Job = {
  id: string
  kind: JobKind
  label: string
  status: JobStatus
  started_at: string
  finished_at?: string
  error?: string
  result?: Record<string, unknown>
}
