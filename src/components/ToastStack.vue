<script setup lang="ts">
import { useToast } from '../composables/useToast'

const { toasts, removeToast } = useToast()
</script>

<template>
  <aside class="toastStack">
    <article v-for="t in toasts" :key="t.id" class="toast" :class="`toast-${t.kind}`">
      <span>{{ t.text }}</span>
      <button class="toastClose" @click="removeToast(t.id)">x</button>
    </article>
  </aside>
</template>
