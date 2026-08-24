<script setup lang="ts">
import { CATEGORIES, GROUP_BY_ID } from '~~/shared/domain'
const model = defineModel<string | null | undefined>()
const term = ref('')
// Filter ourselves so a group label disappears when none of its categories match.
const items = computed(() => {
  const q = term.value.trim().toLowerCase()
  const byGroup: Record<string, any[]> = {}
  for (const c of CATEGORIES) if (c.group !== 'split' && (!q || c.name.toLowerCase().includes(q))) (byGroup[c.group] ??= []).push({ label: c.name, value: c.id, icon: GROUP_BY_ID[c.group].icon })
  return Object.entries(byGroup).flatMap(([g, cs]) => [{ type: 'label', label: GROUP_BY_ID[g].name }, ...cs.sort((a, b) => a.label.localeCompare(b.label))])
})
</script>
<template>
  <USelectMenu v-model="model" v-model:search-term="term" ignore-filter :items="items" value-key="value" placeholder="Category" class="w-full" :ui="{ content: 'min-w-72' }" />
</template>
