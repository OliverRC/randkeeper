<script setup lang="ts">
import { SPENDING_GROUPS, TRANCHES, CATEGORY_BY_ID } from '~~/shared/domain'
const p = defineProps<{ transactions: any[] }>()
const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open')

const one = computed(() => p.transactions.length === 1 ? p.transactions[0] : null)
// Other transactions from the same merchant(s) — offered as "apply to all".
const siblings = ref(0)
watch(() => p.transactions, async (ts) => {
  siblings.value = 0
  const ms = [...new Set(ts.map(t => t.merchant).filter(Boolean))]
  const ids = new Set(ts.map(t => t.id))
  for (const m of ms) siblings.value += (await $fetch<any[]>('/api/transactions', { query: { merchant: m } })).filter(t => !ids.has(t.id)).length
}, { immediate: true })
const form = reactive({ categoryId: '' as string | null, groupId: '' as string | null, tranche: undefined as string | undefined, wasteful: false, verified: false, flagged: false, note: '', tags: [] as string[], remember: false, amount: null as number | null })
// Split children carry this month's copy of the template amount — editable, extra line rebalances.
const splitChild = computed(() => !!one.value?.parentId && !one.value.id.endsWith('#extra'))
watch(() => p.transactions, (ts) => {
  const t = ts[0]
  if (!t) return
  Object.assign(form, { categoryId: one.value ? t.categoryId : null, groupId: one.value ? t.groupId : null, tranche: one.value ? t.tranche : undefined, wasteful: !!t.wasteful, verified: !!t.verified, flagged: !!t.flagged, note: t.note ?? '', tags: [...(t.tags ?? [])], remember: false, amount: one.value?.parentId ? Math.abs(t.amount) : null })
}, { immediate: true })
// Changing category re-derives group + tranche (user can still override after).
watch(() => form.categoryId, (id) => { const c = CATEGORY_BY_ID[id ?? '']; if (c && id !== one.value?.categoryId) { form.groupId = c.group; form.tranche = c.tranche } })

