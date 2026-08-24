<script setup lang="ts">
import { CATEGORIES, CATEGORY_BY_ID, GROUP_BY_ID, SPENDING_GROUPS, TRANCHES } from '~~/shared/domain'
const period = usePeriod()
const { data, refresh } = await useFetch('/api/budgets', { query: { period }, watch: [period] })
const d = computed(() => data.value as any)
const showAll = ref(false)

const rows = computed(() => {
  const list: any[] = [...(d.value?.rows ?? [])]
  if (showAll.value) {
    const have = new Set(list.map(r => r.categoryId))
    for (const c of CATEGORIES) if (!have.has(c.id) && c.group !== 'income' && c.group !== 'transfer' && c.group !== 'split') list.push({ tranche: c.tranche, groupId: c.group, categoryId: c.id, spent: 0, n: 0, avg: 0, budget: null })
  }
  return list
})
// Sort within each spending group, remembered per browser.
const sortItems = [
  { label: 'Biggest first', value: 'desc' },
  { label: 'Smallest first', value: 'asc' },
  { label: 'A to Z', value: 'alpha' },
]
const sort = ref('desc')
try { sort.value = localStorage.getItem('budget.sort') || 'desc' } catch {}
watch(sort, v => { try { localStorage.setItem('budget.sort', v) } catch {} })
const catName = (r: any) => CATEGORY_BY_ID[r.categoryId]?.name ?? r.categoryId
const amt = (r: any) => r.budget ?? r.spent ?? r.total ?? 0
const bySort: Record<string, (a: any, b: any) => number> = {
  desc: (a, b) => amt(b) - amt(a),
  asc: (a, b) => amt(a) - amt(b),
  alpha: (a, b) => catName(a).localeCompare(catName(b)),
}
const SECTIONS = [
  { key: 'needs', ...TRANCHES.needs, tone: 'bg-sky-500', text: 'text-sky-600' },
  { key: 'wants', ...TRANCHES.wants, tone: 'bg-amber-500', text: 'text-amber-600' },
  { key: 'savings', ...TRANCHES.savings, tone: 'bg-emerald-500', text: 'text-emerald-600' },
  { key: 'none', label: 'Unknown', target: 0, good: 'under', tone: 'bg-slate-400', text: 'text-slate-500' },
]
const sections = computed(() => SECTIONS.map(s => {
  const rs = rows.value.filter(r => r.tranche === s.key)
  const groups = SPENDING_GROUPS.map(g => {
    const grs = rs.filter(r => r.groupId === g.id).sort(bySort[sort.value])
    return { g, rows: grs, spent: grs.reduce((a, r) => a + r.spent, 0), budget: grs.reduce((a, r) => a + (r.budget ?? 0), 0) }
  }).filter(x => x.rows.length)
  const spent = rs.reduce((a, r) => a + r.spent, 0), budget = rs.reduce((a, r) => a + (r.budget ?? 0), 0)
  const target = (d.value?.income ?? 0) * s.target
  const ok = s.key === 'none' ? spent === 0 : s.good === 'under' ? spent <= target : spent >= target
  const over = s.good === 'under' && target ? spent / target - 1 : 0
  const barTone = ok ? 'bg-slate-300' : over <= 0.1 ? 'bg-orange-400' : 'bg-rose-500'
  return { ...s, groups, spent, budget, target, ok, barTone, pct: d.value?.income ? spent / d.value.income : 0 }
}).filter(s => s.groups.length || s.key !== 'none'))
const totalSpent = computed(() => rows.value.reduce((a, r) => a + r.spent, 0))
const totalBudget = computed(() => rows.value.reduce((a, r) => a + (r.budget ?? 0), 0))
const incomeBudget = computed(() => (d.value?.incomeRows ?? []).reduce((a: number, r: any) => a + (r.budget ?? 0), 0))
const incomeGroups = computed(() => SPENDING_GROUPS.map(g => ({ g, rows: (d.value?.incomeRows ?? []).filter((r: any) => r.groupId === g.id).sort(bySort[sort.value]) })).filter(x => x.rows.length))

