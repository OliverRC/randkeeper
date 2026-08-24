<script setup lang="ts">
const p = defineProps<{ periods: { key: string; label: string }[]; taxYears?: { key: string; label: string }[] }>()
const period = usePeriod()
const items = computed(() => [
  ...(p.taxYears?.length ? [{ type: 'label', label: 'Whole year' }, ...p.taxYears.map(x => ({ label: x.label, value: x.key, icon: 'i-lucide-calendar-range' }))] : []),
  { type: 'label', label: 'Budget periods' },
  ...p.periods.map(x => ({ label: x.label, value: x.key })),
])
const value = computed({ get: () => period.value ?? p.periods[0]?.key, set: v => period.value = v })
const idx = computed(() => p.periods.findIndex(x => x.key === value.value))
</script>
<template>
  <div class="flex items-center gap-1">
    <UButton icon="i-lucide-chevron-left" variant="ghost" color="neutral" size="sm" :disabled="idx >= periods.length - 1" @click="value = periods[idx + 1].key" />
    <USelectMenu v-model="value" :items="items" value-key="value" :search-input="false" class="w-52" size="sm" :ui="{ content: 'min-w-56' }" />
    <UButton icon="i-lucide-chevron-right" variant="ghost" color="neutral" size="sm" :disabled="idx <= 0" @click="value = periods[idx - 1].key" />
  </div>
</template>
