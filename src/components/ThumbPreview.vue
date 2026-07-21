<script setup lang="ts">
import { ref } from 'vue'

import type { PreviewSize } from '../composables/usePreviewSize'

const props = defineProps<{
  /** Resolved image URL; when absent the placeholder is rendered instead. */
  src?: string
  alt?: string
  size: PreviewSize
  /** Placeholder body when there is no src (e.g. "empty", "N/A", "🎬"). */
  placeholder?: string
  placeholderTitle?: string
}>()

// Must match the max box in .thumb-full so the clamp below is accurate.
const MAX_W = 420
const MAX_H = 540
const GAP = 8
const MARGIN = 8

const anchor = ref<HTMLElement | null>(null)
const open = ref(false)
const pos = ref({ left: '0px', top: '0px' })

/*
 * Place the floating preview beside the thumbnail, flipping to its left when
 * there is no room on the right and clamping to the viewport on both axes.
 * Combined with `position: fixed` this guarantees the preview is always fully
 * visible and never extends the document (which previously added a scrollbar
 * when hovering rows near the bottom of the page).
 */
function show() {
  const el = anchor.value
  if (!props.src || !el) return

  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = rect.right + GAP
  if (left + MAX_W + MARGIN > vw) left = rect.left - MAX_W - GAP
  left = Math.max(MARGIN, Math.min(left, vw - MAX_W - MARGIN))

  const top = Math.max(MARGIN, Math.min(rect.top, vh - MAX_H - MARGIN))

  pos.value = { left: `${left}px`, top: `${top}px` }
  open.value = true
}

function hide() {
  open.value = false
}
</script>

<template>
  <div v-if="!src" class="thumb-placeholder" :class="`thumb-${size}`" :title="placeholderTitle">
    {{ placeholder }}
  </div>
  <span v-else ref="anchor" class="thumb-wrap" @mouseenter="show" @mouseleave="hide">
    <img class="thumb" :class="`thumb-${size}`" :src="src" :alt="alt" loading="lazy" />
    <Teleport to="body">
      <img v-if="open" class="thumb-full" :style="pos" :src="src" :alt="alt" />
    </Teleport>
  </span>
</template>
