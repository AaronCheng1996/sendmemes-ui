<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import MediaStrip from '../components/MediaStrip.vue'
import Pagination from '../components/Pagination.vue'
import type { Image, SyncEvent, SyncEventType } from '../types/admin'
import { listSyncEventMedia, listSyncEvents } from '../services/adminApi'
import { useAsyncTask } from '../composables/useAsyncTask'
import { formatAbsolute, formatRelative } from '../utils/time'

// How each event type is labelled and coloured. Additions use the two existing
// badge colours; removals borrow the danger palette, renames the accent one.
const EVENT_STYLES: Record<SyncEventType, { label: string; cls: string }> = {
  album_created: { label: 'New album', cls: 'eventCreated' },
  files_added: { label: 'New files', cls: 'eventAdded' },
  album_renamed: { label: 'Renamed', cls: 'eventRenamed' },
  album_missing: { label: 'Folder removed', cls: 'eventRemoved' },
  files_removed: { label: 'Files removed', cls: 'eventRemoved' },
}

const FALLBACK_STYLE = { label: 'Changed', cls: 'eventAdded' }

function eventStyle(t: SyncEventType) {
  return EVENT_STYLES[t] ?? FALLBACK_STYLE
}

// Removals fill the same two count columns as additions; the badge says which
// direction they run in, so the numbers do not need their own columns.
function imageCount(ev: SyncEvent) {
  return ev.new_images || ev.removed_images || 0
}

function videoCount(ev: SyncEvent) {
  return ev.new_videos || ev.removed_videos || 0
}

const { busy, runTask } = useAsyncTask()
const events = ref<SyncEvent[]>([])

// Expanded rows, and the media each one resolved. Fetched on first expand
// rather than with the page: most rows are never opened, and each costs a
// round trip that also resolves thumbnail URLs upstream.
const expanded = ref<Set<number>>(new Set())
const media = ref<Record<number, Image[]>>({})
const loadingMedia = ref<Set<number>>(new Set())

async function toggle(ev: SyncEvent) {
  const next = new Set(expanded.value)
  if (next.delete(ev.id)) {
    expanded.value = next
    return
  }
  next.add(ev.id)
  expanded.value = next
  if (media.value[ev.id] || loadingMedia.value.has(ev.id)) return

  loadingMedia.value = new Set(loadingMedia.value).add(ev.id)
  try {
    media.value = { ...media.value, [ev.id]: await listSyncEventMedia(ev.id) }
  } catch {
    // A file whose row has since been hard-deleted resolves to nothing; the
    // sampled names below still say what the event was about.
    media.value = { ...media.value, [ev.id]: [] }
  } finally {
    const done = new Set(loadingMedia.value)
    done.delete(ev.id)
    loadingMedia.value = done
  }
}

/** How many files the event covers in total — what the strip's counter needs. */
function eventTotal(ev: SyncEvent): number {
  return (ev.new_images || 0) + (ev.new_videos || 0) + (ev.removed_images || 0) + (ev.removed_videos || 0)
}

function hasDetail(ev: SyncEvent): boolean {
  return eventTotal(ev) > 0 || (ev.file_names ?? []).length > 0
}
const total = ref(0)
const offset = ref(0)
const limit = ref(50)

async function refresh() {
  const page = await listSyncEvents({ offset: offset.value, limit: limit.value })
  events.value = page.items
  total.value = page.total
}

onMounted(() => runTask(refresh))
watch([offset, limit], () => runTask(refresh))
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2 class="toolbarTitle">Activity</h2>
      <div class="toolbarActions">
        <button type="button" class="btnCompact" :disabled="busy" @click="runTask(refresh)">Refresh</button>
      </div>
    </div>
    <p class="muted tableHint">
      What each sync run changed, newest first: albums and files discovered, files and folders that disappeared,
      and folders that were renamed. Removals are recorded here only — they are never posted to Discord.
      Click a row to see the files it was about.
    </p>

    <Pagination
      :total="total"
      :offset="offset"
      :limit="limit"
      :busy="busy"
      @update:offset="(v: number) => (offset = v)"
      @update:limit="(v: number) => (limit = v)"
    />

    <table class="tableResponsive">
      <thead>
        <tr>
          <th>Time</th>
          <th>Event</th>
          <th>Album</th>
          <th>Images</th>
          <th>Videos</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="ev in events" :key="ev.id">
          <tr
            :class="{ rowOpen: expanded.has(ev.id), rowClickable: hasDetail(ev) }"
            @click="hasDetail(ev) && toggle(ev)"
          >
            <td data-label="Time" :title="formatAbsolute(ev.created_at)">{{ formatRelative(ev.created_at) }}</td>
            <td data-label="Event">
              <span class="eventBadge" :class="eventStyle(ev.event_type).cls">
                {{ eventStyle(ev.event_type).label }}
              </span>
            </td>
            <td data-label="Album">
              <span v-if="hasDetail(ev)" class="rowCaret">{{ expanded.has(ev.id) ? '▾' : '▸' }}</span>
              <span v-if="ev.previous_name" class="renamedFrom">{{ ev.previous_name }} → </span>{{ ev.album_name }}
            </td>
            <td data-label="Images">{{ imageCount(ev) || '-' }}</td>
            <td data-label="Videos">{{ videoCount(ev) || '-' }}</td>
          </tr>
          <tr v-if="expanded.has(ev.id)" :key="`${ev.id}-detail`" class="rowDetail">
            <td colspan="5">
              <p v-if="loadingMedia.has(ev.id)" class="detailNote">Loading files…</p>
              <MediaStrip
                v-else-if="(media[ev.id] ?? []).length"
                :items="media[ev.id]"
                :total="eventTotal(ev)"
              />
              <p v-else class="detailNote">
                No previews available. Files: {{ (ev.file_names ?? []).join(', ') || 'none recorded' }}
              </p>
            </td>
          </tr>
        </template>
        <tr v-if="!busy && events.length === 0">
          <td colspan="5" class="muted">No sync activity recorded yet.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.renamedFrom {
  color: var(--text-muted);
}
</style>
