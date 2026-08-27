<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { DeliveryRule, MessageStyle, TriggerType } from '../types/admin'
import { createRule, deleteRule, listRules, testRule, updateRule } from '../services/adminApi'
import { useAsyncTask } from '../composables/useAsyncTask'
import { useJobs } from '../composables/useJobs'
import { useToast } from '../composables/useToast'
import { formatAbsolute, formatRelative } from '../utils/time'
import PlaceholderHint from '../components/PlaceholderHint.vue'

const TRIGGERS: TriggerType[] = ['scheduled', 'new_album', 'new_files']

type RuleDraft = {
  name: string
  guild_id: string
  trigger_type: TriggerType
  channel_id: string
  send_interval: string
  history_size: number
  enabled: boolean
  /** Tri-state selects: inherit the layer below, or force on/off. */
  use_embed: Tri
  title: string
  body: string
  color: string
  footer: string
  author: string
  url: string
  show_image: Tri
  show_thumbnail: Tri
  show_timestamp: Tri
}

/** Every optional flag is a tri-state so "inherit" stays distinct from "off". */
type Tri = 'inherit' | 'on' | 'off'

function triToApi(v: Tri): boolean | null {
  if (v === 'on') return true
  if (v === 'off') return false
  return null
}

function triFromApi(v: boolean | null | undefined): Tri {
  if (v === true) return 'on'
  if (v === false) return 'off'
  return 'inherit'
}

/** Builds the API payload, dropping empty fields so they keep inheriting. */
function draftToStyle(d: RuleDraft): MessageStyle {
  return {
    use_embed: triToApi(d.use_embed),
    title: d.title,
    body: d.body,
    color: d.color,
    footer: d.footer,
    author: d.author,
    url: d.url,
    show_image: triToApi(d.show_image),
    show_thumbnail: triToApi(d.show_thumbnail),
    show_timestamp: triToApi(d.show_timestamp),
  }
}

function blankDraft(): RuleDraft {
  return {
    name: '',
    guild_id: '',
    trigger_type: 'scheduled',
    channel_id: '',
    send_interval: '6h',
    history_size: 10,
    enabled: true,
    use_embed: 'inherit',
    title: '',
    body: '',
    color: '',
    footer: '',
    author: '',
    url: '',
    show_image: 'inherit',
    show_thumbnail: 'inherit',
    show_timestamp: 'inherit',
  }
}

function toDraft(r: DeliveryRule): RuleDraft {
  return {
    name: r.name,
    guild_id: r.guild_id,
    trigger_type: r.trigger_type,
    channel_id: r.channel_id,
    send_interval: r.send_interval ?? '',
    history_size: r.history_size,
    enabled: r.enabled,
    use_embed: triFromApi(r.message_style?.use_embed),
    title: r.message_style?.title ?? '',
    body: r.message_style?.body ?? '',
    color: r.message_style?.color ?? '',
    footer: r.message_style?.footer ?? '',
    author: r.message_style?.author ?? '',
    url: r.message_style?.url ?? '',
    show_image: triFromApi(r.message_style?.show_image),
    show_thumbnail: triFromApi(r.message_style?.show_thumbnail),
    show_timestamp: triFromApi(r.message_style?.show_timestamp),
  }
}

const { pushToast } = useToast()
const { start: startJobs } = useJobs()
const { busy, runTask } = useAsyncTask()
const rules = ref<DeliveryRule[]>([])

const createOpen = ref(false)
const draft = ref<RuleDraft>(blankDraft())
const editingId = ref<number | null>(null)
const editDraft = ref<RuleDraft>(blankDraft())

async function refresh() {
  rules.value = await listRules()
}

async function onCreate() {
  await createRule({ ...draft.value, message_style: draftToStyle(draft.value) })
  createOpen.value = false
  draft.value = blankDraft()
  await refresh()
  pushToast('Rule created', 'success')
}

function startEdit(r: DeliveryRule) {
  editingId.value = r.id
  editDraft.value = toDraft(r)
}

// Server-computed schedule_description/next_run_at for the rule currently
// being edited (not re-derived client-side as the interval text changes —
// the preview reflects what's saved, matching the read-only Next column).
function editingRule(): DeliveryRule | undefined {
  return rules.value.find((r) => r.id === editingId.value)
}

async function onUpdate(id: number) {
  await updateRule(id, { ...editDraft.value, message_style: draftToStyle(editDraft.value) })
  editingId.value = null
  await refresh()
  pushToast('Rule updated', 'success')
}

async function onTest(r: DeliveryRule) {
  await testRule(r.id)
  pushToast('Rule preview queued — running in the background', 'info')
  startJobs()
}

async function onDelete(id: number) {
  await deleteRule(id)
  await refresh()
  pushToast('Rule deleted', 'success')
}

async function onToggle(r: DeliveryRule) {
  await updateRule(r.id, { ...toDraft(r), enabled: !r.enabled, message_style: draftToStyle(toDraft(r)) })
  await refresh()
}

