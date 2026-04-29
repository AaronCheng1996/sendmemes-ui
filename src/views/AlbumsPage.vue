<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { Album } from '../types/admin'
import { createAlbum, deleteAlbum, listAlbums, updateAlbum } from '../services/adminApi'
import { useToast } from '../composables/useToast'

const busy = ref(false)
const { pushToast } = useToast()
const albums = ref<Album[]>([])
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
  albums.value = await listAlbums()
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

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Cover</th>
          <th>Rating</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in albums" :key="a.id">
          <td>{{ a.id }}</td>
          <td>
            <input v-if="editingAlbumId === a.id" v-model="editingAlbumName" />
            <span v-else>{{ a.name }}</span>
          </td>
          <td>{{ a.has_cover ? 'Yes' : 'No' }}</td>
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

    <p v-if="busy" class="status">Working...</p>
  </section>
</template>
