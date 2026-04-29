<script setup lang="ts">
import { computed } from 'vue'
import { usePreviewSize } from '../composables/usePreviewSize'

const props = defineProps<{
  total: number
  offset: number
  limit: number
  busy?: boolean
  pageSizeOptions?: number[]
}>()

const { previewSize } = usePreviewSize()

const emit = defineEmits<{
  (e: 'update:offset', value: number): void
  (e: 'update:limit', value: number): void
}>()

const sizeOptions = computed(() => props.pageSizeOptions ?? [10, 20, 50, 100])

const currentPage = computed(() => Math.floor(props.offset / Math.max(1, props.limit)) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / Math.max(1, props.limit))))

function goTo(page: number) {
  const clamped = Math.min(Math.max(1, page), totalPages.value)
  emit('update:offset', (clamped - 1) * props.limit)
}

function changeLimit(e: Event) {
  const next = Number((e.target as HTMLSelectElement).value) || props.limit
  emit('update:limit', next)
  emit('update:offset', 0)
}

const rangeStart = computed(() => (props.total === 0 ? 0 : props.offset + 1))
const rangeEnd = computed(() => Math.min(props.total, props.offset + props.limit))
</script>

<template>
  <div class="pagination">
    <button :disabled="busy || currentPage <= 1" @click="goTo(1)">«</button>
    <button :disabled="busy || currentPage <= 1" @click="goTo(currentPage - 1)">‹</button>
    <span>Page {{ currentPage }} / {{ totalPages }}</span>
    <button :disabled="busy || currentPage >= totalPages" @click="goTo(currentPage + 1)">›</button>
    <button :disabled="busy || currentPage >= totalPages" @click="goTo(totalPages)">»</button>
    <select :value="limit" :disabled="busy" @change="changeLimit">
      <option v-for="n in sizeOptions" :key="n" :value="n">{{ n }} / page</option>
    </select>
    <select v-model="previewSize" :disabled="busy" title="Preview thumbnail size">
      <option value="off">Preview: Off</option>
      <option value="small">Preview: Small</option>
      <option value="medium">Preview: Medium</option>
      <option value="large">Preview: Large</option>
    </select>
    <span class="pageInfo">{{ rangeStart }}–{{ rangeEnd }} of {{ total }}</span>
  </div>
</template>
