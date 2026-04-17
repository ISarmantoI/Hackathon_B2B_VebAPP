<script setup lang="ts">
import { Toaster } from 'vue-sonner'
</script>

<template>
  <Toaster
    theme="dark"
    rich-colors
    close-button
    position="top-right"
    :duration="3200"
    :visible-toasts="4"
  />
</template>
