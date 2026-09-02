<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import Pagination from '../components/Pagination.vue'
import type { SyncEvent, SyncEventType } from '../types/admin'
import { listSyncEvents } from '../services/adminApi'
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
          <th>Files (sample)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ev in events" :key="ev.id">
          <td data-label="Time" :title="formatAbsolute(ev.created_at)">{{ formatRelative(ev.created_at) }}</td>
          <td data-label="Event">
            <span class="eventBadge" :class="eventStyle(ev.event_type).cls">
              {{ eventStyle(ev.event_type).label }}
            </span>
          </td>
          <td data-label="Album">
            <span v-if="ev.previous_name" class="renamedFrom">{{ ev.previous_name }} → </span>{{ ev.album_name }}
          </td>
          <td data-label="Images">{{ imageCount(ev) || '-' }}</td>
          <td data-label="Videos">{{ videoCount(ev) || '-' }}</td>
          <td class="fileNames" data-label="Files">{{ (ev.file_names ?? []).join(', ') || '-' }}</td>
        </tr>
        <tr v-if="!busy && events.length === 0">
          <td colspan="6" class="muted">No sync activity recorded yet.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.fileNames {
  max-width: 26rem;
  overflow-wrap: anywhere;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.renamedFrom {
  color: var(--text-muted);
}
</style>
