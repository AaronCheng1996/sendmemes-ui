<script setup lang="ts">
import { computed } from 'vue'

/**
 * Lists the caption placeholders that actually expand in a given context.
 *
 * The bot leaves an out-of-context placeholder verbatim rather than rendering it
 * as 0, so this list has to stay honest per trigger type: a wrong entry here
 * shows up as literal `{text}` in Discord instead of a plausible wrong number.
 */
const props = defineProps<{
  /** Delivery-rule trigger type. Omit for the app-wide defaults, which apply everywhere. */
  trigger?: string
}>()

/** Available in every context. */
const ALWAYS = [
  '{album}',
  '{album_id}',
  '{shown}',
  '{album_images}',
  '{album_videos}',
  '{album_total}',
  '{rule}',
  '{channel}',
  '{date}',
  '{time}',
  '{datetime}',
  '{weekday}',
]

/** Album deliveries only — a discovery notification has no send mode to report. */
const SCHEDULED_ONLY = ['{mode}', '{rating}', '{last_sent}']

/** Discovery notifications only — nothing is "new" about a scheduled re-send. */
const DISCOVERY_ONLY = ['{new_images}', '{new_videos}', '{new_total}']

const groups = computed(() => {
  if (props.trigger === 'scheduled') {
    return [{ label: 'Placeholders:', tokens: [...ALWAYS, ...SCHEDULED_ONLY] }]
  }
  if (props.trigger === 'new_album' || props.trigger === 'new_files') {
    return [{ label: 'Placeholders:', tokens: [...ALWAYS, ...DISCOVERY_ONLY] }]
  }
  return [
    { label: 'Placeholders:', tokens: ALWAYS },
    { label: 'Scheduled sends also:', tokens: SCHEDULED_ONLY },
    { label: 'New album/files notifications also:', tokens: DISCOVERY_ONLY },
  ]
})
</script>

<template>
  <div class="muted placeholderHint">
    <p v-for="g in groups" :key="g.label">
      {{ g.label }}
      <code v-for="t in g.tokens" :key="t">{{ t }}</code>
    </p>
    <p>
      <code>{shown}</code> is how many files this message carries;
      <code>{album_total}</code> is how many the album holds. Anything unrecognised
      is left as-is so you can spot it in the post. Test sends are prefixed with
      <code>[TEST]</code> automatically.
    </p>
  </div>
</template>

<style scoped>
.placeholderHint {
  margin: var(--sp-2) 0 0;
  font-size: var(--fs-xs);
}

.placeholderHint p {
  margin: 0 0 var(--sp-1);
}

.placeholderHint p:last-child {
  margin-bottom: 0;
}

.placeholderHint code {
  font-size: var(--fs-xs);
  background: var(--surface-alt);
  border-radius: var(--radius-sm);
  padding: 0 var(--sp-1);
  margin-right: var(--sp-1);
  white-space: nowrap;
}
</style>
