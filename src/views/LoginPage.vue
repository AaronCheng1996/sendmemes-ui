<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useConnection } from '../composables/useConnection'
import { useToast } from '../composables/useToast'

const router = useRouter()
const route = useRoute()
const { pushToast } = useToast()
const { apiBase, setSessionKey, probeAdminAuth } = useConnection()

const keyInput = ref('')
const busy = ref(false)

async function onSubmit() {
  const key = keyInput.value.trim()
  if (!key) {
    pushToast('Enter admin API key', 'error')
    return
  }
  busy.value = true
  try {
    await probeAdminAuth(apiBase.value, key)
    setSessionKey(key)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/albums'
    await router.replace(redirect || '/albums')
    pushToast('Signed in', 'success')
  } catch (e) {
    pushToast((e as Error).message, 'error')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="loginShell">
    <section class="panel loginPanel">
      <h1 class="loginTitle">SendMemes Console</h1>
      <p class="loginHint">Sign in with your API base URL and admin key (session only — key is not kept after the tab closes).</p>

      <form class="loginForm" @submit.prevent="onSubmit">
        <label>
          API base URL
          <input v-model="apiBase" type="url" autocomplete="url" placeholder="http://localhost:8080" required />
        </label>
        <label>
          Admin API key
          <input v-model="keyInput" type="password" autocomplete="current-password" placeholder="X-Admin-Key" required />
        </label>
        <button type="submit" class="btnPrimary loginSubmit" :disabled="busy">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </section>
  </div>
</template>
