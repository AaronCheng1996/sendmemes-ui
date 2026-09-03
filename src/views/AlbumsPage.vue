<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { Album, AlbumSendMode, Image } from '../types/admin'
import { createAlbum, deleteAlbum, listAlbumMedia, listAlbums, sendAlbumTest, updateAlbum } from '../services/adminApi'
import { useJobs } from '../composables/useJobs'
import { useAsyncTask } from '../composables/useAsyncTask'
import { useToast } from '../composables/useToast'
import { usePageSize } from '../composables/usePageSize'
import { usePreviewSize } from '../composables/usePreviewSize'
import MediaStrip from '../components/MediaStrip.vue'
import Pagination from '../components/Pagination.vue'
import ThumbPreview from '../components/ThumbPreview.vue'
import { formatAbsolute, formatRelative } from '../utils/time'

const router = useRouter()
const { pushToast } = useToast()
const { busy, runTask } = useAsyncTask()
const { start: startJobs } = useJobs()
const albums = ref<Album[]>([])
const total = ref(0)
const offset = ref(0)
const limit = usePageSize('sendmemes_ui_albums_page_size', 10)
const { previewSize } = usePreviewSize()

type AlbumSortKey = 'updated' | 'name' | 'positive_rating' | 'cover' | 'media_count'
// Newest activity first: the albums that just gained files are the ones worth
// looking at, and an id column told nobody anything.
const sortKey = ref<AlbumSortKey>('updated')
const sortDir = ref<'asc' | 'desc'>('desc')

// Expanded rows and the first few files each holds, fetched on first expand.
const expanded = ref<Set<number>>(new Set())
const media = ref<Record<number, Image[]>>({})
const loadingMedia = ref<Set<number>>(new Set())

async function toggleExpand(a: Album) {
  const next = new Set(expanded.value)
  if (next.delete(a.id)) {
    expanded.value = next
    return
  }
  next.add(a.id)
  expanded.value = next
  if (media.value[a.id] || loadingMedia.value.has(a.id)) return

  loadingMedia.value = new Set(loadingMedia.value).add(a.id)
  try {
    // Six is what the strip shows. The endpoint puts the cover first and
    // resolves preview URLs, which is what makes the thumbnails load at all.
    media.value = { ...media.value, [a.id]: await listAlbumMedia(a.id, 6) }
  } catch {
    media.value = { ...media.value, [a.id]: [] }
  } finally {
    const done = new Set(loadingMedia.value)
    done.delete(a.id)
    loadingMedia.value = done
  }
}

type AlbumFilterField = 'all' | 'id' | 'name' | 'positive_rating' | 'cover'
const filterFieldInput = ref<AlbumFilterField>('all')
const filterTextInput = ref('')
const filterField = ref<AlbumFilterField>('all')
const filterText = ref('')

// Albums whose source folder vanished are soft-deleted, not dropped, so they
// stay out of the way until someone asks to see them.
const includeMissing = ref(false)

const newAlbumName = ref('')
const newAlbumSendMode = ref<AlbumSendMode>('Random')
const newAlbumSendConfigJSON = ref('')
const createOpen = ref(false)
const editingAlbumId = ref<number | null>(null)
const editingAlbumName = ref('')
const editingAlbumSendMode = ref<AlbumSendMode>('Random')
const editingAlbumSendConfigJSON = ref('')

const SEND_CONFIG_HINT = 'JSON overrides: batch_size, include_cover, ordered, caption, nsfw. Leave empty for defaults.'
const configEditAlbum = ref<Album | null>(null)
const configEditJSON = ref('')
const configEditError = ref('')

function isValidJSON(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return true
  try {
    JSON.parse(trimmed)
    return true
  } catch {
    return false
  }
}

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
    includeMissing: includeMissing.value,
  })
  albums.value = page.items
  total.value = page.total
  offset.value = page.offset
  limit.value = page.limit
}

async function onCreate() {
  if (!newAlbumName.value.trim()) return
  if (!isValidJSON(newAlbumSendConfigJSON.value)) return
  await createAlbum({
    name: newAlbumName.value.trim(),
    send_mode: newAlbumSendMode.value,
    send_config_json: newAlbumSendConfigJSON.value,
  })
  pushToast('Album created', 'success')
  newAlbumName.value = ''
  newAlbumSendMode.value = 'Random'
  newAlbumSendConfigJSON.value = ''
  createOpen.value = false
  await refresh()
}

