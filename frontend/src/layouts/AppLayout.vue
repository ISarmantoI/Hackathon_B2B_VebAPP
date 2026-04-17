<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppHeader from '@/components/app/AppHeader.vue'
import AppSidebar from '@/components/app/AppSidebar.vue'
</script>

<template>
  <div class="flex min-h-svh overflow-x-hidden bg-background">
    <AppSidebar />
    <div class="flex min-w-0 flex-1 flex-col overflow-x-hidden bg-[hsl(var(--sidebar-background))]/35">
      <AppHeader />
      <main class="flex-1 p-4 lg:p-6">
        <div class="min-h-full rounded-2xl border border-border/70 bg-background p-4 lg:p-6">
          <RouterView />
        </div>
      </main>
    </div>
  </div>
</template>
