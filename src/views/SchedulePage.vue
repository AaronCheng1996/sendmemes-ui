<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { EffectiveSchedule } from '../types/admin'
import { getSchedule, putSchedule } from '../services/adminApi'
import { useToast } from '../composables/useToast'

const busy = ref(false)
const { pushToast } = useToast()
const guildQuery = ref('')
const effective = ref<EffectiveSchedule | null>(null)
const form = ref({
  guild_id: '',
  send_channel_id: '',
  send_interval: '6h',
  send_history_size: 10,
  notify_channel_id: '',
})

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

async function load() {
  const data = await getSchedule(guildQuery.value)
  effective.value = data
  form.value = {
    guild_id: data.guild_id || guildQuery.value,
    send_channel_id: data.send_channel_id || '',
    send_interval: data.send_interval || '6h',
    send_history_size: data.send_history_size || 10,
    notify_channel_id: data.notify_channel_id || '',
  }
}

async function save() {
  await putSchedule(form.value)
  await load()
  pushToast('Schedule updated', 'success')
}

onMounted(() => runTask(load))
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <h2 class="toolbarTitle">Schedule</h2>
      <div class="toolbarFilters">
        <label class="toolbarLabel">
          Guild ID (optional query)
          <input v-model="guildQuery" class="inputGrow" placeholder="guild_id" @keydown.enter="runTask(load)" />
        </label>
        <button type="button" class="btnCompact" :disabled="busy" @click="runTask(load)">Load</button>
      </div>
    </div>

    <div v-if="effective" class="effectiveCard">
      <p class="effectiveRow">guild: <b>{{ effective.guild_id }}</b></p>
      <p class="effectiveRow">channel: <b>{{ effective.send_channel_id }}</b> <span class="sourceHint">({{ effective.source_send_channel_id }})</span></p>
      <p class="effectiveRow">interval: <b>{{ effective.send_interval }}</b> <span class="sourceHint">({{ effective.source_send_interval }})</span></p>
      <p class="effectiveRow">history: <b>{{ effective.send_history_size }}</b> <span class="sourceHint">({{ effective.source_send_history_size }})</span></p>
      <p class="effectiveRow">notify: <b>{{ effective.notify_channel_id || '(disabled)' }}</b> <span class="sourceHint">({{ effective.source_notify_channel_id }})</span></p>
    </div>

    <div class="grid2">
      <label class="modalField">guild_id <input v-model="form.guild_id" /></label>
      <label class="modalField">send_channel_id <input v-model="form.send_channel_id" /></label>
      <label class="modalField">send_interval <input v-model="form.send_interval" /></label>
      <label class="modalField">send_history_size <input v-model.number="form.send_history_size" type="number" /></label>
      <label class="modalField">notify_channel_id <input v-model="form.notify_channel_id" placeholder="empty = notifications off" /></label>
    </div>
    <div class="modalActions">
      <button type="button" class="btnCompact btnPrimary" :disabled="busy" @click="runTask(save)">Save schedule</button>
    </div>

    <p v-if="busy" class="status">Working...</p>
  </section>
</template>

<style scoped>
.sourceHint {
  font-size: 0.82rem;
  color: #6a7ea8;
}
</style>
