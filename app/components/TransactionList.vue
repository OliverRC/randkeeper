<script setup lang="ts">
// The transaction list with all its editing affordances. Used by the Transactions page
// and by the budget drill-in dialog; `query` is passed straight to /api/transactions.
const p = defineProps<{ query: Record<string, any> }>()
const emit = defineEmits<{ changed: [] }>()
const { data: txs, refresh, pending } = await useFetch('/api/transactions', { query: toRef(p, 'query'), watch: [() => p.query] })

const groupedByDate = computed(() => {
  const m = new Map<string, any[]>()
  const list = txs.value ?? []
  // Children sit directly under their parent; orphaned children (parent filtered out) stand alone.
  const ids = new Set(list.map(t => t.id))
  for (const t of list) {
    if (t.parentId && ids.has(t.parentId)) continue
    const day = m.get(t.date) ?? m.set(t.date, []).get(t.date)!
    day.push(t)
    if (t.groupId === 'split') day.push(...list.filter(c => c.parentId === t.id).map(c => ({ ...c, nested: true })))
  }
  return [...m.entries()]
})
const totals = computed(() => {
  const list = txs.value ?? []
  return { n: list.length, in: list.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0), out: list.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0) }
})
defineExpose({ totals })

const selected = ref<Set<string>>(new Set())
const toggle = (id: string) => selected.value.has(id) ? selected.value.delete(id) : selected.value.add(id)
const editing = ref<any[]>([])
const open = ref(false)
function edit(ts: any[]) { editing.value = ts; open.value = true }
function editSelected() { edit((txs.value ?? []).filter(t => selected.value.has(t.id))) }
async function quick(t: any, patch: Record<string, any>) { await $fetch('/api/transactions', { method: 'PATCH', body: { ids: [t.id], patch } }); saved() }
const toast = useToast()
async function blame(t: any) {
  const r = await $fetch<any>('/api/budgets', { method: 'PUT', body: { blame: t.id } })
  toast.add({ title: `Added to the ${r.label} budget note`, description: 'Edit the note on the Budget page to say why.', icon: 'i-lucide-notebook-pen' })
  refreshNuxtData()
}
async function saved() { selected.value.clear(); await refresh(); emit('changed'); refreshNuxtData() }
</script>

