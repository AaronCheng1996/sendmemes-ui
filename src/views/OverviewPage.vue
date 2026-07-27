<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import type { DeliveryRule, SyncEvent, SystemStatus } from '../types/admin'
import { getSystemStatus, listRules, listSyncEvents, triggerSyncNow } from '../services/adminApi'
import { useAsyncTask } from '../composables/useAsyncTask'
import { useJobs } from '../composables/useJobs'
import { useToast } from '../composables/useToast'
import { formatAbsolute, formatRelative } from '../utils/time'

const { busy, runTask } = useAsyncTask()
const { pushToast } = useToast()
const { start: startJobs } = useJobs()

const status = ref<SystemStatus | null>(null)
const rules = ref<DeliveryRule[]>([])
const recentEvents = ref<SyncEvent[]>([])

const enabledRuleCount = computed(() => rules.value.filter((r) => r.enabled).length)

// Enabled scheduled rules with a computed next_run_at, soonest first.
const upcomingRuns = computed(() =>
  rules.value
    .filter((r) => r.trigger_type === 'scheduled' && r.enabled && r.next_run_at)
    .sort((a, b) => new Date(a.next_run_at as string).getTime() - new Date(b.next_run_at as string).getTime()),
)

function eventLabel(ev: SyncEvent): string {
  return ev.event_type === 'album_created' ? 'New album' : 'New files'
}

async function refresh() {
  const [s, r, events] = await Promise.all([getSystemStatus(), listRules(), listSyncEvents({ limit: 5 })])
  status.value = s
  rules.value = r
  recentEvents.value = events.items
}

async function syncNow() {
  await triggerSyncNow()
  pushToast('Sync queued — running in the background', 'info')
  startJobs()
}

onMounted(() => runTask(refresh))
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2 class="toolbarTitle">Overview</h2>
      <div class="toolbarActions">
        <button type="button" class="btnCompact" :disabled="busy" @click="runTask(refresh)">Refresh</button>
        <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="runTask(syncNow)">Sync now</button>
      </div>
    </div>

    <div class="statGrid">
      <div class="statCard">
        <span class="statValue">{{ status?.album_count ?? '—' }}</span>
        <span class="statLabel">Albums</span>
      </div>
      <div class="statCard">
        <span class="statValue">{{ status?.image_count ?? '—' }}</span>
        <span class="statLabel">Images</span>
      </div>
      <div class="statCard">
        <span class="statValue">{{ status?.video_count ?? '—' }}</span>
        <span class="statLabel">Videos</span>
      </div>
    </div>
  </section>

  <section class="panel">
    <h3 class="subheading">System health</h3>
    <div class="row">
      <span class="healthPill" :class="`health-${status?.database_status === 'ok' ? 'ok' : 'fail'}`">
        DB: {{ status?.database_status ?? 'unknown' }}
      </span>
      <span class="healthPill" :class="`health-${status?.discord_connected ? 'ok' : 'fail'}`">
        Discord: {{ status?.discord_connected ? status.discord_user || 'connected' : 'disconnected' }}
      </span>
    </div>
    <p class="muted">Sync interval: <strong>{{ status?.sync_interval || '-' }}</strong></p>
  </section>

  <section class="panel">
    <h3 class="subheading">Schedule</h3>
    <p class="muted">{{ enabledRuleCount }} of {{ rules.length }} rule{{ rules.length === 1 ? '' : 's' }} enabled.</p>
    <p v-if="status?.next_scheduled_run" class="effectiveRow">
      Next scheduled send: <strong>{{ formatRelative(status.next_scheduled_run) }}</strong>
      ({{ formatAbsolute(status.next_scheduled_run) }})
    </p>
    <p v-else class="muted">No enabled scheduled rules.</p>

    <ul v-if="upcomingRuns.length" class="listReset">
      <li v-for="r in upcomingRuns" :key="r.id" class="scheduleItem">
        <span class="scheduleItemName">{{ r.name || `Rule #${r.id}` }}</span>
        <span class="scheduleItemNext" :title="formatAbsolute(r.next_run_at as string)">
          {{ r.schedule_description || r.send_interval }} — next {{ formatRelative(r.next_run_at as string) }}
        </span>
      </li>
    </ul>
  </section>

  <section class="panel">
    <div class="toolbar">
      <h3 class="toolbarTitle subheading">Recent activity</h3>
      <div class="toolbarActions">
        <RouterLink to="/activity" class="btnCompact">View all</RouterLink>
      </div>
    </div>
    <p v-if="status?.last_sync_at" class="muted">
      Last sync: {{ formatRelative(status.last_sync_at) }} ({{ formatAbsolute(status.last_sync_at) }})
    </p>
    <p v-else class="muted">No sync has run yet.</p>

    <ul v-if="recentEvents.length" class="listReset">
      <li v-for="ev in recentEvents" :key="ev.id" class="activityItem">
        <span class="eventBadge" :class="ev.event_type === 'album_created' ? 'eventCreated' : 'eventAdded'">
          {{ eventLabel(ev) }}
        </span>
        <span class="activityItemAlbum">{{ ev.album_name }}</span>
        <span class="activityItemTime muted" :title="formatAbsolute(ev.created_at)">{{ formatRelative(ev.created_at) }}</span>
      </li>
    </ul>
    <p v-else class="muted">No sync activity recorded yet.</p>
  </section>
</template>