async function onUpdate(id: number) {
  if (!editingAlbumName.value.trim()) return
  await updateAlbum(id, {
    name: editingAlbumName.value.trim(),
    send_mode: editingAlbumSendMode.value,
    // Inline row editing only touches name/mode; carry the existing config
    // through untouched (edited separately via the Config modal).
    send_config_json: editingAlbumSendConfigJSON.value,
  })
  pushToast('Album updated', 'success')
  editingAlbumId.value = null
  editingAlbumName.value = ''
  editingAlbumSendMode.value = 'Random'
  editingAlbumSendConfigJSON.value = ''
  await refresh()
}

function openConfigEdit(a: Album) {
  configEditAlbum.value = a
  configEditJSON.value = a.send_config_json ?? ''
  configEditError.value = ''
}

async function onSaveConfig() {
  const album = configEditAlbum.value
  if (!album) return
  if (!isValidJSON(configEditJSON.value)) {
    configEditError.value = 'Not valid JSON.'
    return
  }
  await updateAlbum(album.id, {
    name: album.name,
    send_mode: album.send_mode,
    send_config_json: configEditJSON.value,
  })
  pushToast('Album config updated', 'success')
  configEditAlbum.value = null
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
  newAlbumSendConfigJSON.value = ''
  createOpen.value = true
}

function viewImages(albumId: number) {
  router.push({ path: '/images', query: { album_id: String(albumId) } })
}

function startEdit(a: Album) {
  editingAlbumId.value = a.id
  editingAlbumName.value = a.name
  editingAlbumSendMode.value = (a.send_mode as AlbumSendMode) ?? 'Random'
  editingAlbumSendConfigJSON.value = a.send_config_json ?? ''
}

