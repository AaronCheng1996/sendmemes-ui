<script setup lang="ts">
import { ref } from 'vue'

import type { PreviewSize } from '../composables/usePreviewSize'
import { useThumbPreview } from '../composables/useThumbPreview'

const props = defineProps<{
  /** Resolved image URL; when absent the placeholder is rendered instead. */
  src?: string
  alt?: string
  size: PreviewSize
  /** Placeholder body when there is no src (e.g. "empty", "N/A", "🎬"). */
  placeholder?: string
  placeholderTitle?: string
}>()

const anchor = ref<HTMLElement | null>(null)
const { open, src: previewSrc, pos, show, hide } = useThumbPreview()
</script>

<template>
  <div v-if="!src" class="thumb-placeholder" :class="`thumb-${size}`" :title="placeholderTitle">
    {{ placeholder }}
  </div>
  <span v-else ref="anchor" class="thumb-wrap" @mouseenter="show(anchor, props.src)" @mouseleave="hide">
    <img class="thumb" :class="`thumb-${size}`" :src="src" :alt="alt" loading="lazy" />
    <Teleport to="body">
      <img v-if="open" class="thumb-full" :style="pos" :src="previewSrc" :alt="alt" />
    </Teleport>
  </span>
</template>
