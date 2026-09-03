<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { useConnection } from '../composables/useConnection'
import { useJobs } from '../composables/useJobs'
import { useToast } from '../composables/useToast'
import {
  getIngestKeyStatus,
  getSyncSettings,
  putIngestKey,
  putMessageDefaults,
  putSyncSettings,
  triggerSyncNow,
} from '../services/adminApi'
import PlaceholderHint from '../components/PlaceholderHint.vue'

const router = useRouter()
const { pushToast } = useToast()
const { start: startJobs } = useJobs()
const {
  apiBase,
  adminKey,
  normalizedBase,
  clearSessionKey,
  setSessionKey,
  probeHealth,
  probeAdminAuth,
} = useConnection()

const busy = ref(false)
const health = ref<'unknown' | 'ok' | 'fail'>('unknown')
const newKey = ref('')

// The ingest credential is write-only: the server reports whether one is in
// force and takes a replacement, but never hands the value back.
const ingestConfigured = ref<boolean | null>(null)
const newIngestKey = ref('')

async function loadIngestStatus() {
  try {
    ingestConfigured.value = (await getIngestKeyStatus()).configured
  } catch {
    ingestConfigured.value = null
  }
}

async function saveIngestKey() {
  busy.value = true
  try {
    ingestConfigured.value = (await putIngestKey(newIngestKey.value.trim())).configured
    newIngestKey.value = ''
    pushToast(ingestConfigured.value ? 'Ingest key saved' : 'Ingest key cleared', 'success')
  } catch (e) {
    pushToast(e instanceof Error ? e.message : 'Could not save the ingest key', 'error')
  } finally {
    busy.value = false
  }
}

watch(
  adminKey,
  () => {
    newKey.value = ''
  },
  { immediate: true },
)

async function checkHealth() {
  busy.value = true
  try {
    const ok = await probeHealth(apiBase.value)
    health.value = ok ? 'ok' : 'fail'
    if (!ok) pushToast('Health check failed', 'error')
  } catch {
    health.value = 'fail'
    pushToast('Health check failed: network error', 'error')
  } finally {
    busy.value = false
  }
}

async function testAdmin() {
  busy.value = true
  try {
    await probeAdminAuth(apiBase.value, adminKey.value)
    pushToast('Admin key is valid', 'success')
  } catch (e) {
    pushToast((e as Error).message, 'error')
  } finally {
    busy.value = false
  }
}

async function saveNewKey() {
  const k = newKey.value.trim()
  if (!k) {
    pushToast('Enter a new key to replace the current one', 'error')
    return
  }
  busy.value = true
  try {
    await probeAdminAuth(apiBase.value, k)
    setSessionKey(k)
    newKey.value = ''
    pushToast('API key updated for this session', 'success')
  } catch (e) {
    pushToast((e as Error).message, 'error')
  } finally {
    busy.value = false
  }
}

function logout() {
  clearSessionKey()
  pushToast('Signed out', 'success')
  router.replace('/login')
}

const syncInterval = ref('')

// App-wide message defaults — the bottom layer of the style stack; delivery
// rules and albums override these per field.
const defaultUseEmbed = ref<'on' | 'off'>('on')
const defaultTitle = ref('')
const defaultBody = ref('')
const defaultColor = ref('')

async function loadSync() {
  try {
    const s = await getSyncSettings()
    syncInterval.value = s.sync_interval
    defaultUseEmbed.value = s.message_style?.use_embed === false ? 'off' : 'on'
    defaultTitle.value = s.message_style?.title ?? ''
    defaultBody.value = s.message_style?.body ?? ''
    defaultColor.value = s.message_style?.color ?? ''
  } catch {
    // Ignore — typically not authenticated yet.
  }
}

async function saveSync() {
  busy.value = true
  try {
    const s = await putSyncSettings(syncInterval.value)
    syncInterval.value = s.sync_interval
    pushToast('Sync interval updated', 'success')
  } catch (e) {
    pushToast((e as Error).message, 'error')
  } finally {
    busy.value = false
  }
}

async function runSyncNow() {
  busy.value = true
  try {
    await triggerSyncNow()
    pushToast('Sync queued — running in the background', 'info')
    startJobs()
  } catch (e) {
    pushToast((e as Error).message, 'error')
  } finally {
    busy.value = false
  }
}

async function saveMessageDefaults() {
  busy.value = true
  try {
    await putMessageDefaults({
      use_embed: defaultUseEmbed.value === 'on',
      title: defaultTitle.value,
      body: defaultBody.value,
      color: defaultColor.value,
    })
    pushToast('Message defaults updated', 'success')
  } catch (e) {
    pushToast((e as Error).message, 'error')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  loadSync()
  loadIngestStatus()
})
</script>

