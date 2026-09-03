<script setup lang="ts">
import { computed } from 'vue'

import type { Image } from '../types/admin'
import { useThumbPreview } from '../composables/useThumbPreview'

const props = defineProps<{
  /** The images to show, already in the order they should appear. */
  items: Image[]
  /** How many the row actually covers, when that is more than `items` holds.
   *  Leave unset to count only what was passed. */
  total?: number
  /** Marks the first cell as the album cover. */
  coverFirst?: boolean
}>()

/** Six cells. When more exist than fit, the last one becomes the counter rather
 *  than a seventh thumbnail — so the strip is always the same shape. */
const SLOTS = 6

const totalCount = computed(() => Math.max(props.total ?? props.items.length, props.items.length))
const overflow = computed(() => totalCount.value - (SLOTS - 1))
const hasOverflow = computed(() => totalCount.value > SLOTS)
const shown = computed(() => props.items.slice(0, hasOverflow.value ? SLOTS - 1 : SLOTS))

/** Videos have no still to show, so the cell falls back to the filename. */
function thumb(img: Image): string | undefined {
  return img.kind === 'video' ? undefined : img.preview_url
}

// Same floating full-size preview the table thumbnails use. One instance for
// the whole strip: only one cell can be hovered at a time, and it is the
// hovered cell that supplies both the anchor and the image.
const { open, src: previewSrc, pos, show, hide } = useThumbPreview()
</script>

<template>
  <div v-if="items.length" class="mediaStrip">
    <div
      v-for="(img, i) in shown"
      :key="img.id"
      class="mediaCell"
      :title="img.url"
      @mouseenter="show($event.currentTarget as HTMLElement, thumb(img))"
      @mouseleave="hide"
    >
      <!-- Deliberately not lazy: the strip only exists after a click, and a row
           inserted then never gets re-evaluated as a lazy candidate, so all but
           the first thumbnail would sit unfetched. Six small images cost nothing. -->
      <img v-if="thumb(img)" :src="thumb(img)" :alt="img.url" />
      <span v-else class="mediaCellLabel">{{ img.kind === 'video' ? '🎬' : '' }} {{ img.url }}</span>
      <span v-if="coverFirst && i === 0" class="mediaCoverBadge">cover</span>
    </div>
    <div v-if="hasOverflow" class="mediaCell mediaMore">…{{ overflow }} more</div>

    <Teleport to="body">
      <img v-if="open" class="thumb-full" :style="pos" :src="previewSrc" alt="" />
    </Teleport>
  </div>
</template>
