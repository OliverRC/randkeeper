<script setup lang="ts">
const { clear } = useUserSession()
const { data: meta, refresh } = await useFetch('/api/accounts')
const syncing = ref(false)
const toast = useToast()

async function sync() {
  syncing.value = true
  try {
    const r = await $fetch('/api/sync', { method: 'POST' })
    toast.add({ title: `Synced ${r.accounts} accounts`, description: `${r.inserted} new transactions`, icon: 'i-lucide-check', color: 'success' })
    await refresh()
    refreshNuxtData()
  } finally { syncing.value = false }
}
async function logout() { await $fetch('/api/auth/logout', { method: 'POST' }); await clear(); navigateTo('/login') }

const links = [
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: 'Transactions', icon: 'i-lucide-receipt', to: '/transactions' },
  { label: 'Budget', icon: 'i-lucide-wallet', to: '/budget' },
  { label: 'Goals', icon: 'i-lucide-target', to: '/goals' },
  { label: 'Settings', icon: 'i-lucide-settings-2', to: '/settings' },
]
const lastSync = computed(() => meta.value?.lastSync ? new Date(meta.value.lastSync).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }) : 'never')
const total = computed(() => (meta.value?.accounts ?? []).reduce((s: number, a: any) => s + a.balance, 0))
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2.5 px-1">
          <div class="size-8 rounded-lg bg-primary text-white grid place-items-center font-bold text-sm shrink-0">R</div>
          <div v-if="!collapsed" class="leading-tight">
            <div class="font-semibold text-sm flex items-center gap-1.5">Randkeeper<UBadge v-if="meta?.demo" size="sm" color="warning" variant="subtle">Demo</UBadge></div>
            <div class="text-[11px] text-muted">{{ meta?.demo ? 'Mock data — not your bank' : 'Private ledger' }}</div>
          </div>
        </div>
      </template>
      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="links" orientation="vertical" />
        <div v-if="!collapsed && meta?.accounts?.length" class="mt-4 px-2.5 space-y-2">
          <div class="text-[11px] uppercase tracking-wider text-muted font-medium">Accounts</div>
          <div v-for="a in meta.accounts" :key="a.id" class="text-sm flex justify-between gap-2">
            <span class="truncate text-muted">{{ a.name }}</span>
            <span class="tnum font-medium">{{ money(a.balance) }}</span>
          </div>
          <USeparator />
          <div class="text-sm flex justify-between gap-2"><span class="text-muted">Total</span><span class="tnum font-semibold">{{ money(total) }}</span></div>
        </div>
      </template>
      <template #footer="{ collapsed }">
        <div class="flex flex-col gap-1 w-full">
          <UButton :label="collapsed ? undefined : 'Sync bank'" icon="i-lucide-refresh-cw" variant="soft" block :loading="syncing" @click="sync" />
          <div v-if="!collapsed" class="text-[11px] text-muted text-center">Last sync {{ lastSync }}</div>
          <UButton :label="collapsed ? undefined : 'Sign out'" icon="i-lucide-log-out" variant="ghost" color="neutral" block @click="logout" />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #body>
        <div class="max-w-6xl mx-auto w-full">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
