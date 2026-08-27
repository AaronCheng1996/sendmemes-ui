<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import Pagination from '../components/Pagination.vue'
import type { SyncEvent } from '../types/admin'
import { listSyncEvents } from '../services/adminApi'
import { useAsyncTask } from '../composables/useAsyncTask'
import { formatAbsolute, formatRelative } from '../utils/time'

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
    <p class="muted tableHint">New albums and files discovered by pCloud sync runs, newest first.</p>

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
          <th>New images</th>
          <th>New videos</th>
          <th>Files (sample)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ev in events" :key="ev.id">
          <td data-label="Time" :title="formatAbsolute(ev.created_at)">{{ formatRelative(ev.created_at) }}</td>
          <td data-label="Event">
            <span class="eventBadge" :class="ev.event_type === 'album_created' ? 'eventCreated' : 'eventAdded'">
              {{ ev.event_type === 'album_created' ? 'New album' : 'New files' }}
            </span>
          </td>
          <td data-label="Album">{{ ev.album_name }}</td>
          <td data-label="New images">{{ ev.new_images || '-' }}</td>
          <td data-label="New videos">{{ ev.new_videos || '-' }}</td>
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
</style>
