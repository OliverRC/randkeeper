<script setup lang="ts">
import { TRANCHES } from '~~/shared/domain'
const p = defineProps<{ income: number; rule: { key: string; amount: number; pct: number }[]; linkTo?: string }>()
const route = useRoute()
// On the budget page jump to the section; elsewhere link to the budget page section.
const href = (k: string) => `${p.linkTo ?? route.path}#${k}`
const rows = computed(() => p.rule.filter(r => r.key !== 'none').map(r => {
  const t = TRANCHES[r.key as keyof typeof TRANCHES]
  const ok = t.good === 'under' ? r.pct <= t.target : r.pct >= t.target
  return { ...r, ...t, ok, diff: (r.pct - t.target) * p.income }
}))
const unknown = computed(() => p.rule.find(r => r.key === 'none'))
const total = computed(() => p.rule.reduce((a, r) => a + r.amount, 0))
const score = computed(() => rows.value.filter(r => r.ok).length)
const bar = (c: string) => ({ sky: 'bg-sky-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' }[c])
</script>
<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div><div class="font-semibold">50 / 30 / 20</div><div class="text-xs text-muted">Needs · Wants · Savings, as a share of this period's income</div></div>
        <UBadge :color="score === 3 ? 'success' : score === 2 ? 'warning' : 'error'" variant="subtle">{{ score }}/3 on target</UBadge>
      </div>
    </template>
    <div v-if="!income" class="text-sm text-muted">No income in this period, so there's nothing to measure against.</div>
    <div v-else class="space-y-5">
      <NuxtLink v-for="r in rows" :key="r.key" :to="href(r.key)" class="block group rounded-md -mx-2 px-2 py-1 hover:bg-elevated/60 transition">
        <div class="flex items-baseline justify-between mb-1.5">
          <div class="flex items-center gap-2 text-sm">
            <span class="font-medium group-hover:text-primary">{{ r.label }}</span>
            <UIcon :name="r.ok ? 'i-lucide-circle-check' : 'i-lucide-triangle-alert'" :class="r.ok ? 'text-emerald-600' : 'text-amber-600'" class="size-4" />
            <span class="text-xs text-muted">
              <template v-if="r.ok">{{ r.good === 'under' ? 'under' : 'above' }} target</template>
              <template v-else>{{ r.good === 'under' ? 'over by' : 'short by' }} {{ money(Math.abs(r.diff)) }}</template>
            </span>
          </div>
          <div class="text-sm tnum"><span class="font-semibold">{{ pct(r.pct) }}</span><span class="text-muted"> / {{ pct(r.target) }}</span><span class="text-muted/60 mx-1.5">·</span><span class="font-semibold">{{ money(r.amount) }}</span><span class="text-muted"> / {{ money(r.target * income) }}</span></div>
        </div>
        <StatusBar :value="r.pct" :target="r.target" :color="r.ok ? bar(r.color)! : 'bg-rose-500'" />
      </NuxtLink>
      <!-- Uncategorised / unassigned spend: not in any bucket, so the three above may be understated. -->
      <NuxtLink v-if="unknown" :to="href('none')" class="block group rounded-md -mx-2 px-2 py-1 hover:bg-elevated/60 transition">
        <div class="flex items-baseline justify-between mb-1.5">
          <div class="flex items-center gap-2 text-sm">
            <span class="font-medium group-hover:text-primary">Unknown</span>
            <UIcon v-if="unknown.amount > 0" name="i-lucide-circle-help" class="size-4 text-amber-600" />
            <span class="text-xs text-muted">{{ unknown.amount > 0 ? 'uncategorised or excluded — sort these to trust the numbers above' : 'nothing unsorted' }}</span>
          </div>
          <div class="text-sm tnum"><span class="font-semibold">{{ pct(unknown.pct) }}</span><span class="text-muted"> · {{ money(unknown.amount) }}</span></div>
        </div>
        <StatusBar :value="unknown.pct" color="bg-slate-400" />
      </NuxtLink>
      <div class="flex justify-between text-xs text-muted pt-1 border-t border-default tnum"><span>Total out</span><span>{{ pct(income ? total / income : 0) }} of income · {{ money(total) }}</span></div>
    </div>
  </UCard>
</template>
