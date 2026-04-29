import { computed, ref, watch } from 'vue'

const storageKeys = {
  apiBase: 'sendmemes_ui_api_base',
  adminKey: 'sendmemes_ui_admin_key',
}

const apiBase = ref(localStorage.getItem(storageKeys.apiBase) || 'http://localhost:8080')
const adminKey = ref(localStorage.getItem(storageKeys.adminKey) || '')

watch(apiBase, (v) => localStorage.setItem(storageKeys.apiBase, v))
watch(adminKey, (v) => localStorage.setItem(storageKeys.adminKey, v))

const normalizedBase = computed(() => apiBase.value.replace(/\/+$/, ''))

export function useConnection() {
  return { apiBase, adminKey, normalizedBase }
}
