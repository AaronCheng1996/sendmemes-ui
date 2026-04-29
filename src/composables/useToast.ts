import { ref } from 'vue'

type ToastKind = 'success' | 'error' | 'info'

export type ToastItem = {
  id: number
  kind: ToastKind
  text: string
}

const toasts = ref<ToastItem[]>([])
let seq = 1

export function useToast() {
  function pushToast(text: string, kind: ToastKind = 'info', timeoutMs = 3200) {
    const id = seq++
    toasts.value.push({ id, kind, text })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, timeoutMs)
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, pushToast, removeToast }
}
