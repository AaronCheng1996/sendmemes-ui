<script setup lang="ts">
import { ref, watch } from 'vue'

import type { Album, AlbumSendMode } from '../types/admin'
import { createAlbum, deleteAlbum, listAlbums, sendAlbumTest, updateAlbum } from '../services/adminApi'
import { useJobs } from '../composables/useJobs'
import { useAsyncTask } from '../composables/useAsyncTask'
import { useToast } from '../composables/useToast'
import { usePageSize } from '../composables/usePageSize'
import { usePreviewSize } from '../composables/usePreviewSize'
import Pagination from '../components/Pagination.vue'
import ThumbPreview from '../components/ThumbPreview.vue'

const { pushToast } = useToast()
const { busy, runTask } = useAsyncTask()
const { start: startJobs } = useJobs()
const albums = ref<Album[]>([])
const total = ref(0)
const offset = ref(0)
const limit = usePageSize('sendmemes_ui_albums_page_size', 10)
const { previewSize } = usePreviewSize()

type AlbumSortKey = 'id' | 'name' | 'positive_rating' | 'cover'
const sortKey = ref<AlbumSortKey>('id')
const sortDir = ref<'asc' | 'desc'>('asc')

type AlbumFilterField = 'all' | 'id' | 'name' | 'positive_rating' | 'cover'
const filterFieldInput = ref<AlbumFilterField>('all')
const filterTextInput = ref('')
const filterField = ref<AlbumFilterField>('all')
const filterText = ref('')

const newAlbumName = ref('')
const newAlbumSendMode = ref<AlbumSendMode>('Random')
const createOpen = ref(false)
const editingAlbumId = ref<number | null>(null)
const editingAlbumName = ref('')
const editingAlbumSendMode = ref<AlbumSendMode>('Random')

function applyFilter() {
  filterField.value = filterFieldInput.value
  filterText.value = filterTextInput.value
  offset.value = 0
}

function toggleSort(key: AlbumSortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  offset.value = 0
}

function sortLabel(key: AlbumSortKey) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? '↑' : '↓'
}

async function refresh() {
  const page = await listAlbums({
    offset: offset.value,
    limit: limit.value,
    sortBy: sortKey.value,
    sortOrder: sortDir.value,
    filterField: filterField.value,
    filterQ: filterText.value,
  })
  albums.value = page.items
  total.value = page.total
  offset.value = page.offset
  limit.value = page.limit
}

async function onCreate() {
  if (!newAlbumName.value.trim()) return
  await createAlbum({
    name: newAlbumName.value.trim(),
    send_mode: newAlbumSendMode.value,
  })
  pushToast('Album created', 'success')
  newAlbumName.value = ''
  newAlbumSendMode.value = 'Random'
  createOpen.value = false
  await refresh()
}

async function onUpdate(id: number) {
  if (!editingAlbumName.value.trim()) return
  await updateAlbum(id, {
    name: editingAlbumName.value.trim(),
    send_mode: editingAlbumSendMode.value,
  })
  pushToast('Album updated', 'success')
  editingAlbumId.value = null
  editingAlbumName.value = ''
  editingAlbumSendMode.value = 'Random'
  await refresh()
}

async function onSendTest(albumId: number) {
  await sendAlbumTest(albumId)
  pushToast('Send test queued — running in the background', 'info')
  startJobs()
}

async function onDelete(id: number) {
  if (!window.confirm(`Delete album ${id}?`)) return
  await deleteAlbum(id)
  pushToast('Album deleted', 'success')
  await refresh()
}

function openCreate() {
  newAlbumName.value = ''
  newAlbumSendMode.value = 'Random'
  createOpen.value = true
}

function startEdit(a: Album) {
  editingAlbumId.value = a.id
  editingAlbumName.value = a.name
  editingAlbumSendMode.value = (a.send_mode as AlbumSendMode) ?? 'Random'
}

