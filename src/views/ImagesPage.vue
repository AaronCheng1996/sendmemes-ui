<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import type { Image } from '../types/admin'
import { createImage, deleteImage, listImages, updateImage } from '../services/adminApi'
import { useToast } from '../composables/useToast'
import { usePageSize } from '../composables/usePageSize'
import { usePreviewSize } from '../composables/usePreviewSize'
import Pagination from '../components/Pagination.vue'

const busy = ref(false)
const { pushToast } = useToast()
const images = ref<Image[]>([])
const total = ref(0)
const offset = ref(0)
const limit = usePageSize('sendmemes_ui_images_page_size', 10)
const { previewSize } = usePreviewSize()

/** Passed to list API (server-side album scope). */
const apiAlbumIdInput = ref('')
const apiAlbumId = ref('')

type ImageSortKey = 'id' | 'album_id' | 'url' | 'source' | 'guild_id' | 'file_id'
const sortKey = ref<ImageSortKey>('id')
const sortDir = ref<'asc' | 'desc'>('asc')

type ImageFilterField = 'all' | 'id' | 'album_id' | 'url' | 'source' | 'guild_id' | 'file_id'
const filterFieldInput = ref<ImageFilterField>('all')
const filterTextInput = ref('')
const filterField = ref<ImageFilterField>('all')
const filterText = ref('')

const newImage = ref({
  url: '',
  source: '',
  guild_id: '',
  album_id: '',
  file_id: '',
})
const createOpen = ref(false)

const editingImageId = ref<number | null>(null)
const editingImage = ref({
  url: '',
  source: '',
  guild_id: '',
  album_id: '',
  file_id: '',
})

function applyFilters() {
  apiAlbumId.value = apiAlbumIdInput.value.trim()
  filterField.value = filterFieldInput.value
  filterText.value = filterTextInput.value
  offset.value = 0
  runTask(refresh)
}

function toggleSort(key: ImageSortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortLabel(key: ImageSortKey) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? '↑' : '↓'
}

