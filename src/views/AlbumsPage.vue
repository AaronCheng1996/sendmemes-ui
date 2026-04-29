<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

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

const newAlbumName = ref('')
const editingAlbumId = ref<number | null>(null)
const editingAlbumName = ref('')

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

watch([offset, limit], () => {
  runTask(refresh)
})

onMounted(() => runTask(refresh))
</script>

<template>
  <section class="panel">
    <div class="row">
      <h2>Albums</h2>
      <button :disabled="busy" @click="runTask(refresh)">Refresh</button>
    </div>
    <div class="row">
      <input v-model="newAlbumName" placeholder="New album name" />
      <button :disabled="busy" @click="runTask(onCreate)">Create</button>
    </div>

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
          <th>ID</th>
          <th>Cover</th>
          <th v-if="previewSize !== 'off'">Preview</th>
          <th>Name</th>
          <th>Rating</th>
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
              <button @click="editingAlbumId = null">Cancel</button>
            </template>
            <template v-else>
              <button @click="editingAlbumId = a.id; editingAlbumName = a.name">Edit</button>
              <button :disabled="busy" @click="runTask(() => onDelete(a.id))">Delete</button>
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
  </section>
</template>
