<script setup lang="ts">
// A progress bar with a target marker; good/bad colouring is decided by the caller.
defineProps<{ value: number; target?: number; color: string; label?: string; sub?: string }>()
</script>
<template>
  <div>
    <div v-if="label" class="flex items-baseline justify-between mb-1.5 text-sm">
      <span class="font-medium">{{ label }}</span>
      <span class="text-muted text-xs">{{ sub }}</span>
    </div>
    <div class="relative h-2.5 rounded-full bg-elevated overflow-hidden">
      <div class="h-full rounded-full transition-all duration-500" :class="color" :style="{ width: `${Math.min(100, value * 100)}%` }" />
      <div v-if="target" class="absolute top-0 bottom-0 w-0.5 bg-highlighted/60" :style="{ left: `${Math.min(100, target * 100)}%` }" />
    </div>
  </div>
</template>
