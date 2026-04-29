<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import { useConnection } from './composables/useConnection'
import { useToast } from './composables/useToast'
import ToastStack from './components/ToastStack.vue'

const route = useRoute()
const { apiBase, adminKey, normalizedBase } = useConnection()
const { pushToast } = useToast()

type ThemeMode = 'dark' | 'light'
type Health = 'unknown' | 'ok' | 'fail'

const theme = ref<ThemeMode>((localStorage.getItem('sendmemes_ui_theme') as ThemeMode) || 'dark')
const health = ref<Health>('unknown')
const checking = ref(false)

watch(theme, (v) => {
  localStorage.setItem('sendmemes_ui_theme', v)
  document.documentElement.setAttribute('data-theme', v)
})

onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  checkHealth()
})

async function checkHealth() {
  checking.value = true
  try {
    const res = await fetch(`${normalizedBase.value}/healthz`)
    health.value = res.ok ? 'ok' : 'fail'
    if (!res.ok) {
      pushToast(`Health check failed: ${res.status}`, 'error')
    }
  } catch {
    health.value = 'fail'
    pushToast('Health check failed: network error', 'error')
  } finally {
    checking.value = false
  }
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <main class="app">
    <header class="hero">
      <div>
        <h1>SendMemes Console</h1>
        <p>Vite + Vue + TypeScript Admin Dashboard (modular)</p>
      </div>
      <div class="heroActions">
        <button :disabled="checking" @click="checkHealth">
          {{ checking ? 'Checking...' : 'Check API' }}
        </button>
        <span class="healthPill" :class="`health-${health}`">{{ health }}</span>
        <button @click="toggleTheme">Theme: {{ theme }}</button>
      </div>
    </header>

    <section class="panel">
      <h2>Connection</h2>
      <div class="grid2">
        <label>
          API Base URL
          <input v-model="apiBase" placeholder="http://localhost:8080" />
        </label>
        <label>
          ADMIN API KEY
          <input v-model="adminKey" placeholder="X-Admin-Key" />
        </label>
      </div>
    </section>

    <nav class="tabs routeTabs">
      <RouterLink to="/albums" class="tabLink" :class="{ active: route.path === '/albums' }">Albums</RouterLink>
      <RouterLink to="/images" class="tabLink" :class="{ active: route.path === '/images' }">Images</RouterLink>
      <RouterLink to="/schedule" class="tabLink" :class="{ active: route.path === '/schedule' }">Schedule</RouterLink>
    </nav>
    <RouterView />
    <ToastStack />
  </main>
</template>
