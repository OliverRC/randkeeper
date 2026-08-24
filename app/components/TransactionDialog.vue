<script setup lang="ts">
// Drill into a category's transactions without leaving the page.
import { CATEGORY_BY_ID } from '~~/shared/domain'
const open = defineModel<boolean>('open')
const p = defineProps<{ categoryId: string; period?: string; label?: string }>()
const emit = defineEmits<{ changed: [] }>()
const query = computed(() => ({ category: p.categoryId, period: p.period }))
</script>
<template>
  <UModal v-model:open="open" :title="CATEGORY_BY_ID[categoryId]?.name ?? categoryId" :description="label" :ui="{ content: 'max-w-4xl' }">
    <template #body><TransactionList :query="query" @changed="emit('changed')" /></template>
  </UModal>
</template>
