import { ref } from 'vue'

import { useToast } from './useToast'

/**
 * Shared "run an async action" wrapper for the admin pages: flips a busy flag
 * around the call and surfaces any failure as an error toast, so every view
 * gets identical loading and error behaviour without repeating the boilerplate.
 */
export function useAsyncTask() {
  const busy = ref(false)
  const { pushToast } = useToast()

  async function runTask(task: () => Promise<void>) {
    busy.value = true
    try {
      await task()
    } catch (error) {
      pushToast((error as Error).message, 'error')
    } finally {
      busy.value = false
    }
  }

  return { busy, runTask }
}