watch([offset, limit, sortKey, sortDir, filterField, filterText, includeMissing], () => {
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
        <label class="toggleLabel" title="Albums whose source folder disappeared. They keep their rating and config, and come back on their own if the folder returns.">
          <input v-model="includeMissing" type="checkbox" @change="offset = 0" />
          Show missing
        </label>
        <button type="button" class="btnCompact" :disabled="busy" @click="runTask(refresh)">Refresh</button>
        <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="openCreate">Create</button>
      </div>
    </div>
    <div class="progressBar" :class="{ progressBarActive: busy }" role="progressbar" aria-label="Working" :aria-busy="busy"></div>
    <p class="muted tableHint">
      Filter and sort apply to <strong>all rows</strong> in the database; this table shows one page of results.
      Albums whose source folder disappeared are hidden unless <strong>Show missing</strong> is on.
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
          <th class="sortable" @click="toggleSort('updated')">Updated {{ sortLabel('updated') }}</th>
          <th>Cover</th>
          <th v-if="previewSize !== 'off'">Preview</th>
          <th class="sortable nameCol" @click="toggleSort('name')">Name {{ sortLabel('name') }}</th>
          <th class="sortable" @click="toggleSort('media_count')">Count {{ sortLabel('media_count') }}</th>
          <th>Send mode</th>
          <th class="sortable" @click="toggleSort('positive_rating')">Rating {{ sortLabel('positive_rating') }}</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="a in albums" :key="a.id">
        <tr :class="{ rowOpen: expanded.has(a.id) }">
          <td class="rowClickable updatedCell" data-label="Updated" :title="a.updated_at ? formatAbsolute(a.updated_at) : ''" @click="toggleExpand(a)">
            <span class="rowCaret">{{ expanded.has(a.id) ? '▾' : '▸' }}</span>
            {{ a.updated_at ? formatRelative(a.updated_at) : '-' }}
          </td>
          <td data-label="Cover">
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
          <td v-if="previewSize !== 'off'" data-label="Preview">
            <ThumbPreview :src="a.preview_url" :alt="a.name" :size="previewSize" placeholder="empty" />
          </td>
          <td class="nameCol" data-label="Name">
            <input v-if="editingAlbumId === a.id" v-model="editingAlbumName" class="inputInlineEdit" />
            <template v-else>
              <span class="nameText" :title="a.name">{{ a.name }}</span>
              <span
                v-if="a.missing_since"
                class="missingBadge"
                :title="`Source folder not found since ${formatAbsolute(a.missing_since)} — its files are retired with it, and both come back if the folder reappears`"
              >missing</span>
            </template>
          </td>
          <td class="countCell" data-label="Count">{{ a.media_count ?? 0 }}</td>
          <td data-label="Send mode">
            <select v-if="editingAlbumId === a.id" v-model="editingAlbumSendMode" class="selectCompact sendModeSelect">
              <option value="Order">Order</option>
              <option value="Random">Random</option>
              <option value="Single">Single</option>
              <option value="Video">Video</option>
              <option value="Custom">Custom</option>
            </select>
            <span v-else>{{ a.send_mode }}</span>
          </td>
          <td data-label="Rating">{{ a.positive_rating ?? 0 }}</td>
          <td class="actions" data-label="Actions">
            <template v-if="editingAlbumId === a.id">
              <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="runTask(() => onUpdate(a.id))">Save</button>
              <button type="button" class="btnCompact" @click="editingAlbumId = null">Cancel</button>
            </template>
            <template v-else>
              <button type="button" class="btnCompact" @click="viewImages(a.id)">View images</button>
              <button type="button" class="btnCompact" @click="startEdit(a)">Edit</button>
              <button type="button" class="btnCompact" title="Edit send_config_json (batch size, cover, order, caption, NSFW)" @click="openConfigEdit(a)">Config</button>
              <button type="button" class="btnCompact" title="Send a test message to the schedule channel (caption [TEST] …)" :disabled="busy" @click="runTask(() => onSendTest(a.id))">Send test</button>
              <button type="button" class="btnCompact btnDanger" :disabled="busy" @click="runTask(() => onDelete(a.id))">Delete</button>
            </template>
          </td>
        </tr>
        <tr v-if="expanded.has(a.id)" :key="`${a.id}-detail`" class="rowDetail">
          <td :colspan="previewSize !== 'off' ? 8 : 7">
            <p v-if="loadingMedia.has(a.id)" class="detailNote">Loading files…</p>
            <MediaStrip
              v-else-if="(media[a.id] ?? []).length"
              :items="media[a.id]"
              :total="a.media_count ?? 0"
              cover-first
            />
            <p v-else class="detailNote">This album holds no files.</p>
          </td>
        </tr>
        </template>
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
          <label class="modalField">
            Send config (optional)
            <textarea v-model="newAlbumSendConfigJSON" rows="3" class="configTextarea" placeholder='{"batch_size": 5, "ordered": true}'></textarea>
            <span class="mutedInline">{{ SEND_CONFIG_HINT }}</span>
            <span v-if="!isValidJSON(newAlbumSendConfigJSON)" class="configError">Not valid JSON.</span>
          </label>
          <div class="modalActions">
            <button type="button" @click="createOpen = false">Cancel</button>
            <button type="button" class="btnPrimary" :disabled="busy || !newAlbumName.trim() || !isValidJSON(newAlbumSendConfigJSON)" @click="runTask(onCreate)">Create</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="configEditAlbum" class="modalBackdrop" @click.self="configEditAlbum = null">
        <div class="modalPanel" role="dialog" aria-modal="true" aria-labelledby="configEditTitle">
          <h3 id="configEditTitle" class="modalTitle">Send config — {{ configEditAlbum.name }}</h3>
          <label class="modalField">
            send_config_json
            <textarea v-model="configEditJSON" rows="6" class="configTextarea" placeholder='{"batch_size": 5, "ordered": true}'></textarea>
            <span class="mutedInline">{{ SEND_CONFIG_HINT }}</span>
            <span v-if="configEditError" class="configError">{{ configEditError }}</span>
          </label>
          <div class="modalActions">
            <button type="button" @click="configEditAlbum = null">Cancel</button>
            <button type="button" class="btnPrimary" :disabled="busy" @click="runTask(onSaveConfig)">Save</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
/* Five buttons wrapping to a second line made every row twice as tall. The
   shared .actions is a wrapping flex row, so this has to turn the wrap off —
   white-space alone does nothing to flex items. width:1% then lets the column
   shrink to exactly the buttons and hands the slack to Name. */
.actions {
  flex-wrap: nowrap;
  white-space: nowrap;
  width: 1%;
}

/* "10 minutes ago" is not worth two lines. */
.updatedCell {
  white-space: nowrap;
}

/* A long album name should not push Actions off the row. */
.nameCol {
  max-width: 16rem;
}

.nameText {
  display: inline-block;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.countCell {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.mutedInline {
  font-weight: 400;
  color: var(--text-muted);
  font-size: var(--fs-xs);
}

.sendModeSelect {
  min-width: 7rem;
  max-width: 100%;
}

.configTextarea {
  font-family: monospace;
  font-size: var(--fs-sm);
  resize: vertical;
}

.configError {
  color: var(--danger-text);
  font-size: var(--fs-xs);
}
</style>
