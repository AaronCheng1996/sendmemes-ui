export type AlbumSendMode = 'Order' | 'Random' | 'Single' | 'Video' | 'Custom'

export type MediaKind = 'image' | 'video'

export type Album = {
  id: number
  name: string
  /** Full path of the album's folder from the walked root, root name included
   *  (e.g. "Media/Crawler/SomeArtist"). What a rule's album_filter matches. */
  source_path?: string
  /** The source's own id for the folder backing this album (a pCloud folderid).
   *  It survives a rename, which is how a sync keeps an album's rating and
   *  config when its folder is renamed. Absent until a sync has seen it. */
  folder_id?: number
  has_cover: boolean
  cover_image_id?: number
  send_mode: AlbumSendMode
  send_config_json?: string
  positive_rating?: number
  preview_url?: string
  /** Set when a sync no longer finds the album's source folder. Such albums are
   *  hidden from this list by default, and skipped by scheduled delivery, until
   *  the folder reappears. */
  missing_since?: string
  /** How many live files the album holds. Computed by the list endpoint. */
  media_count?: number
  /** When the album's content last changed — its newest file's arrival. A send
   *  or a rating does not move it. Computed by the list endpoint. */
  updated_at?: string
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
  /** Set when a sync no longer finds the file in its source. The row is kept so
   *  the file revives if it comes back; it is hidden from this list by default. */
  deleted_at?: string
}

export type Page<T> = {
  items: T[]
  total: number
  offset: number
  limit: number
}

export type TriggerType = 'new_album' | 'new_files' | 'scheduled'

/** Narrows a rule to part of the library by folder path. Absent, or mode 'all',
 *  covers every album. A path matches the folder itself and everything under it. */
export type AlbumPathFilter = {
  mode?: 'all' | 'include' | 'exclude'
  paths?: string[]
}

export type DeliveryRule = {
  id: number
  name: string
  guild_id: string
  trigger_type: TriggerType
  channel_id: string
  send_interval?: string
  history_size: number
  enabled: boolean
  /** Presentation overrides; unset fields inherit the app defaults. */
  message_style?: MessageStyle
  /** Which albums the rule applies to; unset means all of them. */
  album_filter?: AlbumPathFilter
  /** Computed on read for scheduled rules only; never persisted. */
  next_run_at?: string
  schedule_description?: string
}

export type SyncSettings = {
  sync_interval: string
  message_style?: MessageStyle
}

/**
 * One layer of message presentation; layers merge per field in the order
 * app defaults → delivery rule → album. An omitted key means "inherit".
 */
export type MessageStyle = {
  use_embed?: boolean | null
  title?: string
  body?: string
  /** Embed-only options, ignored when the resolved format is plain text. */
  color?: string
  footer?: string
  author?: string
  url?: string
  show_image?: boolean | null
  show_thumbnail?: boolean | null
  show_timestamp?: boolean | null
}

/** album_created and files_added report discovered content and can be delivered
 *  to Discord; the rest report what a sync took away (or renamed) and are only
 *  ever shown in the activity log. */
export type SyncEventType = 'album_created' | 'files_added' | 'album_renamed' | 'album_missing' | 'files_removed'

export type SyncEvent = {
  id: number
  event_type: SyncEventType
  album_id?: number
  album_name: string
  new_images: number
  new_videos: number
  /** Files the run soft-deleted because the source no longer lists them. */
  removed_images: number
  removed_videos: number
  /** The album's former name, on a rename event. */
  previous_name?: string
  /** Sample of the file names the event is about: discovered ones for an add
   *  event, removed ones for a removal. Capped, not exhaustive. */
  file_names?: string[]
  created_at: string
}

export type TaskRunStatus = 'running' | 'succeeded' | 'failed'

/** One execution worth reviewing later: a scheduled send, a sync run, or a pass
 *  reported by an external client such as the crawler. Run-shaped rather than
 *  line-shaped — the table shows `summary` and expands `detail`. */
export type TaskRun = {
  id: number
  /** Who ran it: 'scheduled_send', 'sync', or whatever a client calls itself. */
  source: string
  /** What it ran on: a rule name, an artist, a channel. */
  task?: string
  status: TaskRunStatus
  started_at: string
  finished_at?: string
  summary?: string
  detail?: Record<string, unknown>
  error?: string
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
