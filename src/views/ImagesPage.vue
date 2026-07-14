<script setup lang="ts">
import { ref, watch } from 'vue'

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
}

function toggleSort(key: ImageSortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
  offset.value = 0
}

function sortLabel(key: ImageSortKey) {
  if (sortKey.value !== key) return ''
  return sortDir.value === 'asc' ? '↑' : '↓'
}

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
  const page = await listImages({
    offset: offset.value,
    limit: limit.value,
    albumId: apiAlbumId.value || undefined,
    sortBy: sortKey.value,
    sortOrder: sortDir.value,
    filterField: filterField.value,
    filterQ: filterText.value,
  })
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

watch([offset, limit, sortKey, sortDir, filterField, filterText, apiAlbumId], () => {
  runTask(refresh)
}, { immediate: true })
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2 class="toolbarTitle">Images</h2>
      <div class="toolbarFilters toolbarFiltersWide">
        <label class="toolbarLabel">
          Album ID (API scope)
          <input v-model="apiAlbumIdInput" placeholder="optional" title="Restrict list to one album on the server" @keydown.enter="applyFilters" />
        </label>
        <select v-model="filterFieldInput" class="selectCompact" title="Filter column">
          <option value="all">All fields</option>
          <option value="id">ID</option>
          <option value="album_id">Album ID</option>
          <option value="url">URL</option>
          <option value="source">Source</option>
          <option value="guild_id">Guild ID</option>
          <option value="file_id">File ID</option>
        </select>
        <input v-model="filterTextInput" class="inputGrow" placeholder="Filter query…" @keydown.enter="applyFilters" />
        <button type="button" class="btnCompact" :disabled="busy" @click="applyFilters">Apply</button>
      </div>
      <div class="toolbarActions">
        <button type="button" class="btnCompact" :disabled="busy" @click="runTask(refresh)">Refresh</button>
        <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="openCreate">Create</button>
      </div>
    </div>
    <p class="muted tableHint">
      Album ID limits rows to one album; filter and sort apply to <strong>all matching rows</strong> before pagination.
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
          <th>Kind</th>
          <th class="sortable" @click="toggleSort('source')">Source {{ sortLabel('source') }}</th>
          <th class="sortable" @click="toggleSort('guild_id')">Guild ID {{ sortLabel('guild_id') }}</th>
          <th class="sortable" @click="toggleSort('album_id')">Album ID {{ sortLabel('album_id') }}</th>
          <th class="sortable" @click="toggleSort('file_id')">File ID {{ sortLabel('file_id') }}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="img in images" :key="img.id">
          <td>{{ img.id }}</td>
          <td v-if="previewSize !== 'off'">
            <div v-if="img.kind === 'video'" class="thumb-placeholder" :class="`thumb-${previewSize}`" title="Video file">🎬</div>
            <span v-else-if="img.preview_url" class="thumb-wrap">
              <img class="thumb" :class="`thumb-${previewSize}`" :src="img.preview_url" :alt="img.url" loading="lazy" />
              <img class="thumb-full" :src="img.preview_url" :alt="img.url" loading="lazy" />
            </span>
            <div v-else class="thumb-placeholder" :class="`thumb-${previewSize}`">N/A</div>
          </td>
          <td class="urlCell">
            <input v-if="editingImageId === img.id" v-model="editingImage.url" class="inputInlineEdit wide" />
            <span v-else>{{ img.url }}</span>
          </td>
          <td>{{ img.kind }}</td>
          <td>
            <input v-if="editingImageId === img.id" v-model="editingImage.source" class="inputInlineEdit" />
            <span v-else>{{ img.source || '-' }}</span>
          </td>
          <td>
            <input v-if="editingImageId === img.id" v-model="editingImage.guild_id" class="inputInlineEdit" />
            <span v-else>{{ img.guild_id || '-' }}</span>
          </td>
          <td>
            <input v-if="editingImageId === img.id" v-model="editingImage.album_id" class="inputInlineEdit" />
            <span v-else>{{ img.album_id || '-' }}</span>
          </td>
          <td>
            <input v-if="editingImageId === img.id" v-model="editingImage.file_id" class="inputInlineEdit" />
            <span v-else>{{ img.file_id || '-' }}</span>
          </td>
          <td class="actions">
            <template v-if="editingImageId === img.id">
              <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="runTask(() => onUpdate(img.id))">Save</button>
              <button type="button" class="btnCompact" @click="editingImageId = null">Cancel</button>
            </template>
            <template v-else>
              <button
                type="button"
                class="btnCompact"
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
              >Edit</button>
              <button type="button" class="btnCompact btnDanger" :disabled="busy" @click="runTask(() => onDelete(img.id))">Delete</button>
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
