<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { DeliveryRule, TriggerType } from '../types/admin'
import { createRule, deleteRule, listRules, updateRule } from '../services/adminApi'
import { useAsyncTask } from '../composables/useAsyncTask'
import { useToast } from '../composables/useToast'
import { formatAbsolute, formatRelative } from '../utils/time'

const TRIGGERS: TriggerType[] = ['scheduled', 'new_album', 'new_files']

type RuleDraft = {
  name: string
  guild_id: string
  trigger_type: TriggerType
  channel_id: string
  send_interval: string
  history_size: number
  enabled: boolean
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
  }
}

const { pushToast } = useToast()
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
  await createRule({ ...draft.value })
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
  await updateRule(id, { ...editDraft.value })
  editingId.value = null
  await refresh()
  pushToast('Rule updated', 'success')
}

async function onDelete(id: number) {
  await deleteRule(id)
  await refresh()
  pushToast('Rule deleted', 'success')
}

async function onToggle(r: DeliveryRule) {
  await updateRule(r.id, { ...toDraft(r), enabled: !r.enabled })
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
  margin-bottom: 0.8rem;
}

.channelCell {
  font-variant-numeric: tabular-nums;
}

.scheduleHint {
  margin: 0.3rem 0 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}
</style>