// Optimistic: update the row locally at once, write after the user stops typing, refetch once.
const timers: Record<string, ReturnType<typeof setTimeout>> = {}
function set(categoryId: string, amount: number | null) {
  for (const r of [...(d.value?.rows ?? []), ...(d.value?.incomeRows ?? [])]) if (r.categoryId === categoryId) r.budget = amount
  clearTimeout(timers[categoryId])
  timers[categoryId] = setTimeout(async () => {
    await $fetch('/api/budgets', { method: 'PUT', body: { period: d.value.period.key, categoryId, amount } })
    refresh()
  }, 600)
}
const toast = useToast()
async function spreadBack() { const r = await $fetch<any>('/api/budgets', { method: 'PUT', body: { period: d.value.period.key, spreadBack: true } }); toast.add({ title: r.rows ? `Filled ${r.rows} budget amounts in earlier periods` : 'Earlier periods already had all of these', icon: 'i-lucide-copy' }); refreshNuxtData() }
async function copyPrev() { await $fetch('/api/budgets', { method: 'PUT', body: { period: d.value.period.key, copyFrom: d.value.prevKey } }); refresh() }
async function useAverages() { for (const r of rows.value) if (r.budget == null && r.avg > 0) await $fetch('/api/budgets', { method: 'PUT', body: { period: d.value.period.key, categoryId: r.categoryId, amount: Math.ceil(r.avg / 50) * 50 } }); refresh() }
// Quiet by default: grey fill while under; orange a little over (≤10%), red well over.
const incomeTone = (r: any) => !r.budget ? 'bg-slate-300' : r.total >= r.budget ? 'bg-emerald-500' : r.total >= r.budget * 0.9 ? 'bg-amber-400' : 'bg-rose-500'
// Spent vs budget difference, e.g. "+R350" (over) / "−R1,200" (under).
const diff = (spent: number, budget: number) => spent > budget ? `+${money(spent - budget)}` : spent < budget ? `−${money(budget - spent)}` : money(0)
const diffTone = (spent: number, budget: number) => spent > budget ? 'text-rose-600' : spent < budget ? 'text-emerald-600' : ''
const tone = (r: any) => {
  const ref = r.budget ?? r.avg
  if (!ref || r.spent <= ref) return 'bg-slate-300'
  return r.spent <= ref * 1.1 ? 'bg-orange-400' : 'bg-rose-500'
}
// Collapsed sections, remembered per browser.
const collapsed = ref<Record<string, boolean>>({})
try { collapsed.value = JSON.parse(localStorage.getItem('budget.collapsed') || '{}') } catch {}
function toggleSection(k: string) { collapsed.value[k] = !collapsed.value[k]; try { localStorage.setItem('budget.collapsed', JSON.stringify(collapsed.value)) } catch {} }
const drill = reactive({ open: false, categoryId: '' })
function show(categoryId: string) { drill.categoryId = categoryId; drill.open = true }
// Formatted value ("R 4,500") must be fully selected or typing appends to it and the field reverts on blur.
const selectAll = (e: FocusEvent) => requestAnimationFrame(() => (e.target as HTMLInputElement).select())
const zar = { style: 'currency', currency: 'ZAR', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 } as const
</script>

