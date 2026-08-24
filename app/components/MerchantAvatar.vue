<script setup lang="ts">
const p = defineProps<{ name: string; group?: string }>()
// Deterministic hue from the merchant name so the same merchant always gets the same colour.
const hue = computed(() => [...(p.name || '?')].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7))
const initials = computed(() => (p.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase())
</script>
<template>
  <div class="size-9 rounded-full grid place-items-center text-xs font-bold text-white shrink-0 select-none"
    :style="{ background: `oklch(0.62 0.13 ${hue})` }">{{ initials }}</div>
</template>
