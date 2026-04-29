<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import type { Album } from '../types/admin'
import { createAlbum, deleteAlbum, listAlbums, updateAlbum } from '../services/adminApi'
import { useToast } from '../composables/useToast'
import { usePageSize } from '../composables/usePageSize'
import { usePreviewSize } from '../composables/usePreviewSize'
import Pagination from '../components/Pagination.vue'

const busy = ref(false)
const { pushToast } = useToast()
const albums = ref<Album[]>([])
const total = ref(0)
const offset = ref(0)
const limit = usePageSize('sendmemes_ui_albums_page_size', 10)
const { previewSize } = usePreviewSize()

type AlbumSortKey = 'id' | 'name' | 'positive_rating'
const sortKey = ref<AlbumSortKey>('id')
const sortDir = ref<'asc' | 'desc'>('asc')

type AlbumFilterField = 'all' | 'id' | 'name' | 'positive_rating' | 'cover'
const filterFieldInput = ref<AlbumFilterField>('all')
const filterTextInput = ref('')
const filterField = ref<AlbumFilterField>('all')
const filterText = ref('')

const newAlbumName = ref('')
const createOpen = ref(false)
const editingAlbumId = ref<number | null>(null)
const editingAlbumName = ref('')

function applyFilter() {
  filterField.value = filterFieldInput.value
  filterText.value = filterTextInput.value
}

function toggleSort(key: AlbumSortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortLabel(key: AlbumSortKey) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? '↑' : '↓'
}

const displayAlbums = computed(() => {
  let rows = [...albums.value]
  const q = filterText.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter((a) => {
      switch (filterField.value) {
        case 'id':
          return String(a.id).includes(q)
        case 'name':
          return (a.name || '').toLowerCase().includes(q)
        case 'positive_rating':
          return String(a.positive_rating ?? 0).includes(q)
        case 'cover':
          if (q === 'yes' || q === '1' || q === 'true') return a.has_cover
          if (q === 'no' || q === '0' || q === 'false') return !a.has_cover
          return (a.has_cover ? 'yes' : 'no').includes(q)
        case 'all':
        default:
          return (
            String(a.id).includes(q) ||
            (a.name || '').toLowerCase().includes(q) ||
            String(a.positive_rating ?? 0).includes(q) ||
            (a.has_cover ? 'yes' : 'no').includes(q)
          )
      }
    })
  }
  const dir = sortDir.value === 'asc' ? 1 : -1
  rows.sort((a, b) => {
    switch (sortKey.value) {
      case 'id':
        return (a.id - b.id) * dir
      case 'name':
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }) * dir
      case 'positive_rating':
        return ((a.positive_rating ?? 0) - (b.positive_rating ?? 0)) * dir
      default:
        return 0
    }
  })
  return rows
})

async function runTask(task: () => Promise<void>) {
  busy.value = true
  try {
    await task()
  } catch (error) {
    pushToast((error as Error).message, 'error')
  } finally {
    busy.value = false
  }
}

async function refresh() {
  const page = await listAlbums(offset.value, limit.value)
  albums.value = page.items
  total.value = page.total
  offset.value = page.offset
  limit.value = page.limit
}

async function onCreate() {
  if (!newAlbumName.value.trim()) return
  await createAlbum(newAlbumName.value.trim())
  pushToast('Album created', 'success')
  newAlbumName.value = ''
  createOpen.value = false
  await refresh()
}

async function onUpdate(id: number) {
  if (!editingAlbumName.value.trim()) return
  await updateAlbum(id, editingAlbumName.value.trim())
  pushToast('Album updated', 'success')
  editingAlbumId.value = null
  editingAlbumName.value = ''
  await refresh()
}

async function onDelete(id: number) {
  if (!window.confirm(`Delete album ${id}?`)) return
  await deleteAlbum(id)
  pushToast('Album deleted', 'success')
  await refresh()
}

function openCreate() {
  newAlbumName.value = ''
  createOpen.value = true
}

watch([offset, limit], () => {
  runTask(refresh)
})

onMounted(() => runTask(refresh))
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2 class="toolbarTitle">Albums</h2>
      <div class="toolbarFilters">
        <select v-model="filterFieldInput" title="Filter column">
          <option value="all">All fields</option>
          <option value="id">ID</option>
          <option value="name">Name</option>
          <option value="positive_rating">Rating</option>
          <option value="cover">Cover (yes/no)</option>
        </select>
        <input v-model="filterTextInput" placeholder="Filter query…" @keydown.enter="applyFilter" />
        <button type="button" :disabled="busy" @click="applyFilter">Apply filter</button>
      </div>
      <div class="toolbarActions">
        <button type="button" :disabled="busy" @click="runTask(refresh)">Refresh</button>
        <button type="button" class="btnPrimary" :disabled="busy" @click="openCreate">Create</button>
      </div>
    </div>
    <p class="muted tableHint">Filter and sort apply to the <strong>current page</strong> from the server ({{ displayAlbums.length }} / {{ albums.length }} rows shown).</p>

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
          <th class="sortable" @click="toggleSort('positive_rating')">Rating {{ sortLabel('positive_rating') }}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in displayAlbums" :key="a.id">
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
            <span v-if="a.preview_url" class="thumb-wrap">
              <img class="thumb" :class="`thumb-${previewSize}`" :src="a.preview_url" :alt="a.name" loading="lazy" />
              <img class="thumb-full" :src="a.preview_url" :alt="a.name" loading="lazy" />
            </span>
            <div v-else class="thumb-placeholder" :class="`thumb-${previewSize}`">empty</div>
          </td>
          <td>
            <input v-if="editingAlbumId === a.id" v-model="editingAlbumName" />
            <span v-else>{{ a.name }}</span>
          </td>
          <td>{{ a.positive_rating ?? 0 }}</td>
          <td class="actions">
            <template v-if="editingAlbumId === a.id">
              <button :disabled="busy" @click="runTask(() => onUpdate(a.id))">Save</button>
              <button type="button" @click="editingAlbumId = null">Cancel</button>
            </template>
            <template v-else>
              <button type="button" @click="editingAlbumId = a.id; editingAlbumName = a.name">Edit</button>
              <button type="button" :disabled="busy" @click="runTask(() => onDelete(a.id))">Delete</button>
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
          <div class="modalActions">
            <button type="button" @click="createOpen = false">Cancel</button>
            <button type="button" class="btnPrimary" :disabled="busy || !newAlbumName.trim()" @click="runTask(onCreate)">Create</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