<template>
  <div class="space-y-4">
    <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 -translate-y-1" leave-active-class="transition duration-100" leave-to-class="opacity-0">
      <div v-if="selected.size" class="sticky top-0 z-10 flex items-center gap-3 rounded-lg bg-primary text-white px-4 py-2 shadow-lg">
        <span class="text-sm font-medium">{{ selected.size }} selected</span>
        <UButton size="xs" color="neutral" variant="solid" icon="i-lucide-pencil" label="Edit" @click="editSelected" />
        <UButton size="xs" color="neutral" variant="solid" icon="i-lucide-check" label="Mark verified" @click="$fetch('/api/transactions', { method: 'PATCH', body: { ids: [...selected], patch: { verified: true } } }).then(saved)" />
        <UButton size="xs" color="neutral" variant="ghost" class="ml-auto text-white" icon="i-lucide-x" @click="selected.clear()" />
      </div>
    </Transition>

    <UEmpty v-if="!pending && !groupedByDate.length" icon="i-lucide-inbox" title="Nothing here" description="No transactions match these filters." />

    <div v-for="[date, list] in groupedByDate" :key="date" class="rounded-xl border border-default overflow-hidden bg-default">
      <div class="bg-elevated/60 px-4 py-2 text-sm font-medium text-muted flex justify-between">
        <span>{{ fmtDate(date) }}</span>
        <span class="tnum text-xs">{{ money(list.reduce((s: number, t: any) => s + t.amount, 0)) }}</span>
      </div>
      <div v-for="t in list" :key="t.id" class="group flex items-center gap-3 px-4 py-2.5 border-t border-default hover:bg-elevated/40 transition-colors" :class="{ 'bg-primary/5': selected.has(t.id), 'bg-amber-50 dark:bg-amber-950/20': t.flagged, 'pl-12 bg-elevated/20 py-2': t.nested, 'opacity-80': t.groupId === 'split' }">
        <template v-if="t.groupId === 'split'">
          <UIcon name="i-lucide-split" class="size-5 text-muted mx-1" />
          <MerchantAvatar :name="t.merchant || t.description" />
          <div class="flex-1 min-w-0">
            <div class="truncate text-[15px]"><span class="font-medium text-highlighted">{{ t.merchant || t.description }}</span><span class="text-muted"> – {{ t.description }}</span></div>
            <div class="text-xs text-muted mt-0.5">Split into {{ list.filter((c: any) => c.parentId === t.id).length }} lines below — click a line to adjust this month's amounts · <NuxtLink to="/settings" class="text-primary">template</NuxtLink></div>
          </div>
          <div class="w-32 text-right text-[15px]"><Money :value="t.amount" muted /></div>
        </template>
        <template v-else>
        <span class="relative"><i v-if="!t.verified" class="absolute -left-2.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" /><UCheckbox :model-value="selected.has(t.id)" @update:model-value="toggle(t.id)" /></span>
        <UTooltip :text="t.verified ? 'Verified' : 'Mark verified'">
          <button class="size-6 rounded-full grid place-items-center border transition" :class="t.verified ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-default text-muted hover:border-emerald-500 hover:text-emerald-600'" @click="quick(t, { verified: !t.verified })">
            <UIcon name="i-lucide-check" class="size-3.5" />
          </button>
        </UTooltip>
        <MerchantAvatar :name="t.merchant || t.description" />
        <button class="flex-1 min-w-0 text-left" @click="edit([t])">
          <div class="truncate text-[15px]"><span class="font-medium text-highlighted">{{ t.merchant || t.description }}</span><template v-if="t.merchant && t.description.toLowerCase().replace(/\s+/g, ' ') !== t.merchant.toLowerCase()"><span class="text-muted"> – </span><span class="text-muted">{{ t.description }}</span></template></div>
          <div class="flex items-center gap-2 mt-0.5">
            <CategoryBadge :group-id="t.groupId" :category-id="t.categoryId" :tranche="t.tranche" />
            <UBadge v-for="tag in t.tags" :key="tag" size="xs" variant="outline" color="neutral">#{{ tag }}</UBadge>
            <UIcon v-if="t.note" name="i-lucide-sticky-note" class="size-3.5 text-muted" />
            <UBadge v-if="t.reimburses" size="xs" variant="subtle" color="success" icon="i-lucide-undo-2">reimburses {{ t.reimburses.merchant }}</UBadge>
            <UBadge v-for="r in t.reimbursedBy" :key="r.id" size="xs" variant="subtle" color="success" icon="i-lucide-undo-2">reimbursed {{ money(r.amount) }}</UBadge>
            <UBadge v-if="t.parentId" size="xs" variant="subtle" color="neutral" icon="i-lucide-corner-down-right">{{ t.description.replace(/^.*\((.*)\)$/, '$1').replace(/ – extra$/, '') }}</UBadge>
          </div>
        </button>
        <UTooltip :text="t.flagged ? 'Suspicious — click to clear' : 'Flag as suspicious / needs digging'">
          <UButton size="xs" variant="ghost" :color="t.flagged ? 'warning' : 'neutral'" icon="i-lucide-flag" :class="t.flagged ? '' : 'opacity-0 group-hover:opacity-100'" @click="quick(t, { flagged: !t.flagged })" />
        </UTooltip>
        <UTooltip :text="t.wasteful ? 'Wasteful — click to forgive' : 'Tag as wasteful'">
          <UButton size="xs" variant="ghost" :color="t.wasteful ? 'error' : 'neutral'" icon="i-lucide-flame" :class="t.wasteful ? '' : 'opacity-0 group-hover:opacity-100'" @click="quick(t, { wasteful: !t.wasteful })" />
        </UTooltip>
        <UTooltip text="Blame for the budget — add to this period's note">
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-notebook-pen" class="opacity-0 group-hover:opacity-100" @click="blame(t)" />
        </UTooltip>
        <div class="w-32 text-right text-[15px]"><Money :value="t.amount" /></div>
        </template>
      </div>
    </div>

    <TransactionEdit v-model:open="open" :transactions="editing" @saved="saved" />
  </div>
</template>