<template>
  <section class="panel settingsSection">
    <h2>Settings</h2>
    <p class="muted">
      API base is stored in this browser. The admin key is kept in <strong>session storage</strong> only (cleared when you close the tab).
    </p>

    <label class="settingsField">
      API base URL
      <input v-model="apiBase" type="url" autocomplete="url" />
    </label>
    <label class="settingsField">
      Active endpoint
      <input :value="normalizedBase" readonly class="inputReadonly" />
    </label>

    <div class="row">
      <button type="button" class="btnCompact" :disabled="busy" @click="checkHealth">Test health</button>
      <span class="healthPill" :class="`health-${health}`">{{ health }}</span>
      <button type="button" class="btnCompact" :disabled="busy || !adminKey" @click="testAdmin">Verify admin key</button>
    </div>
  </section>

  <section class="panel settingsSection">
    <h3 class="subheading">Sync</h3>
    <p class="muted">How often the bot reconciles the media source into the database, plus an on-demand run.</p>

    <label class="settingsField">
      Sync interval (Go duration or cron, e.g. 1h or 0 9 * * *)
      <input v-model="syncInterval" placeholder="e.g. 1h or 0 9 * * *" />
    </label>

    <div class="row">
      <button type="button" class="btnCompact btnPrimary" :disabled="busy || !syncInterval.trim()" @click="saveSync">Save interval</button>
      <button type="button" class="btnCompact" :disabled="busy" @click="runSyncNow">Sync now</button>
    </div>
  </section>

  <section class="panel settingsSection">
    <h3 class="subheading">Logs</h3>
    <p class="muted">
      External clients report their runs to <code>POST {{ normalizedBase }}/v1/runs</code> and appear on the
      <RouterLink to="/logs">Logs</RouterLink> page beside the bot's own. Runs are kept for 30 days.
    </p>

    <p class="muted">
      Ingest key:
      <strong v-if="ingestConfigured === true">configured</strong>
      <strong v-else-if="ingestConfigured === false">not set — every request to /v1/runs is refused</strong>
      <strong v-else>unknown</strong>
    </p>

    <label class="settingsField">
      New ingest API key
      <input
        v-model="newIngestKey"
        type="password"
        autocomplete="new-password"
        placeholder="Leave empty to fall back to INGEST_API_KEY from the environment"
      />
      <span class="fieldHint">
        Write-only: the stored key is never sent back to this page, so replacing it is the only way to change it.
        This is a different credential from the admin key — a client that reports runs cannot touch anything else.
      </span>
    </label>

    <div class="row">
      <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="saveIngestKey">
        {{ newIngestKey.trim() ? 'Save ingest key' : 'Clear stored key' }}
      </button>
    </div>
  </section>

  <section class="panel settingsSection">
    <h3 class="subheading">Message defaults</h3>
    <p class="muted">
      The bottom layer of message presentation. Delivery rules override these per field,
      and an album's own config overrides both.
    </p>

    <label class="settingsField">
      Format
      <select v-model="defaultUseEmbed" class="selectCompact">
        <option value="on">Embed</option>
        <option value="off">Plain text</option>
      </select>
    </label>
    <label class="settingsField">
      Default title (optional)
      <input v-model="defaultTitle" placeholder="empty = album name" />
    </label>
    <label class="settingsField">
      Default body (optional)
      <input v-model="defaultBody" placeholder="empty = built-in caption" />
    </label>
    <label class="settingsField">
      Embed color (optional)
      <input v-model="defaultColor" placeholder="#5390ff — empty = per send mode" />
    </label>

    <PlaceholderHint />
    <div class="row">
      <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="saveMessageDefaults">Save message defaults</button>
    </div>
  </section>

  <section class="panel settingsSection">
    <h3 class="subheading">Session key</h3>
    <p v-if="adminKey" class="muted">A key is loaded for this session. Enter a new value below to replace it.</p>
    <p v-else class="muted">No key in session — sign in again from the login page.</p>

    <label class="settingsField">
      New admin API key (optional)
      <input v-model="newKey" type="password" autocomplete="new-password" placeholder="Leave empty to keep current" />
    </label>

    <div class="row">
      <button type="button" class="btnCompact" :disabled="busy || !newKey.trim()" @click="saveNewKey">Save new key</button>
      <button type="button" class="btnDanger btnCompact" :disabled="busy" @click="logout">Sign out</button>
    </div>
  </section>
</template>

<style scoped>
/* One field per row: a two-up grid put unrelated inputs side by side and made
   "Active endpoint" read as part of the field next to it. */
.settingsField {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  max-width: 34rem;
  margin-bottom: var(--sp-5);
}

.fieldHint {
  font-weight: 400;
  font-size: var(--fs-xs);
  color: var(--text-muted);
}

/* Each area is its own panel, so the boundaries are visible rather than implied
   by a heading. */
.settingsSection h3.subheading {
  margin-top: 0;
}
</style>
