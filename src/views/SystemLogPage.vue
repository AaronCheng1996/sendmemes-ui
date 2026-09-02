<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import Pagination from '../components/Pagination.vue'
import type { TaskRun } from '../types/admin'
import { listTaskRunSources, listTaskRuns } from '../services/adminApi'
import { useAsyncTask } from '../composables/useAsyncTask'
import { usePageSize } from '../composables/usePageSize'
import { formatAbsolute, formatRelative } from '../utils/time'

const { busy, runTask } = useAsyncTask()
const runs = ref<TaskRun[]>([])
const sources = ref<string[]>([])
const total = ref(0)
const offset = ref(0)
const limit = usePageSize('sendmemes_ui_runs_page_size', 20)

const sourceFilter = ref('')
const statusFilter = ref('')

// Which rows are expanded. One run is one line until someone asks for the rest,
// which is the whole point of the page.
const expanded = ref<Set<number>>(new Set())

function toggle(id: number) {
  const next = new Set(expanded.value)
  if (!next.delete(id)) next.add(id)
  expanded.value = next
}

function statusClass(status: string) {
  if (status === 'succeeded') return 'runOk'
  if (status === 'failed') return 'runFailed'
  return 'runRunning'
}

/** Elapsed time, or a running dash. */
function duration(run: TaskRun): string {
  if (!run.finished_at) return '—'
  const ms = new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${ms} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${Math.round(seconds % 60)}s`
}

function hasDetail(run: TaskRun): boolean {
  return Boolean(run.error) || Object.keys(run.detail ?? {}).length > 0
}

/** Detail as pretty JSON. Deliberately not rendered field by field — a run's
 *  payload is whatever its writer thought was worth keeping, crawler included. */
function detailText(run: TaskRun): string {
  return JSON.stringify(run.detail ?? {}, null, 2)
}

async function refresh() {
  const page = await listTaskRuns({
    offset: offset.value,
    limit: limit.value,
    source: sourceFilter.value,
    status: statusFilter.value,
  })
  runs.value = page.items
  total.value = page.total
  offset.value = page.offset
  limit.value = page.limit
}

async function refreshSources() {
  sources.value = await listTaskRunSources()
}

onMounted(() => runTask(async () => {
  await Promise.all([refresh(), refreshSources()])
}))

watch([offset, limit, sourceFilter, statusFilter], () => runTask(refresh))
watch([sourceFilter, statusFilter], () => (offset.value = 0))
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2 class="toolbarTitle">System log</h2>
      <div class="toolbarFilters">
        <select v-model="sourceFilter" class="selectCompact" title="Filter by source">
          <option value="">All sources</option>
          <option v-for="s in sources" :key="s" :value="s">{{ s }}</option>
        </select>
        <select v-model="statusFilter" class="selectCompact" title="Filter by status">
          <option value="">Any status</option>
          <option value="succeeded">succeeded</option>
          <option value="failed">failed</option>
          <option value="running">running</option>
        </select>
      </div>
      <div class="toolbarActions">
        <button type="button" class="btnCompact" :disabled="busy" @click="runTask(refresh)">Refresh</button>
      </div>
    </div>
    <div class="progressBar" :class="{ progressBarActive: busy }" role="progressbar" aria-label="Working" :aria-busy="busy"></div>
    <p class="muted tableHint">
      One row per run — a scheduled send, a sync, or anything reporting to <code>POST /v1/runs</code>.
      Click a row to expand what it did. Runs older than 30 days are pruned automatically.
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
          <th>Started</th>
          <th>Source</th>
          <th>Task</th>
          <th>Status</th>
          <th>Took</th>
          <th>Summary</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="run in runs" :key="run.id">
          <tr
            class="runRow"
            :class="{ runRowOpen: expanded.has(run.id), runRowClickable: hasDetail(run) }"
            @click="hasDetail(run) && toggle(run.id)"
          >
            <td data-label="Started" :title="formatAbsolute(run.started_at)">{{ formatRelative(run.started_at) }}</td>
            <td data-label="Source">{{ run.source }}</td>
            <td data-label="Task">{{ run.task || '-' }}</td>
            <td data-label="Status">
              <span class="eventBadge" :class="statusClass(run.status)">{{ run.status }}</span>
            </td>
            <td data-label="Took">{{ duration(run) }}</td>
            <td class="runSummary" data-label="Summary">
              <span v-if="hasDetail(run)" class="runCaret">{{ expanded.has(run.id) ? '▾' : '▸' }}</span>
              {{ run.summary || '-' }}
            </td>
          </tr>
          <tr v-if="expanded.has(run.id)" :key="`${run.id}-detail`" class="runDetailRow">
            <td colspan="6">
              <p v-if="run.error" class="runError">{{ run.error }}</p>
              <pre v-if="Object.keys(run.detail ?? {}).length" class="runDetail">{{ detailText(run) }}</pre>
            </td>
          </tr>
        </template>
        <tr v-if="!busy && runs.length === 0">
          <td colspan="6" class="muted">No runs recorded yet.</td>
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
  </section>
</template>

<style scoped>
.runRowClickable {
  cursor: pointer;
}

.runRowOpen {
  background: var(--row-hover);
}

.runCaret {
  display: inline-block;
  width: 1em;
  color: var(--text-faint);
}

.runSummary {
  overflow-wrap: anywhere;
}

.runDetailRow > td {
  padding-top: 0;
}

.runDetail {
  margin: 0;
  padding: var(--sp-3);
  border-radius: var(--radius-sm, 6px);
  background: var(--row-hover);
  font-family: monospace;
  font-size: var(--fs-sm);
  color: var(--text-muted);
  overflow-x: auto;
}

.runError {
  margin: 0 0 var(--sp-2);
  color: var(--danger-text);
  font-size: var(--fs-sm);
  overflow-wrap: anywhere;
}
</style>
