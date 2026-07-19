<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useConnection } from '../composables/useConnection'
import { useToast } from '../composables/useToast'
import { getSyncSettings, putSyncSettings, triggerSyncNow } from '../services/adminApi'

const router = useRouter()
const { pushToast } = useToast()
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

async function loadSync() {
  try {
    const s = await getSyncSettings()
    syncInterval.value = s.sync_interval
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
    pushToast('Sync started', 'success')
  } catch (e) {
    pushToast((e as Error).message, 'error')
  } finally {
    busy.value = false
  }
}

onMounted(loadSync)
</script>

<template>
  <section class="panel">
    <h2>Connection</h2>
    <p class="muted">
      API base is stored in this browser. The admin key is kept in <strong>session storage</strong> only (cleared when you close the tab).
    </p>

    <div class="grid2">
      <label>
        API base URL
        <input v-model="apiBase" type="url" autocomplete="url" />
      </label>
      <label>
        Active endpoint
        <input :value="normalizedBase" readonly class="inputReadonly" />
      </label>
    </div>

    <div class="row">
      <button type="button" class="btnCompact" :disabled="busy" @click="checkHealth">Test health</button>
      <span class="healthPill" :class="`health-${health}`">{{ health }}</span>
      <button type="button" class="btnCompact" :disabled="busy || !adminKey" @click="testAdmin">Verify admin key</button>
    </div>

    <h3 class="subheading">Sync</h3>
    <p class="muted">How often the bot reconciles pCloud into the database, plus an on-demand run.</p>
    <div class="grid2">
      <label>
        Sync interval (Go duration or cron, e.g. 1h or 0 9 * * *)
        <input v-model="syncInterval" placeholder="e.g. 1h or 0 9 * * *" />
      </label>
    </div>
    <div class="row">
      <button type="button" class="btnCompact btnPrimary" :disabled="busy || !syncInterval.trim()" @click="saveSync">Save interval</button>
      <button type="button" class="btnCompact" :disabled="busy" @click="runSyncNow">Sync now</button>
    </div>

    <h3 class="subheading">Session key</h3>
    <p v-if="adminKey" class="muted">A key is loaded for this session. Enter a new value below to replace it.</p>
    <p v-else class="muted">No key in session — sign in again from the login page.</p>

    <div class="grid2">
      <label>
        New admin API key (optional)
        <input v-model="newKey" type="password" autocomplete="new-password" placeholder="Leave empty to keep current" />
      </label>
    </div>
    <div class="row">
      <button type="button" class="btnCompact" :disabled="busy || !newKey.trim()" @click="saveNewKey">Save new key</button>
      <button type="button" class="btnDanger btnCompact" :disabled="busy" @click="logout">Sign out</button>
    </div>
  </section>
</template>
