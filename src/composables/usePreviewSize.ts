import { ref, watch } from 'vue'

export type PreviewSize = 'off' | 'small' | 'medium' | 'large'

const STORAGE_KEY = 'sendmemes_ui_preview_size'
const VALID: readonly PreviewSize[] = ['off', 'small', 'medium', 'large']

function readStored(): PreviewSize {
  const v = localStorage.getItem(STORAGE_KEY)
  return (VALID as readonly string[]).includes(v ?? '') ? (v as PreviewSize) : 'small'
}

// Single shared ref so all pages stay in sync without prop drilling.
const previewSize = ref<PreviewSize>(readStored())
watch(previewSize, (v) => localStorage.setItem(STORAGE_KEY, v))

export function usePreviewSize() {
  return { previewSize }
}
