<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    type?: 'error' | 'success' | 'info'
    title?: string
    message: string
  }>(),
  {
    type: 'info',
    title: '',
  },
)

const classes = computed(() => {
  if (props.type === 'error') {
    return 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
  }
  if (props.type === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
  }
  return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200'
})
</script>

<template>
  <div class="rounded-lg border px-3 py-2 text-sm" :class="classes">
    <p v-if="title" class="font-medium">{{ title }}</p>
    <p>{{ message }}</p>
  </div>
</template>
