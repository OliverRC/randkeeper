<script setup lang="ts">
useHead({ title: 'Randkeeper' })
// Keep the selected period in ?period= so a reload stays on it. Synced here once, not in usePeriod, so pages calling it don't stack duplicate watchers.
const route = useRoute(), router = useRouter(), period = usePeriod()
period.value = (route.query.period as string) || period.value
// Also re-append after in-app navigation, which drops the query.
watch([period, () => route.path], () => {
  if ((route.query.period ?? undefined) !== (period.value || undefined)) router.replace({ query: { ...route.query, period: period.value || undefined } })
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
