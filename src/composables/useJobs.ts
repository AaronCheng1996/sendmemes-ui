import { computed, ref } from 'vue'

import { listJobs } from '../services/adminApi'
import type { Job, JobKind } from '../types/admin'
import { useToast } from './useToast'

// Module-level singleton so every component shares one poller and job list.
const jobs = ref<Job[]>([])
const lastStatus = new Map<string, string>()
let timer: ReturnType<typeof setInterval> | null = null

const POLL_MS = 3000

function kindLabel(kind: JobKind | string): string {
  switch (kind) {
    case 'send_test':
      return 'Send test'
    case 'schedule_send':
      return 'Scheduled send'
    case 'sync':
      return 'Sync'
    default:
      return 'Job'
  }
}

export function useJobs() {
  const { pushToast } = useToast()

  const running = computed(() => jobs.value.filter((j) => j.status === 'running'))
  const hasRunning = computed(() => running.value.length > 0)

  function stop() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  async function poll() {
    let next: Job[]
    try {
      next = await listJobs()
    } catch {
      return // transient error — keep the current list and try again next tick
    }

    // Toast on running -> terminal transitions we have actually observed.
    for (const j of next) {
      if (lastStatus.get(j.id) === 'running' && j.status !== 'running') {
        const label = j.label || kindLabel(j.kind)
        if (j.status === 'succeeded') {
          pushToast(`${kindLabel(j.kind)} finished — ${label}`, 'success')
        } else {
          pushToast(`${kindLabel(j.kind)} failed — ${label}${j.error ? `: ${j.error}` : ''}`, 'error')
        }
      }
    }

    lastStatus.clear()
    for (const j of next) lastStatus.set(j.id, j.status)
    jobs.value = next

    if (!next.some((j) => j.status === 'running')) {
      stop()
    }
  }

  // start refreshes immediately (so a just-queued job appears) and ensures the
  // 3s poller is running; poll() stops it once nothing is running.
  function start() {
    void poll()
    if (timer === null) {
      timer = setInterval(() => void poll(), POLL_MS)
    }
  }

  return { jobs, running, hasRunning, start, refresh: poll }
}
