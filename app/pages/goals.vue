<script setup lang="ts">
import { CATEGORY_BY_ID, localISO, taxYearStart } from '~~/shared/domain'
const { data: goals, refresh } = await useFetch('/api/goals')
const { data: settings } = await useFetch('/api/settings')
const { data: ov } = await useFetch('/api/overview')
const open = ref(false)
const blank = () => ({ id: undefined as number | undefined, name: '', target: 0, categoryId: null as string | null, startDate: new Date().toISOString().slice(0, 10), manual: 0 })
const form = reactive(blank())
function add(preset?: Partial<ReturnType<typeof blank>>) { Object.assign(form, blank(), preset); open.value = true }
function edit(g: any) { Object.assign(form, g); open.value = true }
async function save() { await $fetch('/api/goals', { method: 'POST', body: form }); open.value = false; refresh() }
async function del(id: number) { await $fetch('/api/goals', { method: 'DELETE', body: { id } }); refresh() }

const salary = computed(() => (ov.value as any)?.income ?? 0)
const sixMonthsAgo = localISO(new Date(Date.now() - 182 * 86400_000))
const presets = computed(() => [
  { name: 'Emergency fund', target: Math.round(salary.value * (settings.value?.emergencyFundMonths ?? 1)), categoryId: 'emergency-fund', startDate: sixMonthsAgo, hint: `${settings.value?.emergencyFundMonths ?? 1} month of income` },
  { name: 'TFSA this tax year', target: settings.value?.tfsaAnnualCap ?? 46000, categoryId: 'tax-free-savings-tfsa', startDate: taxYearStart(new Date()), hint: 'Annual cap' },
  { name: "Blake's TFSA (half)", target: Math.round((settings.value?.tfsaAnnualCap ?? 46000) / 2), categoryId: 'blake-s-tfsa', startDate: taxYearStart(new Date()), hint: 'Your half of her annual cap' },
])
</script>

<template>
  <div class="p-6 space-y-5">
    <div class="flex items-center justify-between">
      <div><h1 class="text-xl font-semibold">Goals</h1><p class="text-sm text-muted">Progress is the sum of a linked category since the start date, plus anything you add manually.</p></div>
      <UButton icon="i-lucide-plus" label="New goal" @click="add()" />
    </div>

    <div v-if="!goals?.length" class="grid sm:grid-cols-3 gap-3">
      <button v-for="p in presets" :key="p.name" class="text-left rounded-xl border border-dashed border-default p-4 hover:border-primary hover:bg-primary/5 transition" @click="add(p)">
        <div class="font-medium">{{ p.name }}</div>
        <div class="text-sm text-muted">{{ p.hint }} · {{ money(p.target) }}</div>
      </button>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <UCard v-for="g in goals" :key="g.id">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold">{{ g.name }}</div>
            <div class="text-xs text-muted">{{ g.categoryId ? `Linked to ${CATEGORY_BY_ID[g.categoryId]?.name}` : 'Manual' }} · since {{ g.startDate }}</div>
          </div>
          <div class="flex gap-1">
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" @click="edit(g)" />
            <UButton size="xs" variant="ghost" color="error" icon="i-lucide-trash-2" @click="del(g.id)" />
          </div>
        </div>
        <div class="mt-4 flex items-end justify-between">
          <div class="text-2xl"><Money :value="g.current" /></div>
          <div class="text-sm text-muted tnum">of {{ money(g.target) }} · {{ pct(g.pct) }}</div>
        </div>
        <StatusBar class="mt-2" :value="g.pct" :color="g.pct >= 1 ? 'bg-emerald-500' : 'bg-indigo-500'" />
        <div v-if="g.pct >= 1" class="mt-2 text-xs text-emerald-600 flex items-center gap-1"><UIcon name="i-lucide-party-popper" class="size-3.5" />Done. Set the next one.</div>
        <div v-else class="mt-2 text-xs text-muted tnum">{{ money(g.target - g.current) }} to go</div>
      </UCard>
    </div>

    <UModal v-model:open="open" :title="form.id ? 'Edit goal' : 'New goal'">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Name"><UInput v-model="form.name" class="w-full" /></UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Target"><UInputNumber :step-snapping="false" v-model="form.target" :min="0" :step="500" class="w-full" :format-options="{ style: 'currency', currency: 'ZAR', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }" /></UFormField>
            <UFormField label="Count from"><UInput v-model="form.startDate" type="date" class="w-full" /></UFormField>
          </div>
          <UFormField label="Linked category" hint="optional"><CategorySelect v-model="form.categoryId" /></UFormField>
          <UFormField label="Manual amount" hint="added on top"><UInputNumber :step-snapping="false" v-model="form.manual" :step="500" class="w-full" :format-options="{ style: 'currency', currency: 'ZAR', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }" /></UFormField>
        </div>
      </template>
      <template #footer><div class="flex justify-end gap-2 w-full"><UButton variant="ghost" color="neutral" label="Cancel" @click="open = false" /><UButton label="Save" @click="save" /></div></template>
    </UModal>
  </div>
</template>
