<script setup lang="ts">
import { CATEGORY_BY_ID } from '~~/shared/domain'
const { data: settings, refresh } = await useFetch('/api/settings')
const { data: rules, refresh: refreshRules } = await useFetch('/api/rules')
const toast = useToast()
const form = reactive({ raAnnualCap: 0, tfsaAnnualCap: 0, emergencyFundMonths: 1, periodMode: 'salary', marginalTaxRate: 41 })
watch(settings, s => s && Object.assign(form, { raAnnualCap: s.raAnnualCap, tfsaAnnualCap: s.tfsaAnnualCap, emergencyFundMonths: s.emergencyFundMonths, periodMode: s.periodMode ?? 'salary', marginalTaxRate: Math.round((s.marginalTaxRate ?? 0.41) * 100) }), { immediate: true })
async function save() { await $fetch('/api/settings', { method: 'PUT', body: { ...form, marginalTaxRate: form.marginalTaxRate / 100 } }); refresh(); refreshNuxtData(); toast.add({ title: 'Saved', icon: 'i-lucide-check', color: 'success' }) }

const rule = reactive({ pattern: '', categoryId: null as string | null, wasteful: false })
async function addRule() { if (!rule.pattern || !rule.categoryId) return; await $fetch('/api/rules', { method: 'POST', body: rule }); Object.assign(rule, { pattern: '', categoryId: null, wasteful: false }); refreshRules() }
async function delRule(id: number) { await $fetch('/api/rules', { method: 'DELETE', body: { id } }); refreshRules() }
// Re-run scope: everything, one budget period, or one tax year.
const { data: pds } = await useFetch('/api/periods')
const applyScope = ref('all')
const scopeItems = computed(() => [
  { label: 'All time', value: 'all' },
  ...(pds.value?.taxYears?.length ? [{ type: 'label' as const, label: 'Tax years' }, ...pds.value.taxYears.map((x: any) => ({ label: x.label, value: x.key }))] : []),
  { type: 'label' as const, label: 'Budget periods' },
  ...(pds.value?.periods ?? []).map((x: any) => ({ label: x.label, value: x.key })),
])
async function apply() { const r = await $fetch('/api/rules-apply', { method: 'POST', body: applyScope.value === 'all' ? {} : { period: applyScope.value } }); toast.add({ title: `${r.updated} transactions re-categorised`, icon: 'i-lucide-wand-sparkles' }); refreshNuxtData() }
const { data: splits, refresh: refreshSplits } = await useFetch('/api/splits')
const spOpen = ref(false)
const sp = reactive({ id: undefined as number | undefined, pattern: '', name: '', extraCategoryId: 'shared-expenses', lines: [] as { label: string; categoryId: string | null; amount: number }[] })
function newSplit() { Object.assign(sp, { id: undefined, pattern: '', name: '', extraCategoryId: 'shared-expenses', lines: [{ label: '', categoryId: null, amount: 0 }] }); spOpen.value = true }
function editSplit(x: any) { Object.assign(sp, { id: x.id, pattern: x.pattern, name: x.name, extraCategoryId: x.extraCategoryId, lines: x.lines.map((l: any) => ({ label: l.label, categoryId: l.categoryId, amount: l.amount })) }); spOpen.value = true }
const spTotal = computed(() => sp.lines.reduce((a, l) => a + (Number(l.amount) || 0), 0))
async function saveSplit() {
  const r = await $fetch<any>('/api/splits', { method: 'POST', body: sp })
  spOpen.value = false; refreshSplits(); refreshNuxtData()
  toast.add({ title: r.applied ? `Split applied to ${r.applied} new transaction${r.applied === 1 ? '' : 's'}` : 'Saved — already-split months keep their own amounts', icon: 'i-lucide-split' })
}
async function delSplit(id: number) { await $fetch('/api/splits', { method: 'DELETE', body: { id } }); refreshSplits(); refreshNuxtData() }
const zar = { style: 'currency', currency: 'ZAR', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 } as const
</script>