onMounted(() => runTask(refresh))
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2 class="toolbarTitle">Delivery Rules</h2>
      <div class="toolbarActions">
        <button type="button" class="btnCompact" :disabled="busy" @click="runTask(refresh)">Refresh</button>
        <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="createOpen = !createOpen">New rule</button>
      </div>
    </div>
    <p class="muted tableHint">
      Rules drive scheduled album sends (<code>scheduled</code>) and "new content" posts
      (<code>new_album</code> / <code>new_files</code>). Edits take effect within ~30s.
    </p>

    <div class="progressBar" :class="{ progressBarActive: busy }" role="progressbar" aria-label="Working" :aria-busy="busy"></div>

    <div v-if="createOpen" class="panel createBox">
      <div class="grid2">
        <label class="modalField">Name <input v-model="draft.name" placeholder="optional label" /></label>
        <label class="modalField">
          Trigger
          <select v-model="draft.trigger_type" class="selectCompact">
            <option v-for="t in TRIGGERS" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
        <label class="modalField">Channel ID <input v-model="draft.channel_id" placeholder="target channel id" /></label>
        <label class="modalField">Guild ID <input v-model="draft.guild_id" placeholder="optional" /></label>
        <label v-if="draft.trigger_type === 'scheduled'" class="modalField">Interval <input v-model="draft.send_interval" placeholder="e.g. 6h or 0 9 * * *" /></label>
        <label v-if="draft.trigger_type === 'scheduled'" class="modalField">History size <input v-model.number="draft.history_size" type="number" /></label>
      </div>
      <div class="grid2">
        <label class="modalField">
          Message style
          <select v-model="draft.use_embed" class="selectCompact">
            <option value="inherit">Inherit app default</option>
            <option value="on">Embed</option>
            <option value="off">Plain text</option>
          </select>
        </label>
        <label class="modalField">
          Title (optional)
          <input v-model="draft.title" placeholder="e.g. 📢 {album}" />
        </label>
      </div>
      <label class="modalField">
        Body (optional)
        <textarea v-model="draft.body" rows="2" placeholder="e.g. {album} — {shown} of {album_total}, rated {rating}"></textarea>
      </label>
      <details v-if="draft.use_embed !== 'off'" class="embedOptions">
        <summary>Embed options</summary>
        <div class="grid2">
          <label class="modalField">Color <input v-model="draft.color" placeholder="#5390ff" /></label>
          <label class="modalField">Link URL <input v-model="draft.url" placeholder="https://…" /></label>
          <label class="modalField">Footer <input v-model="draft.footer" placeholder="default: album #12 · Random" /></label>
          <label class="modalField">Author <input v-model="draft.author" placeholder="small line above the title" /></label>
          <label class="modalField">
            Large image
            <select v-model="draft.show_image" class="selectCompact">
              <option value="inherit">Inherit</option>
              <option value="on">Show</option>
              <option value="off">Hide</option>
            </select>
          </label>
          <label class="modalField">
            Thumbnail
            <select v-model="draft.show_thumbnail" class="selectCompact">
              <option value="inherit">Inherit</option>
              <option value="on">Show</option>
              <option value="off">Hide</option>
            </select>
          </label>
          <label class="modalField">
            Timestamp
            <select v-model="draft.show_timestamp" class="selectCompact">
              <option value="inherit">Inherit</option>
              <option value="on">Show</option>
              <option value="off">Hide</option>
            </select>
          </label>
        </div>
      </details>
      <PlaceholderHint :trigger="draft.trigger_type" />
      <p class="muted captionHint">
        Empty fields inherit the app defaults; an album's own config overrides both.
      </p>
      <div class="modalActions">
        <button type="button" class="btnCompact" @click="createOpen = false">Cancel</button>
        <button type="button" class="btnCompact btnPrimary" :disabled="busy || !draft.channel_id.trim()" @click="runTask(onCreate)">Create</button>
      </div>
    </div>

    <table class="tableResponsive">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Trigger</th>
          <th>Channel</th>
          <th>Interval</th>
          <th>Next</th>
          <th>History</th>
          <th>Enabled</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rules" :key="r.id">
          <td data-label="ID">{{ r.id }}</td>
          <template v-if="editingId === r.id">
            <td data-label="Name"><input v-model="editDraft.name" class="inputInlineEdit" /></td>
            <td data-label="Trigger">
              <select v-model="editDraft.trigger_type" class="selectCompact">
                <option v-for="t in TRIGGERS" :key="t" :value="t">{{ t }}</option>
              </select>
            </td>
            <td data-label="Channel"><input v-model="editDraft.channel_id" class="inputInlineEdit" /></td>
            <td data-label="Interval">
              <input v-model="editDraft.send_interval" class="inputInlineEdit" placeholder="e.g. 6h or 0 9 * * *" :disabled="editDraft.trigger_type !== 'scheduled'" />
              <p v-if="editDraft.trigger_type === 'scheduled' && editingRule()?.schedule_description" class="scheduleHint">
                Currently: {{ editingRule()!.schedule_description }}
                <span v-if="editingRule()!.next_run_at">— next {{ formatRelative(editingRule()!.next_run_at as string) }}</span>
              </p>
              <select v-model="editDraft.use_embed" class="selectCompact">
                <option value="inherit">Inherit style</option>
                <option value="on">Embed</option>
                <option value="off">Plain text</option>
              </select>
              <input
                v-model="editDraft.title"
                class="inputInlineEdit"
                placeholder="Title (optional), e.g. 📢 {album}"
              />
              <textarea
                v-model="editDraft.body"
                class="inputInlineEdit captionTextarea"
                rows="2"
                placeholder="Body (optional), e.g. {album} — {shown}/{album_total}"
              ></textarea>
              <details v-if="editDraft.use_embed !== 'off'" class="embedOptions">
                <summary>Embed options</summary>
                <input v-model="editDraft.color" class="inputInlineEdit" placeholder="Color, e.g. #5390ff" />
                <input v-model="editDraft.footer" class="inputInlineEdit" placeholder="Footer (optional)" />
                <input v-model="editDraft.author" class="inputInlineEdit" placeholder="Author (optional)" />
                <input v-model="editDraft.url" class="inputInlineEdit" placeholder="Link URL (optional)" />
                <select v-model="editDraft.show_image" class="selectCompact">
                  <option value="inherit">Image: inherit</option>
                  <option value="on">Image: show</option>
                  <option value="off">Image: hide</option>
                </select>
                <select v-model="editDraft.show_thumbnail" class="selectCompact">
                  <option value="inherit">Thumbnail: inherit</option>
                  <option value="on">Thumbnail: show</option>
                  <option value="off">Thumbnail: hide</option>
                </select>
                <select v-model="editDraft.show_timestamp" class="selectCompact">
                  <option value="inherit">Timestamp: inherit</option>
                  <option value="on">Timestamp: show</option>
                  <option value="off">Timestamp: hide</option>
                </select>
              </details>
              <PlaceholderHint :trigger="editDraft.trigger_type" />
            </td>
            <td data-label="Next">-</td>
            <td data-label="History"><input v-model.number="editDraft.history_size" type="number" class="inputInlineEdit" :disabled="editDraft.trigger_type !== 'scheduled'" /></td>
            <td data-label="Enabled"><input v-model="editDraft.enabled" type="checkbox" /></td>
            <td class="actions" data-label="Actions">
              <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="runTask(() => onUpdate(r.id))">Save</button>
              <button type="button" class="btnCompact" @click="editingId = null">Cancel</button>
            </td>
          </template>
          <template v-else>
            <td data-label="Name">{{ r.name || '-' }}</td>
            <td data-label="Trigger">{{ r.trigger_type }}</td>
            <td class="channelCell" data-label="Channel">{{ r.channel_id }}</td>
            <td data-label="Interval">{{ r.trigger_type === 'scheduled' ? (r.schedule_description || r.send_interval) : '-' }}</td>
            <td data-label="Next">
              <span v-if="r.next_run_at" :title="formatAbsolute(r.next_run_at)">{{ formatRelative(r.next_run_at) }}</span>
              <span v-else>-</span>
            </td>
            <td data-label="History">{{ r.trigger_type === 'scheduled' ? r.history_size : '-' }}</td>
            <td data-label="Enabled">
              <button type="button" class="btnCompact" :disabled="busy" @click="runTask(() => onToggle(r))">
                {{ r.enabled ? 'on' : 'off' }}
              </button>
            </td>
            <td class="actions" data-label="Actions">
              <button type="button" class="btnCompact" :disabled="busy" title="Post a preview styled by this rule" @click="runTask(() => onTest(r))">Test</button>
              <button type="button" class="btnCompact" @click="startEdit(r)">Edit</button>
              <button type="button" class="btnCompact btnDanger" :disabled="busy" @click="runTask(() => onDelete(r.id))">Delete</button>
            </td>
          </template>
        </tr>
        <tr v-if="!busy && rules.length === 0">
          <td colspan="9" class="muted">No delivery rules yet. Create one to start scheduling or notifications.</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.createBox {
  margin-bottom: var(--sp-5);
}

.embedOptions {
  margin-bottom: var(--sp-4);
  font-size: var(--fs-md);
}

.embedOptions summary {
  cursor: pointer;
  color: var(--text-label);
  margin-bottom: var(--sp-2);
}

.channelCell {
  font-variant-numeric: tabular-nums;
}

.scheduleHint {
  margin: var(--sp-2) 0 0;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

.captionTextarea {
  display: block;
  width: 100%;
  margin-top: var(--sp-2);
  resize: vertical;
}

.captionHint {
  margin: var(--sp-2) 0 0;
  font-size: var(--fs-xs);
}

.captionHint code {
  font-size: var(--fs-xs);
}
</style>
