<script setup lang="ts">
import { CATEGORY_BY_ID, GROUP_BY_ID } from '~~/shared/domain'
const period = usePeriod()
const { data, pending } = await useFetch('/api/overview', { query: { period }, watch: [period] })
const o = computed(() => data.value as any)

const hist = computed(() => o.value?.history ?? [])
function yearTip(y: any) {
  if (!y.income) return `${y.label}: no income recorded`
  const diff = y.spent - y.income, p = pct(Math.abs(diff) / y.income)
  const verdict = Math.abs(diff) < 1 ? 'spent exactly what came in' : diff < 0 ? `${money(-diff)} under income (${p})` : `${money(diff)} over income (${p})`
  return `${y.label}: ${verdict} · ${money(y.spent)} out of ${money(y.income)} · 50/30/20 ${y.score}/3`
}
const histMax = computed(() => Math.max(1, ...hist.value.map((h: any) => Math.max(h.income, h.needs + h.wants + h.savings))))
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Overview</h1>
        <p class="text-sm text-muted">Your money, one period at a time.</p>
      </div>
      <div class="flex items-center gap-2">
        <UButton to="/budget" variant="soft" icon="i-lucide-wallet" label="View budget" />
        <PeriodPicker v-if="o?.periods" :periods="o.periods" :tax-years="o.taxYears" />
      </div>
    </div>

    <UEmpty v-if="o?.empty" icon="i-lucide-database" title="No transactions yet" description="Hit “Sync bank” in the sidebar to pull your accounts." />

    <template v-else-if="o">
      <!-- year strip -->
      <UCard :ui="{ body: 'p-4 sm:p-4' }">
        <div class="flex flex-wrap items-center gap-4">
          <div class="text-sm"><span class="font-medium">Your year</span><span class="text-muted"> · {{ o.year.filter((y: any) => y.status === 'good').length }} of {{ o.year.filter((y: any) => y.status !== 'none').length }} periods lived within income</span></div>
          <div class="flex gap-3 ml-auto">
            <UTooltip v-for="y in o.year" :key="y.key" :text="yearTip(y)">
              <button class="relative size-6 rounded-full ring-2 ring-offset-2 ring-offset-(--ui-bg) transition hover:scale-110"
                :class="[{ good: 'bg-emerald-500', warn: 'bg-amber-400', bad: 'bg-rose-500', none: 'bg-elevated' }[y.status], y.key === o.period.key ? 'ring-primary' : 'ring-transparent']"
                @click="period = y.key">
                <span class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-(--ui-bg)" :class="{ good: 'bg-emerald-500', warn: 'bg-amber-400', bad: 'bg-rose-500', none: 'bg-slate-300' }[y.rule]" />
              </button>
            </UTooltip>
          </div>
          <div class="flex gap-3 text-xs text-muted">
            <span class="flex items-center gap-1"><i class="size-2.5 rounded-full bg-emerald-500" />Within income</span>
            <span class="flex items-center gap-1"><i class="size-2.5 rounded-full bg-amber-400" />Up to 10% over</span>
            <span class="flex items-center gap-1"><i class="size-2.5 rounded-full bg-rose-500" />Over</span>
            <span class="flex items-center gap-1 pl-2 border-l border-default"><i class="size-1.5 rounded-full bg-slate-400" />small dot = 50/30/20</span>
          </div>
        </div>
      </UCard>

      <!-- headline numbers -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard v-for="s in [
          { label: 'Income', value: o.income, icon: 'i-lucide-trending-up', tone: 'text-emerald-600' },
          { label: 'Spent', value: -o.spent, icon: 'i-lucide-trending-down', tone: 'text-rose-600' },
          { label: 'Net', value: o.net, icon: 'i-lucide-scale', tone: o.net >= 0 ? 'text-emerald-600' : 'text-rose-600' },
          { label: 'Wasteful', value: -o.wasteful.total, icon: 'i-lucide-flame', tone: 'text-orange-600', sub: `${o.wasteful.n} slaps on the wrist` },
        ]" :key="s.label" :ui="{ body: 'p-4 sm:p-4' }">
          <div class="flex items-center justify-between text-xs text-muted mb-1"><span>{{ s.label }}</span><UIcon :name="s.icon" :class="s.tone" class="size-4" /></div>
          <div class="text-xl"><Money :value="s.value" /></div>
          <div v-if="s.sub" class="text-xs text-muted mt-0.5">{{ s.sub }}</div>
        </UCard>
      </div>

      <div class="grid lg:grid-cols-3 gap-4">
        <RuleCard class="lg:col-span-2" :income="o.income" :rule="o.rule" link-to="/budget" />

        <!-- tax efficiency -->
        <UCard>
          <template #header><div class="font-semibold">Tax efficiency</div><div class="text-xs text-muted">Tax year from {{ o.tax.taxYearStart }}</div></template>
          <div class="space-y-5">
            <StatusBar label="Retirement annuity (year to date)" :sub="`${money(o.tax.ra.ytd)} of ${money(o.tax.ra.annualCap)}`" :value="o.tax.ra.ytdPct" :target="o.tax.ra.onTrack / o.tax.ra.annualCap" :color="o.tax.ra.ytd >= o.tax.ra.onTrack ? 'bg-emerald-500' : 'bg-indigo-500'" />
            <StatusBar label="TFSA (year to date)" :sub="`${money(o.tax.tfsa.ytd)} of ${money(o.tax.tfsa.cap)}`" :value="o.tax.tfsa.pct" :target="o.tax.tfsa.onTrack / o.tax.tfsa.cap" :color="o.tax.tfsa.ytd >= o.tax.tfsa.onTrack ? 'bg-emerald-500' : 'bg-indigo-500'" />
            <StatusBar label="Blake's TFSA (year to date)" :sub="`${money(o.tax.child.ytd)} of ${money(o.tax.child.cap)}`" :value="o.tax.child.pct" :target="o.tax.child.onTrack / o.tax.child.cap" :color="o.tax.child.ytd >= o.tax.child.onTrack ? 'bg-emerald-500' : 'bg-indigo-500'" />
            <div class="rounded-lg bg-elevated p-3 text-sm">
              <div class="flex justify-between"><span class="text-muted">RA tax rebate so far</span><span class="tnum font-medium">{{ money(o.tax.ra.rebateSoFar) }}</span></div>
              <div class="flex justify-between mt-1"><span class="text-muted">Projected at year end</span><span class="tnum font-semibold text-emerald-600">{{ money(o.tax.ra.rebateProjected) }}</span></div>
              <div class="text-[11px] text-muted mt-1.5">{{ money(o.tax.ra.projected) }} projected contributions × {{ pct(o.tax.ra.rate) }} marginal rate. Max possible {{ money(o.tax.ra.rebateMax) }}.</div>
            </div>
            <p class="text-xs text-muted">Whole tax year, regardless of the period selected. On-track markers are pro-rata (≈{{ money(o.tax.ra.monthly) }}/month for the RA). Left this year: RA {{ money(Math.max(0, o.tax.ra.annualCap - o.tax.ra.ytd)) }}, TFSA {{ money(Math.max(0, o.tax.tfsa.cap - o.tax.tfsa.ytd)) }}.</p>
            <UButton to="/settings" variant="link" size="xs" label="Adjust limits" trailing-icon="i-lucide-arrow-right" class="px-0" />
          </div>
        </UCard>
      </div>

      <div class="grid lg:grid-cols-3 gap-4">
        <!-- history -->
        <UCard class="lg:col-span-2">
          <template #header>
            <div class="flex items-center justify-between">
              <div><div class="font-semibold">Last {{ hist.length }} periods</div><div class="text-xs text-muted">Stacked needs / wants / savings against income</div></div>
              <div class="flex gap-3 text-xs text-muted">
                <span class="flex items-center gap-1"><i class="size-2 rounded-sm bg-sky-500" />Needs</span>
                <span class="flex items-center gap-1"><i class="size-2 rounded-sm bg-amber-500" />Wants</span>
                <span class="flex items-center gap-1"><i class="size-2 rounded-sm bg-emerald-500" />Savings</span>
                <span class="flex items-center gap-1"><i class="w-3 border-t-2 border-dashed border-highlighted" />Income</span>
              </div>
            </div>
          </template>
          <div class="flex items-end gap-2 h-44">
            <button v-for="h in hist" :key="h.key" class="flex-1 h-full flex flex-col justify-end group cursor-pointer" :title="`${h.label}: income ${money(h.income)}, spent ${money(h.needs + h.wants + h.savings)}`" @click="period = h.key">
              <div class="relative flex flex-col-reverse rounded-md overflow-hidden transition-opacity" :class="h.key === o.period.key ? '' : 'opacity-70 group-hover:opacity-100'" :style="{ height: `${(h.needs + h.wants + h.savings) / histMax * 100}%` }">
                <div class="bg-sky-500" :style="{ flex: h.needs }" />
                <div class="bg-amber-500" :style="{ flex: h.wants }" />
                <div class="bg-emerald-500" :style="{ flex: h.savings }" />
              </div>
              <div class="relative"><div class="absolute left-0 right-0 border-t-2 border-dashed border-highlighted/70" :style="{ bottom: `${h.income / histMax * 176}px` }" /></div>
            </button>
          </div>
          <div class="flex gap-2 mt-2">
            <div v-for="h in hist" :key="h.key" class="flex-1 text-center text-[10px] text-muted truncate" :class="{ 'text-highlighted font-medium': h.key === o.period.key }">{{ h.label }}</div>
          </div>
        </UCard>

        <!-- needs attention -->
        <UCard>
          <template #header><div class="font-semibold">Needs attention</div></template>
          <div class="space-y-3">
            <NuxtLink :to="{ path: '/transactions', query: { uncategorised: 1 } }" class="flex items-center justify-between rounded-lg p-3 bg-elevated hover:bg-accented transition">
              <span class="flex items-center gap-2 text-sm"><UIcon name="i-lucide-tag" class="size-4 text-muted" />Uncategorised</span>
              <UBadge :color="o.attention.uncat ? 'warning' : 'neutral'" variant="subtle">{{ o.attention.uncat ?? 0 }}</UBadge>
            </NuxtLink>
            <NuxtLink :to="{ path: '/transactions', query: { flagged: 1 } }" class="flex items-center justify-between rounded-lg p-3 bg-elevated hover:bg-accented transition">
              <span class="flex items-center gap-2 text-sm"><UIcon name="i-lucide-flag" class="size-4 text-muted" />Suspicious<span class="text-xs text-muted">(all time)</span></span>
              <UBadge :color="o.flaggedAll ? 'warning' : 'neutral'" variant="subtle">{{ o.flaggedAll ?? 0 }}</UBadge>
            </NuxtLink>
            <NuxtLink :to="{ path: '/transactions', query: { unverified: 1 } }" class="flex items-center justify-between rounded-lg p-3 bg-elevated hover:bg-accented transition">
              <span class="flex items-center gap-2 text-sm"><UIcon name="i-lucide-circle-check" class="size-4 text-muted" />To review</span>
              <UBadge color="neutral" variant="subtle">{{ o.attention.unver ?? 0 }}</UBadge>
            </NuxtLink>
            <div class="rounded-lg p-3 bg-elevated">
              <div class="flex items-center justify-between text-sm mb-2"><span class="flex items-center gap-2"><UIcon name="i-lucide-wallet" class="size-4 text-muted" />Budget</span>
                <NuxtLink to="/budget" class="text-xs text-primary">{{ o.budget.total ? 'Open' : 'Set one' }}</NuxtLink></div>
              <template v-if="o.budget.total">
                <StatusBar :value="o.budget.spent / o.budget.total" :color="o.budget.spent > o.budget.total ? 'bg-rose-500' : 'bg-indigo-500'" />
                <div class="text-xs text-muted mt-1.5 tnum">{{ money(o.budget.spent) }} of {{ money(o.budget.total) }}</div>
              </template>
              <div v-else class="text-xs text-muted">No budget for this period.</div>
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid lg:grid-cols-2 gap-4">
        <!-- top categories -->
        <UCard>
          <template #header><div class="font-semibold">Where it went</div><div class="text-xs text-muted">Top spending categories (excluding savings & transfers)</div></template>
          <div class="space-y-3">
            <NuxtLink v-for="c in o.topCategories" :key="c.categoryId" :to="{ path: '/transactions', query: { category: c.categoryId } }" class="block group">
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="flex items-center gap-2"><UIcon :name="GROUP_BY_ID[c.groupId]?.icon" :class="GROUP_BY_ID[c.groupId]?.color" class="size-4" />{{ CATEGORY_BY_ID[c.categoryId]?.name ?? c.categoryId }}<span class="text-xs text-muted">× {{ c.n }}</span></span>
                <span class="tnum font-medium">{{ money(c.total) }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-elevated"><div class="h-full rounded-full bg-slate-400 group-hover:bg-primary transition" :style="{ width: `${c.total / o.topCategories[0].total * 100}%` }" /></div>
            </NuxtLink>
          </div>
        </UCard>

        <!-- goals -->
        <UCard>
          <template #header><div class="flex items-center justify-between"><div class="font-semibold">Goals</div><UButton to="/goals" variant="link" size="xs" label="Manage" trailing-icon="i-lucide-arrow-right" /></div></template>
          <UEmpty v-if="!o.goals.length" icon="i-lucide-target" title="No goals yet" description="An emergency fund of one month's salary is a good first one." :ui="{ root: 'py-6' }">
            <template #actions><UButton to="/goals" size="sm" label="Add a goal" /></template>
          </UEmpty>
          <div v-else class="space-y-4">
            <div v-for="g in o.goals" :key="g.id">
              <div class="flex items-baseline justify-between text-sm mb-1.5"><span class="font-medium">{{ g.name }}</span><span class="tnum text-muted">{{ money(g.current) }} <span class="opacity-60">/ {{ money(g.target) }}</span></span></div>
              <StatusBar :value="g.pct" :color="g.pct >= 1 ? 'bg-emerald-500' : 'bg-indigo-500'" />
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
