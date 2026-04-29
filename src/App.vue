<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import { useConnection } from './composables/useConnection'
import { useToast } from './composables/useToast'
import ToastStack from './components/ToastStack.vue'

const route = useRoute()
const { normalizedBase } = useConnection()
const { pushToast } = useToast()

type ThemeMode = 'dark' | 'light'
type Health = 'unknown' | 'ok' | 'fail'

const theme = ref<ThemeMode>((localStorage.getItem('sendmemes_ui_theme') as ThemeMode) || 'dark')
const health = ref<Health>('unknown')
const checking = ref(false)

const isLogin = computed(() => route.path === '/login')

watch(theme, (v) => {
  localStorage.setItem('sendmemes_ui_theme', v)
  document.documentElement.setAttribute('data-theme', v)
})

onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  if (!isLogin.value) {
    checkHealth()
  }
})

watch(isLogin, (login) => {
  if (!login) {
    checkHealth()
  }
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
  <main class="app" :class="{ appLogin: isLogin }">
    <template v-if="isLogin">
      <RouterView />
    </template>
    <template v-else>
      <header class="hero">
        <div>
          <h1>SendMemes Console</h1>
          <p>Admin dashboard</p>
        </div>
        <div class="heroActions">
          <button :disabled="checking" @click="checkHealth">
            {{ checking ? 'Checking...' : 'Check API' }}
          </button>
          <span class="healthPill" :class="`health-${health}`">{{ health }}</span>
          <button type="button" @click="toggleTheme">Theme: {{ theme }}</button>
        </div>
      </header>

      <nav class="tabs routeTabs">
        <RouterLink to="/albums" class="tabLink" :class="{ active: route.path === '/albums' }">Albums</RouterLink>
        <RouterLink to="/images" class="tabLink" :class="{ active: route.path === '/images' }">Images</RouterLink>
        <RouterLink to="/schedule" class="tabLink" :class="{ active: route.path === '/schedule' }">Schedule</RouterLink>
        <RouterLink to="/connection" class="tabLink" :class="{ active: route.path === '/connection' }">Connection</RouterLink>
      </nav>
      <RouterView />
    </template>
    <ToastStack />
  </main>
</template>
