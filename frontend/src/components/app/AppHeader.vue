<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()

const title = computed(() => route.meta.title || 'B2B Платформа')
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-border/70 bg-background/90 px-6 py-4 backdrop-blur lg:px-8">
    <div>
      <h2 class="text-2xl font-semibold text-foreground">{{ title }}</h2>
      <p class="text-sm text-muted-foreground">Рабочее пространство сотрудников</p>
    </div>
  </header>
</template>
