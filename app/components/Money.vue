<script setup lang="ts">
const p = defineProps<{ value: number; sign?: boolean; muted?: boolean }>()
const parts = computed(() => moneyParts(p.value, p.sign))
</script>
<template>
  <span class="tnum whitespace-nowrap" :class="muted ? 'text-muted' : value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-highlighted'">
    <span class="font-semibold">{{ parts.whole }}</span><span class="text-[0.8em] opacity-70">{{ parts.cents }}</span>
  </span>
</template>
