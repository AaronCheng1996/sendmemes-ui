import { ref, watch } from 'vue'

// usePageSize creates a reactive page-size ref persisted to localStorage so
// the user's preferred page size carries across reloads and tab navigations.
export function usePageSize(key: string, fallback = 20) {
  const stored = Number(localStorage.getItem(key))
  const limit = ref<number>(Number.isFinite(stored) && stored > 0 ? stored : fallback)
  watch(limit, (v) => localStorage.setItem(key, String(v)))
  return limit
}