<template>
  <div class="p-6 space-y-6 max-w-3xl">
    <div><h1 class="text-xl font-semibold">Settings</h1><p class="text-sm text-muted">Limits, periods and categorisation rules.</p></div>

    <UCard>
      <template #header><div class="font-semibold">Tax efficiency targets</div><div class="text-xs text-muted">Figures from docs/IDEA.md. Verify against SARS each tax year.</div></template>
      <div class="grid sm:grid-cols-2 gap-4">
        <UFormField label="Retirement annuity cap" :help="`per tax year (27.5% of income, max R350k). ≈ ${money(form.raAnnualCap / 12)} per month`"><UInputNumber :step-snapping="false" v-model="form.raAnnualCap" :step="5000" :format-options="zar" class="w-full" /></UFormField>
        <UFormField label="TFSA cap" help="per tax year (1 Mar – 28 Feb)"><UInputNumber :step-snapping="false" v-model="form.tfsaAnnualCap" :step="1000" :format-options="zar" class="w-full" /></UFormField>
        <UFormField label="Marginal tax rate" help="your top SARS bracket, %. Used to project the RA rebate."><UInputNumber :step-snapping="false" v-model="form.marginalTaxRate" :min="0" :max="45" class="w-full" /></UFormField>
        <UFormField label="Emergency fund" help="months of income"><UInputNumber :step-snapping="false" v-model="form.emergencyFundMonths" :min="1" :max="12" class="w-full" /></UFormField>
        <UFormField label="Budget periods" help="Salary: payday to payday. Calendar: 1st to month end.">
          <USelect v-model="form.periodMode" :items="[{ label: 'From salary day', value: 'salary' }, { label: 'Calendar month', value: 'calendar' }]" value-key="value" class="w-full" />
        </UFormField>
      </div>
      <template #footer><div class="flex justify-end"><UButton label="Save" @click="save" /></div></template>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div><div class="font-semibold">Categorisation rules</div><div class="text-xs text-muted">If a description contains the pattern, the category is applied on sync. Yours win over the {{ rules?.builtin.length }} built-ins.</div></div>
          <div class="flex items-center gap-2">
            <USelectMenu v-model="applyScope" :items="scopeItems" value-key="value" :search-input="false" size="sm" class="w-44" />
            <UButton size="sm" variant="soft" icon="i-lucide-wand-sparkles" label="Re-run on unverified" @click="apply" />
          </div>
        </div>
      </template>
      <div class="flex gap-2 mb-4">
        <UInput v-model="rule.pattern" placeholder="contains… e.g. woolworths" class="flex-1" @keyup.enter="addRule" />
        <CategorySelect v-model="rule.categoryId" class="w-64" />
        <UCheckbox v-model="rule.wasteful" label="Wasteful" class="self-center" />
        <UButton icon="i-lucide-plus" label="Add" @click="addRule" />
      </div>
      <div v-if="rules?.user.length" class="divide-y divide-default rounded-lg border border-default">
        <div v-for="r in rules.user" :key="r.id" class="flex items-center gap-3 px-3 py-2 text-sm">
          <code class="bg-elevated px-1.5 py-0.5 rounded text-xs">{{ r.pattern }}</code>
          <UIcon name="i-lucide-arrow-right" class="size-3.5 text-muted" />
          <span>{{ CATEGORY_BY_ID[r.categoryId]?.name ?? r.categoryId }}</span>
          <UBadge v-if="r.wasteful" color="error" variant="subtle" size="xs">wasteful</UBadge>
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" class="ml-auto" @click="delRule(r.id)" />
        </div>
      </div>
      <p v-else class="text-sm text-muted">No custom rules yet. Tip: edit a transaction and toggle “Remember for …”.</p>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div><div class="font-semibold">Split templates</div><div class="text-xs text-muted">Break one recurring transfer (e.g. to a joint account) into category lines. Anything left over goes to an "extra" line.</div></div>
          <UButton size="sm" variant="soft" icon="i-lucide-plus" label="New split" @click="newSplit" />
        </div>
      </template>
      <div v-if="splits?.length" class="divide-y divide-default rounded-lg border border-default">
        <div v-for="x in splits" :key="x.id" class="flex items-center gap-3 px-3 py-2 text-sm">
          <code class="bg-elevated px-1.5 py-0.5 rounded text-xs">{{ x.pattern }}</code>
          <UIcon name="i-lucide-arrow-right" class="size-3.5 text-muted" />
          <span class="font-medium">{{ x.name }}</span>
          <span class="text-muted tnum">{{ x.lines.length }} lines · {{ money(x.lines.reduce((a: number, l: any) => a + l.amount, 0)) }}</span>
          <div class="ml-auto flex gap-1">
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" @click="editSplit(x)" />
            <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="delSplit(x.id)" />
          </div>
        </div>
      </div>
      <p v-else class="text-sm text-muted">No split templates yet.</p>
    </UCard>

    <UModal v-model:open="spOpen" :title="sp.id ? 'Edit split' : 'New split'" :ui="{ content: 'max-w-2xl' }">
      <template #body>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Matches descriptions containing"><UInput v-model="sp.pattern" placeholder="joint account" class="w-full" /></UFormField>
            <UFormField label="Name"><UInput v-model="sp.name" placeholder="Joint Account" class="w-full" /></UFormField>
          </div>
          <div class="space-y-2">
            <div class="grid grid-cols-[1fr_1fr_8rem_2rem] gap-2 text-xs text-muted px-1"><span>Line</span><span>Category</span><span class="text-right">Default amount</span><span /></div>
            <div v-for="(l, i) in sp.lines" :key="i" class="grid grid-cols-[1fr_1fr_8rem_2rem] gap-2 items-center">
              <UInput v-model="l.label" placeholder="Rent" size="sm" />
              <CategorySelect v-model="l.categoryId" />
              <UInputNumber :step-snapping="false" v-model="l.amount" :min="0" :step="50" size="sm" :format-options="zar" />
              <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" @click="sp.lines.splice(i, 1)" />
            </div>
            <UButton size="xs" variant="link" icon="i-lucide-plus" label="Add line" @click="sp.lines.push({ label: '', categoryId: null, amount: 0 })" />
          </div>
          <div class="flex items-center justify-between rounded-lg bg-elevated p-3 text-sm">
            <UFormField label="Leftover goes to" class="flex items-center gap-2" :ui="{ label: 'text-xs text-muted' }"><CategorySelect v-model="sp.extraCategoryId" class="w-56" /></UFormField>
            <div class="tnum">Lines total <b>{{ money(spTotal) }}</b></div>
          </div>
          <p class="text-xs text-muted">These amounts are defaults, stamped onto each matching transaction when it's first split. Months already split keep their own copy — adjust those on the transaction itself, in Transactions.</p>
        </div>
      </template>
      <template #footer><div class="flex justify-end gap-2 w-full"><UButton variant="ghost" color="neutral" label="Cancel" @click="spOpen = false" /><UButton label="Save & apply" @click="saveSplit" /></div></template>
    </UModal>

    <UCard>
      <template #header><div class="font-semibold">Bank connection</div></template>
      <p class="text-sm text-muted">Currently using <UBadge variant="subtle" color="warning">mock data</UBadge>. To connect Investec, set <code>NUXT_BANK_PROVIDER=investec</code> and <code>NUXT_INVESTEC_CLIENT_ID / CLIENT_SECRET / API_KEY</code> in <code>.env</code>, then restart and sync. Existing categorisation is preserved; each provider keeps its own database under <code>data/</code>, so switching never mixes mock and real data.</p>
    </UCard>
  </div>
</template>
