<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_40%)]" />
    <div class="relative z-10 w-full max-w-md">
      <RouterView />
    </div>
  </div>
</template>
