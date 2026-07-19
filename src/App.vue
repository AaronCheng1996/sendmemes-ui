<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

import { useConnection } from './composables/useConnection'
import { useJobs } from './composables/useJobs'
import { useToast } from './composables/useToast'
import ToastStack from './components/ToastStack.vue'

const route = useRoute()
const { normalizedBase } = useConnection()
const { pushToast } = useToast()
const { jobs, running, hasRunning, start: startJobs } = useJobs()

const jobsPanelOpen = ref(false)

function kindLabel(kind: string): string {
  if (kind === 'send_test') return 'Send test'
  if (kind === 'schedule_send') return 'Scheduled send'
  if (kind === 'sync') return 'Sync'
  return 'Job'
}

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
    startJobs()
  }
})

watch(isLogin, (login) => {
  if (!login) {
    checkHealth()
    startJobs()
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
          <div v-if="jobs.length" class="jobsWrap">
            <button type="button" class="btnCompact jobsBtn" @click="jobsPanelOpen = !jobsPanelOpen">
              <span v-if="hasRunning" class="jobsSpinner" aria-hidden="true"></span>
              {{ hasRunning ? `Running ${running.length}` : 'Jobs' }}
            </button>
            <div v-if="jobsPanelOpen" class="panel jobsPanel">
              <p class="jobsPanelTitle">Background jobs</p>
              <ul class="jobsList">
                <li v-for="j in jobs.slice(0, 8)" :key="j.id" class="jobsItem">
                  <span class="jobsDot" :class="`job-${j.status}`" aria-hidden="true"></span>
                  <span class="jobsItemLabel">{{ kindLabel(j.kind) }} — {{ j.label || '—' }}</span>
                  <span class="jobsItemStatus">{{ j.status }}</span>
                </li>
              </ul>
            </div>
          </div>
          <button type="button" class="btnCompact" :disabled="checking" @click="checkHealth">
            {{ checking ? 'Checking...' : 'Check API' }}
          </button>
          <span class="healthPill" :class="`health-${health}`">{{ health }}</span>
          <button type="button" class="btnCompact" @click="toggleTheme">Theme: {{ theme }}</button>
        </div>
      </header>

      <nav class="tabs routeTabs">
        <RouterLink to="/albums" class="tabLink" :class="{ active: route.path === '/albums' }">Albums</RouterLink>
        <RouterLink to="/images" class="tabLink" :class="{ active: route.path === '/images' }">Images</RouterLink>
        <RouterLink to="/schedule" class="tabLink" :class="{ active: route.path === '/schedule' }">Schedule</RouterLink>
        <RouterLink to="/activity" class="tabLink" :class="{ active: route.path === '/activity' }">Activity</RouterLink>
        <RouterLink to="/connection" class="tabLink" :class="{ active: route.path === '/connection' }">Connection</RouterLink>
      </nav>
      <RouterView />
    </template>
    <ToastStack />
  </main>
</template>

<style scoped>
.jobsWrap {
  position: relative;
}

.jobsBtn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.jobsSpinner {
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: jobsSpin 0.7s linear infinite;
}

@keyframes jobsSpin {
  to {
    transform: rotate(360deg);
  }
}

.jobsPanel {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  z-index: 20;
  width: 20rem;
  max-width: 80vw;
  margin-bottom: 0;
}

.jobsPanelTitle {
  margin: 0 0 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
}

.jobsList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 16rem;
  overflow-y: auto;
}

.jobsItem {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
}

.jobsItemLabel {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jobsItemStatus {
  opacity: 0.7;
  text-transform: capitalize;
}

.jobsDot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  flex: none;
  background: #8aa0c8;
}

.jobsDot.job-running {
  background: #5390ff;
}

.jobsDot.job-succeeded {
  background: #3ec18b;
}

.jobsDot.job-failed {
  background: #ff6b6b;
}
</style>
