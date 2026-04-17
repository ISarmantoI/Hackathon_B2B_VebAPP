<script setup lang="ts">
import { computed } from 'vue'

import { orderStatusLabel } from '@/lib/format'
import type { OrderStatus } from '@/types'

const props = defineProps<{
  status: OrderStatus
}>()

const classes = computed(() => {
  switch (props.status) {
    case 'new':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200'
    case 'in_progress':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
    case 'cancelled':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-200'
  }
})
</script>

<template>
  <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium" :class="classes">
    {{ orderStatusLabel(status) }}
  </span>
</template>