watch([offset, limit, sortKey, sortDir, filterField, filterText], () => {
  runTask(refresh)
}, { immediate: true })
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2 class="toolbarTitle">Albums</h2>
      <div class="toolbarFilters">
        <select v-model="filterFieldInput" class="selectCompact" title="Filter column">
          <option value="all">All fields</option>
          <option value="id">ID</option>
          <option value="name">Name</option>
          <option value="positive_rating">Rating</option>
          <option value="cover">Cover (yes/no)</option>
        </select>
        <input v-model="filterTextInput" class="inputGrow" placeholder="Filter query…" @keydown.enter="applyFilter" />
        <button type="button" class="btnCompact" :disabled="busy" @click="applyFilter">Apply filter</button>
      </div>
      <div class="toolbarActions">
        <button type="button" class="btnCompact" :disabled="busy" @click="runTask(refresh)">Refresh</button>
        <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="openCreate">Create</button>
      </div>
    </div>
    <p class="muted tableHint">Filter and sort apply to <strong>all rows</strong> in the database; this table shows one page of results.</p>

    <Pagination
      :total="total"
      :offset="offset"
      :limit="limit"
      :busy="busy"
      @update:offset="(v: number) => (offset = v)"
      @update:limit="(v: number) => (limit = v)"
    />

    <table>
      <thead>
        <tr>
          <th class="sortable" @click="toggleSort('id')">ID {{ sortLabel('id') }}</th>
          <th>Cover</th>
          <th v-if="previewSize !== 'off'">Preview</th>
          <th class="sortable" @click="toggleSort('name')">Name {{ sortLabel('name') }}</th>
          <th>Send mode</th>
          <th class="sortable" @click="toggleSort('positive_rating')">Rating {{ sortLabel('positive_rating') }}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in albums" :key="a.id">
          <td>{{ a.id }}</td>
          <td>
            <span v-if="a.has_cover" class="coverIcon has" :title="`Cover image #${a.cover_image_id ?? ''}`">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="currentColor" />
                <path d="M7 12.5l3.3 3.3L17 9.5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span v-else class="coverIcon none" title="No cover">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </span>
          </td>
          <td v-if="previewSize !== 'off'">
            <ThumbPreview :src="a.preview_url" :alt="a.name" :size="previewSize" placeholder="empty" />
          </td>
          <td>
            <input v-if="editingAlbumId === a.id" v-model="editingAlbumName" class="inputInlineEdit" />
            <span v-else>{{ a.name }}</span>
          </td>
          <td>
            <select v-if="editingAlbumId === a.id" v-model="editingAlbumSendMode" class="selectCompact sendModeSelect">
              <option value="Order">Order</option>
              <option value="Random">Random</option>
              <option value="Single">Single</option>
              <option value="Video">Video</option>
              <option value="Custom">Custom</option>
            </select>
            <span v-else>{{ a.send_mode }}</span>
          </td>
          <td>{{ a.positive_rating ?? 0 }}</td>
          <td class="actions">
            <template v-if="editingAlbumId === a.id">
              <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="runTask(() => onUpdate(a.id))">Save</button>
              <button type="button" class="btnCompact" @click="editingAlbumId = null">Cancel</button>
            </template>
            <template v-else>
              <button type="button" class="btnCompact" @click="startEdit(a)">Edit</button>
              <button type="button" class="btnCompact" title="Send a test message to the schedule channel (caption [TEST] …)" :disabled="busy" @click="runTask(() => onSendTest(a.id))">Send test</button>
              <button type="button" class="btnCompact btnDanger" :disabled="busy" @click="runTask(() => onDelete(a.id))">Delete</button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <Pagination
      :total="total"
      :offset="offset"
      :limit="limit"
      :busy="busy"
      @update:offset="(v: number) => (offset = v)"
      @update:limit="(v: number) => (limit = v)"
    />

    <p v-if="busy" class="status">Working...</p>

    <Teleport to="body">
      <div v-if="createOpen" class="modalBackdrop" @click.self="createOpen = false">
        <div class="modalPanel" role="dialog" aria-modal="true" aria-labelledby="createAlbumTitle">
          <h3 id="createAlbumTitle" class="modalTitle">New album</h3>
          <label class="modalField">
            Name
            <input v-model="newAlbumName" placeholder="Album name" @keydown.enter="runTask(onCreate)" />
          </label>
          <label class="modalField">
            Send mode
            <select v-model="newAlbumSendMode" class="selectCompact">
              <option value="Order">Order</option>
              <option value="Random">Random</option>
              <option value="Single">Single</option>
              <option value="Video">Video</option>
              <option value="Custom">Custom</option>
            </select>
          </label>
          <div class="modalActions">
            <button type="button" @click="createOpen = false">Cancel</button>
            <button type="button" class="btnPrimary" :disabled="busy || !newAlbumName.trim()" @click="runTask(onCreate)">Create</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.mutedInline {
  font-weight: 400;
  color: #8a9bc4;
  font-size: 0.78rem;
}

.sendModeSelect {
  min-width: 7rem;
  max-width: 100%;
}
</style>