const displayImages = computed(() => {
  let rows = [...images.value]
  const q = filterText.value.trim().toLowerCase()
  if (q) {
    rows = rows.filter((img) => {
      switch (filterField.value) {
        case 'id':
          return String(img.id).includes(q)
        case 'album_id':
          return String(img.album_id ?? '').includes(q)
        case 'url':
          return (img.url || '').toLowerCase().includes(q)
        case 'source':
          return (img.source || '').toLowerCase().includes(q)
        case 'guild_id':
          return (img.guild_id || '').toLowerCase().includes(q)
        case 'file_id':
          return String(img.file_id ?? '').includes(q)
        case 'all':
        default:
          return (
            String(img.id).includes(q) ||
            String(img.album_id ?? '').includes(q) ||
            (img.url || '').toLowerCase().includes(q) ||
            (img.source || '').toLowerCase().includes(q) ||
            (img.guild_id || '').toLowerCase().includes(q) ||
            String(img.file_id ?? '').includes(q)
          )
      }
    })
  }
  const dir = sortDir.value === 'asc' ? 1 : -1
  rows.sort((a, b) => {
    const av = (k: ImageSortKey) => {
      switch (k) {
        case 'id':
          return a.id
        case 'album_id':
          return a.album_id ?? 0
        case 'file_id':
          return a.file_id ?? 0
        default:
          return (a[k] as string) || ''
      }
    }
    const bv = (k: ImageSortKey) => {
      switch (k) {
        case 'id':
          return b.id
        case 'album_id':
          return b.album_id ?? 0
        case 'file_id':
          return b.file_id ?? 0
        default:
          return (b[k] as string) || ''
      }
    }
    const ka = av(sortKey.value)
    const kb = bv(sortKey.value)
    if (typeof ka === 'number' && typeof kb === 'number') {
      return (ka - kb) * dir
    }
    return String(ka).localeCompare(String(kb), undefined, { sensitivity: 'base' }) * dir
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
  const page = await listImages(apiAlbumId.value, offset.value, limit.value)
  images.value = page.items
  total.value = page.total
  offset.value = page.offset
  limit.value = page.limit
}

async function onCreate() {
  await createImage(newImage.value)
  pushToast('Image created', 'success')
  newImage.value = { url: '', source: '', guild_id: '', album_id: '', file_id: '' }
  createOpen.value = false
  await refresh()
}

async function onUpdate(id: number) {
  await updateImage(id, editingImage.value)
  pushToast('Image updated', 'success')
  editingImageId.value = null
  editingImage.value = { url: '', source: '', guild_id: '', album_id: '', file_id: '' }
  await refresh()
}

async function onDelete(id: number) {
  if (!window.confirm(`Delete image ${id}?`)) return
  await deleteImage(id)
  pushToast('Image deleted', 'success')
  await refresh()
}

function openCreate() {
  newImage.value = { url: '', source: '', guild_id: '', album_id: '', file_id: '' }
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
      <h2 class="toolbarTitle">Images</h2>
      <div class="toolbarFilters toolbarFiltersWide">
        <label class="toolbarLabel">
          Album ID (API scope)
          <input v-model="apiAlbumIdInput" placeholder="optional" title="Restrict list to this album on the server" @keydown.enter="applyFilters" />
        </label>
        <select v-model="filterFieldInput" title="Filter column (current page)">
          <option value="all">All fields</option>
          <option value="id">ID</option>
          <option value="album_id">Album ID</option>
          <option value="url">URL</option>
          <option value="source">Source</option>
          <option value="guild_id">Guild ID</option>
          <option value="file_id">File ID</option>
        </select>
        <input v-model="filterTextInput" placeholder="Filter query…" @keydown.enter="applyFilters" />
        <button type="button" :disabled="busy" @click="applyFilters">Apply</button>
      </div>
      <div class="toolbarActions">
        <button type="button" :disabled="busy" @click="runTask(refresh)">Refresh</button>
        <button type="button" class="btnPrimary" :disabled="busy" @click="openCreate">Create</button>
      </div>
    </div>
    <p class="muted tableHint">
      Album ID scopes the request to the server; other filters refine the <strong>current page</strong> ({{ displayImages.length }} / {{ images.length }} rows).
    </p>

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
          <th v-if="previewSize !== 'off'">Preview</th>
          <th class="sortable" @click="toggleSort('url')">URL {{ sortLabel('url') }}</th>
          <th class="sortable" @click="toggleSort('source')">source {{ sortLabel('source') }}</th>
          <th class="sortable" @click="toggleSort('guild_id')">guild_id {{ sortLabel('guild_id') }}</th>
          <th class="sortable" @click="toggleSort('album_id')">album_id {{ sortLabel('album_id') }}</th>
          <th class="sortable" @click="toggleSort('file_id')">file_id {{ sortLabel('file_id') }}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="img in displayImages" :key="img.id">
          <td>{{ img.id }}</td>
          <td v-if="previewSize !== 'off'">
            <span v-if="img.preview_url" class="thumb-wrap">
              <img class="thumb" :class="`thumb-${previewSize}`" :src="img.preview_url" :alt="img.url" loading="lazy" />
              <img class="thumb-full" :src="img.preview_url" :alt="img.url" loading="lazy" />
            </span>
            <div v-else class="thumb-placeholder" :class="`thumb-${previewSize}`">N/A</div>
          </td>
          <td class="urlCell">
            <input v-if="editingImageId === img.id" v-model="editingImage.url" />
            <span v-else>{{ img.url }}</span>
          </td>
          <td>
            <input v-if="editingImageId === img.id" v-model="editingImage.source" />
            <span v-else>{{ img.source || '-' }}</span>
          </td>
          <td>
            <input v-if="editingImageId === img.id" v-model="editingImage.guild_id" />
            <span v-else>{{ img.guild_id || '-' }}</span>
          </td>
          <td>
            <input v-if="editingImageId === img.id" v-model="editingImage.album_id" />
            <span v-else>{{ img.album_id || '-' }}</span>
          </td>
          <td>
            <input v-if="editingImageId === img.id" v-model="editingImage.file_id" />
            <span v-else>{{ img.file_id || '-' }}</span>
          </td>
          <td class="actions">
            <template v-if="editingImageId === img.id">
              <button :disabled="busy" @click="runTask(() => onUpdate(img.id))">Save</button>
              <button type="button" @click="editingImageId = null">Cancel</button>
            </template>
            <template v-else>
              <button
                type="button"
                @click="
                  editingImageId = img.id;
                  editingImage = {
                    url: img.url || '',
                    source: img.source || '',
                    guild_id: img.guild_id || '',
                    album_id: String(img.album_id || ''),
                    file_id: String(img.file_id || ''),
                  };
                "
              >
                Edit
              </button>
              <button type="button" :disabled="busy" @click="runTask(() => onDelete(img.id))">Delete</button>
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
        <div class="modalPanel modalPanelWide" role="dialog" aria-modal="true" aria-labelledby="createImageTitle">
          <h3 id="createImageTitle" class="modalTitle">New image</h3>
          <div class="modalGrid">
            <label class="modalField">
              URL
              <input v-model="newImage.url" placeholder="url" />
            </label>
            <label class="modalField">
              Source
              <input v-model="newImage.source" placeholder="source" />
            </label>
            <label class="modalField">
              Guild ID
              <input v-model="newImage.guild_id" placeholder="guild_id" />
            </label>
            <label class="modalField">
              Album ID
              <input v-model="newImage.album_id" placeholder="album_id" />
            </label>
            <label class="modalField">
              File ID
              <input v-model="newImage.file_id" placeholder="file_id" />
            </label>
          </div>
          <div class="modalActions">
            <button type="button" @click="createOpen = false">Cancel</button>
            <button type="button" class="btnPrimary" :disabled="busy || !newImage.url.trim()" @click="runTask(onCreate)">Create</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
