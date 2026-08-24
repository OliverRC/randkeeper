<script setup lang="ts">
import { SPENDING_GROUPS, CATEGORIES } from '~~/shared/domain'
const route = useRoute()
const period = usePeriod()
const { data: meta } = await useFetch('/api/accounts')

const f = reactive({
  q: '', group: (route.query.group as string) || 'all', category: (route.query.category as string) || 'all', tranche: 'all',
  wasteful: route.query.wasteful === '1', unverified: route.query.unverified === '1', uncategorised: route.query.uncategorised === '1', flagged: route.query.flagged === '1', allTime: route.query.flagged === '1',
})
const query = computed(() => ({
  period: f.allTime ? undefined : (period.value ?? meta.value?.periods?.[0]?.key),
  q: f.q || undefined, group: f.group === 'all' ? undefined : f.group, category: f.category === 'all' ? undefined : f.category, tranche: f.tranche === 'all' ? undefined : f.tranche,
  wasteful: f.wasteful ? 1 : undefined, unverified: f.unverified ? 1 : undefined, uncategorised: f.uncategorised ? 1 : undefined, flagged: f.flagged ? 1 : undefined,
}))
const list = ref<any>()
const totals = computed(() => list.value?.totals ?? { n: 0, in: 0, out: 0 })

const groupItems = [{ label: 'All groups', value: 'all' }, ...SPENDING_GROUPS.filter(g => g.id !== 'split').map(g => ({ label: g.name, value: g.id, icon: g.icon }))]
const catItems = computed(() => [{ label: 'All categories', value: 'all' }, ...CATEGORIES.filter(c => c.group !== 'split' && (f.group === 'all' || c.group === f.group)).map(c => ({ label: c.name, value: c.id })).sort((a, b) => a.label.localeCompare(b.label))])
const trancheItems = [{ label: 'All', value: 'all' }, { label: 'Needs', value: 'needs' }, { label: 'Wants', value: 'wants' }, { label: 'Savings', value: 'savings' }, { label: 'Excluded', value: 'none' }]
</script>

<template>
  <div class="p-6 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Transactions</h1>
        <p class="text-sm text-muted tnum">{{ totals.n }} transactions · in <span class="text-emerald-600">{{ money(totals.in) }}</span> · out <span class="text-highlighted">{{ money(totals.out) }}</span></p>
      </div>
      <div class="flex items-center gap-2">
        <UCheckbox v-model="f.allTime" label="All time" size="sm" />
        <PeriodPicker v-if="meta?.periods && !f.allTime" :periods="meta.periods" :tax-years="meta.taxYears" />
      </div>
    </div>

    <div class="flex flex-wrap gap-2 items-center">
      <UInput v-model="f.q" icon="i-lucide-search" placeholder="Search description or merchant" class="w-64" size="sm" />
      <USelectMenu v-model="f.group" :items="groupItems" value-key="value" size="sm" class="w-44" :search-input="false" @update:model-value="f.category = 'all'" />
      <USelectMenu v-model="f.category" :items="catItems" value-key="value" size="sm" class="w-52" />
      <USelect v-model="f.tranche" :items="trancheItems" value-key="value" size="sm" class="w-28" />
      <div class="flex gap-1 ml-auto">
        <UButton size="sm" :variant="f.uncategorised ? 'solid' : 'outline'" color="warning" icon="i-lucide-tag" label="Uncategorised" @click="f.uncategorised = !f.uncategorised" />
        <UButton size="sm" :variant="f.unverified ? 'solid' : 'outline'" color="neutral" icon="i-lucide-circle-check" label="To review" @click="f.unverified = !f.unverified" />
        <UButton size="sm" :variant="f.flagged ? 'solid' : 'outline'" color="warning" icon="i-lucide-flag" label="Suspicious" @click="f.flagged = !f.flagged" />
        <UButton size="sm" :variant="f.wasteful ? 'solid' : 'outline'" color="error" icon="i-lucide-flame" label="Wasteful" @click="f.wasteful = !f.wasteful" />
      </div>
    </div>

    <TransactionList ref="list" :query="query" />
  </div>
</template>
