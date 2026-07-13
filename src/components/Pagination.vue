<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

const jumpInput = ref('')

watch(currentPage, (p) => {
  jumpInput.value = String(p)
})

function goTo(page: number) {
  const clamped = Math.min(Math.max(1, page), totalPages.value)
  emit('update:offset', (clamped - 1) * props.limit)
}

function changeLimit(e: Event) {
  const next = Number((e.target as HTMLSelectElement).value) || props.limit
  emit('update:limit', next)
  emit('update:offset', 0)
}

function submitJump() {
  const raw = String(jumpInput.value ?? '').trim()
  const n = parseInt(raw, 10)
  if (!Number.isFinite(n)) return
  goTo(n)
}

const rangeStart = computed(() => (props.total === 0 ? 0 : props.offset + 1))
const rangeEnd = computed(() => Math.min(props.total, props.offset + props.limit))
</script>

<template>
  <div class="pagination">
    <!-- Row 1: navigation -->
    <div class="paginationNav">
      <button type="button" class="btnCompact" :disabled="busy || currentPage <= 1" @click="goTo(1)">«</button>
      <button type="button" class="btnCompact" :disabled="busy || currentPage <= 1" @click="goTo(currentPage - 1)">‹</button>
      <span class="pageLabel">Page {{ currentPage }} / {{ totalPages }}</span>
      <button type="button" class="btnCompact" :disabled="busy || currentPage >= totalPages" @click="goTo(currentPage + 1)">›</button>
      <button type="button" class="btnCompact" :disabled="busy || currentPage >= totalPages" @click="goTo(totalPages)">»</button>
      <label class="paginationJump">
        <span class="paginationJumpLabel">Go to</span>
        <input
          v-model="jumpInput"
          class="inputCompact"
          type="number"
          :min="1"
          :max="totalPages"
          :disabled="busy"
          title="Page number"
          @keydown.enter.prevent="submitJump"
        />
        <button type="button" class="btnCompact" :disabled="busy" @click="submitJump">Go</button>
      </label>
      <span class="pageInfo">{{ rangeStart }}–{{ rangeEnd }} of {{ total }}</span>
    </div>
    <!-- Row 2: settings -->
    <div class="paginationSettings">
      <select class="selectCompact" :value="limit" :disabled="busy" @change="changeLimit">
        <option v-for="n in sizeOptions" :key="n" :value="n">{{ n }} / page</option>
      </select>
      <select v-model="previewSize" class="selectCompact" :disabled="busy" title="Preview thumbnail size">
        <option value="off">Preview: Off</option>
        <option value="small">Preview: Small</option>
        <option value="medium">Preview: Medium</option>
        <option value="large">Preview: Large</option>
      </select>
    </div>
  </div>
</template>