// Reimbursement link (credits only): pick the debit this money-in pays back.
const candidates = ref<any[]>([])
const linkedId = ref<string | null>(null)
const candQ = ref('')
let candTimer: ReturnType<typeof setTimeout>
async function loadCandidates() {
  const t = one.value
  candidates.value = t && t.amount > 0 ? await $fetch<any[]>('/api/transactions/candidates', { query: { id: t.id, q: candQ.value || undefined } }) : []
  // keep the chosen debit in the list even when the search no longer matches it, otherwise the select shows the raw id
  if (linkedId.value && !candidates.value.some(c => c.id === linkedId.value)) {
    const keep = chosen.value ?? (t?.reimburses ? { id: linkedId.value, ...t.reimburses, date: '' } : null)
    if (keep) candidates.value.unshift(keep)
  }
}
const chosen = ref<any>(null)
watch(linkedId, id => { chosen.value = candidates.value.find(c => c.id === id) ?? chosen.value })
watch(() => p.transactions, (ts) => { linkedId.value = ts.length === 1 ? ts[0].linkedId ?? null : null; candQ.value = ''; loadCandidates() }, { immediate: true })
watch(candQ, () => { clearTimeout(candTimer); candTimer = setTimeout(loadCandidates, 250) })
const candidateItems = computed(() => candidates.value.map(c => ({ label: `${c.merchant || c.description} · ${money(c.amount)} · ${c.date}`, value: c.id })))
async function link() {
  await $fetch('/api/transactions/link', { method: 'POST', body: { creditId: one.value.id, debitId: linkedId.value } })
}
const groups = SPENDING_GROUPS.map(g => ({ label: g.name, value: g.id, icon: g.icon }))
const tranches = Object.entries(TRANCHES).map(([k, v]) => ({ label: v.label, value: k }))
const busy = ref(false)
async function save() {
  busy.value = true
  const patch: Record<string, any> = { wasteful: form.wasteful, verified: form.verified, flagged: form.flagged }
  if (form.categoryId) patch.categoryId = form.categoryId
  if (form.groupId) patch.groupId = form.groupId
  if (form.tranche) patch.tranche = form.tranche
  if (one.value) { patch.note = form.note; patch.tags = form.tags }
  if (splitChild.value && form.amount != null && form.amount !== Math.abs(one.value.amount)) patch.amount = form.amount
  else if (form.tags.length) patch.tags = form.tags
  if (one.value && one.value.amount > 0 && (linkedId.value ?? null) !== (one.value.linkedId ?? null)) { await link(); delete patch.categoryId; delete patch.groupId; delete patch.tranche }
  await $fetch('/api/transactions', { method: 'PATCH', body: { ids: p.transactions.map(t => t.id), patch, remember: form.remember } })
  busy.value = false; open.value = false; emit('saved')
}
</script>
<template>
  <USlideover v-model:open="open" :title="one ? one.merchant || 'Transaction' : `Edit ${transactions.length} transactions`" :description="one ? one.description : undefined">
    <template #body>
      <div class="space-y-5">
        <div v-if="one" class="flex items-center justify-between rounded-lg bg-elevated p-3">
          <div class="text-sm text-muted">{{ fmtDate(one.date) }}</div>
          <Money :value="one.amount" class="text-lg" />
        </div>
        <UFormField v-if="splitChild" label="This month's amount" help="Only this transaction's split line — the “extra” line rebalances so the total still matches the bank. The template's defaults are unchanged.">
          <UInputNumber v-model="form.amount" :min="0" :step="50" :step-snapping="false" :format-options="{ style: 'currency', currency: 'ZAR', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }" class="w-full" />
        </UFormField>
        <UFormField v-if="one && one.amount > 0" label="Reimburses" help="Link this money-in to the expense it pays back; the pair nets to zero in budgets and 50/30/20.">
          <div class="flex gap-1">
            <USelectMenu v-model="linkedId" v-model:search-term="candQ" ignore-filter :items="candidateItems" value-key="value" placeholder="Not a reimbursement — search any expense" class="flex-1" :ui="{ content: 'min-w-96' }" />
            <UButton v-if="linkedId" variant="ghost" color="neutral" icon="i-lucide-x" @click="linkedId = null" />
          </div>
        </UFormField>
        <UFormField label="Spending group"><USelectMenu v-model="form.groupId" :items="groups" value-key="value" :search-input="false" class="w-full" /></UFormField>
        <UFormField label="Category"><CategorySelect v-model="form.categoryId" /></UFormField>
        <UFormField label="50 / 30 / 20"><USelect v-model="form.tranche" :items="tranches" value-key="value" placeholder="Keep as is" class="w-full" /></UFormField>
        <div class="rounded-lg border border-default divide-y divide-default">
          <label class="flex items-center justify-between p-3 cursor-pointer">
            <span class="text-sm"><span class="font-medium">Wasteful</span><span class="block text-xs text-muted">Slap on the wrist. Shows on the overview.</span></span>
            <USwitch v-model="form.wasteful" color="error" />
          </label>
          <label class="flex items-center justify-between p-3 cursor-pointer">
            <span class="text-sm"><span class="font-medium">Suspicious</span><span class="block text-xs text-muted">Don't know what this is — needs digging. Stays until you clear it.</span></span>
            <USwitch v-model="form.flagged" color="warning" />
          </label>
          <label class="flex items-center justify-between p-3 cursor-pointer">
            <span class="text-sm"><span class="font-medium">Verified</span><span class="block text-xs text-muted">Reviewed; auto-rules won't touch it again.</span></span>
            <USwitch v-model="form.verified" />
          </label>
          <label v-if="siblings" class="flex items-center justify-between p-3 cursor-pointer bg-primary/5">
            <span class="text-sm"><span class="font-medium">Apply to all {{ siblings }} other {{ one?.merchant || 'matching' }} transaction{{ siblings === 1 ? '' : 's' }}</span><span class="block text-xs text-muted">Same category, group, 50/30/20, wasteful and tags — and remember it for future syncs.</span></span>
            <USwitch v-model="form.remember" />
          </label>
        </div>
        <template v-if="one">
          <UFormField label="Tags"><UInputTags v-model="form.tags" placeholder="Add tag…" class="w-full" /></UFormField>
          <UFormField label="Note"><UTextarea v-model="form.note" :rows="2" class="w-full" /></UFormField>
        </template>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2 w-full justify-end">
        <UButton variant="ghost" color="neutral" label="Cancel" @click="open = false" />
        <UButton label="Save" :loading="busy" @click="save" />
      </div>
    </template>
  </USlideover>
</template>