<template>
  <div class="p-6 space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Budget</h1>
        <p class="text-sm text-muted">Income in, then where it went — needs, wants, savings. Set an amount per category; unbudgeted spend still counts.</p>
      </div>
      <div class="flex items-center gap-3">
        <UButton v-if="d?.hasPrevBudget" size="sm" variant="soft" icon="i-lucide-copy" label="Copy previous" @click="copyPrev" />
        <UButton size="sm" variant="soft" icon="i-lucide-wand-sparkles" label="Fill from average" @click="useAverages" />
        <UButton size="sm" variant="soft" icon="i-lucide-history" label="Copy to earlier periods" @click="spreadBack" />
        <UCheckbox v-model="showAll" label="All categories" size="sm" />
        <USelect v-model="sort" :items="sortItems" size="sm" class="w-36" icon="i-lucide-arrow-up-down" />
        <PeriodPicker v-if="d?.periods" :periods="d.periods" :tax-years="d.taxYears" />
      </div>
    </div>

    <BudgetNote v-if="d" :period="d.period.key" :note="d.note" />

    <RuleCard v-if="d" :income="d.income" :rule="d.rule" />

    <!-- income -->
    <div v-if="d" class="rounded-xl border border-default overflow-hidden">
      <div class="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5">
        <div class="flex items-center gap-2 font-semibold"><UIcon name="i-lucide-banknote" class="size-4 text-emerald-600" />Income</div>
        <div class="tnum font-semibold text-emerald-600">{{ money(d.income) }}<span v-if="incomeBudget" class="text-muted font-normal text-sm"> / {{ money(incomeBudget) }} expected</span></div>
      </div>
      <template v-for="{ g, rows: rs } in incomeGroups" :key="g.id">
        <div class="flex items-center justify-between bg-default px-4 py-1.5 border-t border-default text-xs uppercase tracking-wide text-muted">
          <span class="flex items-center gap-1.5"><UIcon :name="g.icon" :class="g.color" class="size-3.5" />{{ g.name }}</span>
          <span class="tnum"><b class="text-highlighted">{{ money(rs.reduce((a: number, r: any) => a + r.total, 0)) }}</b><template v-if="rs.some((r: any) => r.budget != null)"> / {{ money(rs.reduce((a: number, r: any) => a + (r.budget ?? 0), 0)) }} expected</template></span>
        </div>
        <div v-for="r in rs" :key="r.categoryId" class="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5 border-t border-default">
          <div class="min-w-0">
            <div class="flex items-baseline justify-between text-sm mb-1">
              <button type="button" class="font-medium hover:text-primary truncate text-left" @click="show(r.categoryId)">{{ CATEGORY_BY_ID[r.categoryId]?.name ?? r.categoryId }} <span class="text-xs text-muted font-normal">× {{ r.n }}</span></button>
              <span class="tnum text-xs text-muted"><b class="text-highlighted">{{ money(r.total) }}</b><template v-if="r.budget"> / {{ money(r.budget) }} · {{ r.total >= r.budget ? `${money(r.total - r.budget)} above` : `${money(r.budget - r.total)} short` }}</template><template v-else> · {{ pct(r.total / (d.income || 1)) }} of income</template></span>
            </div>
            <StatusBar :value="r.budget ? r.total / r.budget : r.total / (d.income || 1)" :color="incomeTone(r)" />
          </div>
          <span />
          <div class="flex items-center gap-1">
            <UInputNumber :step-snapping="false" :model-value="r.budget" :min="0" :step="500" size="sm" class="w-36" :format-options="zar" placeholder="Expected" @focus="selectAll" @update:model-value="(v: number | null) => set(r.categoryId, v)" />
            <UTooltip text="Clear"><UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" :class="r.budget == null ? 'invisible' : ''" @click="set(r.categoryId, null)" /></UTooltip>
          </div>
        </div>
      </template>
      <div v-if="!d.incomeRows.length" class="px-4 py-3 text-sm text-muted border-t border-default">No income in this period.</div>
    </div>

    <!-- expenditure: same shape as the income header so the two totals line up -->
    <div v-if="d" class="rounded-xl border border-default overflow-hidden">
      <div class="flex items-center justify-between bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5">
        <div class="flex items-center gap-2 font-semibold"><UIcon name="i-lucide-receipt" class="size-4 text-rose-600" />Expenditure</div>
        <div class="flex items-center gap-3">
          <UBadge v-if="totalSpent > d.income" color="error" variant="subtle" icon="i-lucide-triangle-alert">Overspent by {{ money(totalSpent - d.income) }}</UBadge>
          <UBadge v-else color="success" variant="subtle" icon="i-lucide-circle-check">{{ money(d.income - totalSpent) }} unallocated</UBadge>
          <div class="tnum font-semibold text-rose-600">{{ money(totalSpent) }}<span v-if="totalBudget" class="text-muted font-normal text-sm"> / {{ money(totalBudget) }}</span></div>
        </div>
      </div>

      <!-- needs / wants / savings / unknown nest inside the expenditure card -->
      <div v-for="s in sections" :id="s.key" :key="s.key" class="border-t-4 border-default scroll-mt-4">
      <div class="px-4 py-3 bg-elevated/40 cursor-pointer select-none" @click="toggleSection(s.key)">
        <div class="flex items-baseline justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-chevron-down" class="size-4 text-muted transition-transform" :class="{ '-rotate-90': collapsed[s.key] }" />
            <i class="size-2.5 rounded-full" :class="s.tone" />
            <span class="font-semibold">{{ s.label }}</span>
            <template v-if="s.key !== 'none'">
              <UIcon :name="s.ok ? 'i-lucide-circle-check' : 'i-lucide-triangle-alert'" :class="s.ok ? 'text-emerald-600' : 'text-amber-600'" class="size-4" />
              <span class="text-xs text-muted">{{ pct(s.pct) }} of income · target {{ pct(s.target / (d.income || 1)) }} ({{ money(s.target) }})</span>
            </template>
            <span v-else class="text-xs text-muted">Uncategorised or unassigned — sort these so the 50/30/20 is honest.</span>
          </div>
          <div class="flex items-center gap-2 tnum text-sm">
            <UTooltip v-if="s.budget && s.key !== 'none' && (s.good === 'under' ? s.budget > s.target : s.budget < s.target)"
              :text="s.good === 'under' ? `You've budgeted ${money(s.budget)} for ${s.label.toLowerCase()} but the ${pct(s.target / (d.income || 1))} target is ${money(s.target)}. Even on budget you'd miss 50/30/20.` : `You've only budgeted ${money(s.budget)} for savings; the ${pct(s.target / (d.income || 1))} target is ${money(s.target)}.`">
              <UBadge color="warning" variant="subtle" icon="i-lucide-triangle-alert" size="sm">budget {{ s.good === 'under' ? 'over' : 'under' }} target by {{ money(Math.abs(s.budget - s.target)) }}</UBadge>
            </UTooltip>
            <span><b>{{ money(s.spent) }}</b><span v-if="s.budget" class="text-muted"> / {{ money(s.budget) }}</span></span>
            <span v-if="s.budget" class="text-xs" :class="diffTone(s.spent, s.budget)">{{ diff(s.spent, s.budget) }}</span>
          </div>
        </div>
        <StatusBar v-if="s.key !== 'none'" class="mt-2" :value="s.pct" :target="s.target / (d.income || 1)" :color="s.barTone" />
      </div>

      <template v-for="{ g, rows: rs, spent: gSpent, budget: gBudget } in s.groups" :key="g.id">
        <template v-if="!collapsed[s.key]">
        <div class="flex items-center justify-between bg-default px-4 py-1.5 border-t border-default text-xs uppercase tracking-wide text-muted">
          <span class="flex items-center gap-1.5"><UIcon :name="g.icon" :class="g.color" class="size-3.5" />{{ g.name }}</span>
          <span class="tnum"><b class="text-highlighted">{{ money(gSpent) }}</b> / {{ money(gBudget) }} · <span :class="diffTone(gSpent, gBudget)">{{ diff(gSpent, gBudget) }}</span></span>
        </div>
        <div v-for="r in rs" :key="r.categoryId + r.tranche" class="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-2.5 border-t border-default">
          <div class="min-w-0">
            <div class="flex items-baseline justify-between text-sm mb-1">
              <button type="button" class="font-medium hover:text-primary truncate text-left" @click="show(r.categoryId)">{{ CATEGORY_BY_ID[r.categoryId]?.name ?? r.categoryId }} <span class="text-xs text-muted font-normal">× {{ r.n }}</span></button>
              <span class="tnum text-xs text-muted"><b class="text-highlighted">{{ money(r.spent) }}</b><template v-if="r.budget != null"> / {{ money(r.budget) }} · {{ r.spent > r.budget ? `over by ${money(r.spent - r.budget)}` : `${money(r.budget - r.spent)} left` }}</template><template v-else-if="r.avg"> · avg {{ money(r.avg) }}</template></span>
            </div>
            <StatusBar :value="r.budget ? r.spent / r.budget : r.avg ? r.spent / r.avg : 0" :color="tone(r)" />
          </div>
          <UButton v-if="r.avg && r.budget == null" size="xs" variant="ghost" color="neutral" :label="`Use ${money(Math.ceil(r.avg / 50) * 50)}`" @click="set(r.categoryId, Math.ceil(r.avg / 50) * 50)" />
          <span v-else />
          <div class="flex items-center gap-1">
            <UInputNumber :step-snapping="false" :model-value="r.budget" :min="0" :step="50" size="sm" class="w-36" :format-options="zar" placeholder="No budget" @focus="selectAll" @update:model-value="(v: number | null) => set(r.categoryId, v)" />
            <UTooltip text="Clear budget"><UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" :class="r.budget == null ? 'invisible' : ''" @click="set(r.categoryId, null)" /></UTooltip>
          </div>
        </div>
        </template>
      </template>
      <div v-if="!s.groups.length && !collapsed[s.key]" class="px-4 py-3 text-sm text-muted border-t border-default">Nothing here this period.</div>
      </div>
    </div>
    <TransactionDialog v-model:open="drill.open" :category-id="drill.categoryId" :period="d?.period.key" :label="d?.period.label" @changed="refresh" />
  </div>
</template>
