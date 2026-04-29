import { computed, ref, watch } from 'vue'

export const ADMIN_KEY_SESSION = 'sendmemes_ui_admin_key_session'

const storageKeys = {
  apiBase: 'sendmemes_ui_api_base',
}

// Older builds stored the admin key in localStorage; remove it so keys are not persisted at rest.
const legacyAdminKeyStorage = 'sendmemes_ui_admin_key'
if (typeof localStorage !== 'undefined' && localStorage.getItem(legacyAdminKeyStorage)) {
  localStorage.removeItem(legacyAdminKeyStorage)
}

const apiBase = ref(localStorage.getItem(storageKeys.apiBase) || 'http://localhost:8080')
const adminKey = ref(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(ADMIN_KEY_SESSION) || '' : '')

watch(apiBase, (v) => localStorage.setItem(storageKeys.apiBase, v))

const normalizedBase = computed(() => apiBase.value.replace(/\/+$/, ''))

const isAuthenticated = computed(() => adminKey.value.trim().length > 0)

function setSessionKey(key: string) {
  const k = key.trim()
  sessionStorage.setItem(ADMIN_KEY_SESSION, k)
  adminKey.value = k
}

function clearSessionKey() {
  sessionStorage.removeItem(ADMIN_KEY_SESSION)
  adminKey.value = ''
}

/** Health only — does not verify admin key. */
export async function probeHealth(base: string): Promise<boolean> {
  const normalized = base.replace(/\/+$/, '')
  try {
    const res = await fetch(`${normalized}/healthz`)
    return res.ok
  } catch {
    return false
  }
}

/** Verify API is reachable and admin key works (albums list smoke test). */
export async function probeAdminAuth(base: string, key: string): Promise<void> {
  const normalized = base.replace(/\/+$/, '')
  const healthOk = await probeHealth(base)
  if (!healthOk) {
    throw new Error('API unreachable (health check failed)')
  }
  const res = await fetch(`${normalized}/v1/admin/albums?offset=0&limit=1`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': key.trim(),
    },
  })
  if (!res.ok) {
    let errMsg = `Admin auth failed: ${res.status}`
    try {
      const payload = (await res.json()) as { error?: string }
      if (payload.error) errMsg = payload.error
    } catch {
      // ignore
    }
    throw new Error(errMsg)
  }
}

export function useConnection() {
  return {
    apiBase,
    adminKey,
    normalizedBase,
    isAuthenticated,
    setSessionKey,
    clearSessionKey,
    probeHealth,
    probeAdminAuth,
  }
}
