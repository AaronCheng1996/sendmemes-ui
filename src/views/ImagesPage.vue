<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { Image } from '../types/admin'
import { createImage, deleteImage, listImages, updateImage } from '../services/adminApi'
import { useToast } from '../composables/useToast'

const busy = ref(false)
const { pushToast } = useToast()
const images = ref<Image[]>([])
const albumFilter = ref('')

const newImage = ref({
  url: '',
  source: '',
  guild_id: '',
  album_id: '',
  file_id: '',
})

const editingImageId = ref<number | null>(null)
const editingImage = ref({
  url: '',
  source: '',
  guild_id: '',
  album_id: '',
  file_id: '',
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
  images.value = await listImages(albumFilter.value)
}

async function onCreate() {
  await createImage(newImage.value)
  pushToast('Image created', 'success')
  newImage.value = { url: '', source: '', guild_id: '', album_id: '', file_id: '' }
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

onMounted(() => runTask(refresh))
</script>

<template>
  <section class="panel">
    <div class="row">
      <h2>Images</h2>
      <input v-model="albumFilter" placeholder="album_id filter" />
      <button :disabled="busy" @click="runTask(refresh)">Refresh</button>
    </div>

    <div class="grid5">
      <input v-model="newImage.url" placeholder="url" />
      <input v-model="newImage.source" placeholder="source" />
      <input v-model="newImage.guild_id" placeholder="guild_id" />
      <input v-model="newImage.album_id" placeholder="album_id" />
      <input v-model="newImage.file_id" placeholder="file_id" />
    </div>
    <div class="row">
      <button :disabled="busy" @click="runTask(onCreate)">Create Image</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>URL</th>
          <th>source</th>
          <th>guild_id</th>
          <th>album_id</th>
          <th>file_id</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="img in images" :key="img.id">
          <td>{{ img.id }}</td>
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
              <button @click="editingImageId = null">Cancel</button>
            </template>
            <template v-else>
              <button
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
              <button :disabled="busy" @click="runTask(() => onDelete(img.id))">Delete</button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="busy" class="status">Working...</p>
  </section>
</template>
