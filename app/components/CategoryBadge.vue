<script setup lang="ts">
import { CATEGORY_BY_ID, GROUP_BY_ID } from '~~/shared/domain'
const p = defineProps<{ groupId?: string | null; categoryId?: string | null; tranche?: string }>()
const g = computed(() => GROUP_BY_ID[p.groupId ?? ''])
const c = computed(() => CATEGORY_BY_ID[p.categoryId ?? ''])
</script>
<template>
  <span class="inline-flex items-center gap-1.5 text-xs">
    <UIcon v-if="g" :name="g.icon" :class="g.color" class="size-3.5" />
    <span :class="g?.color ?? 'text-muted'" class="font-medium">{{ g?.name ?? '—' }}</span>
    <span class="text-muted/60">•</span>
    <span class="text-muted" :class="{ 'italic': categoryId === 'uncategorised' }">{{ c?.name ?? 'Uncategorised' }}</span>
    <UBadge v-if="tranche && tranche !== 'none'" size="xs" variant="subtle" :color="tranche === 'needs' ? 'info' : tranche === 'wants' ? 'warning' : 'success'" class="ml-0.5 capitalize">{{ tranche }}</UBadge>
  </span>
</template>
