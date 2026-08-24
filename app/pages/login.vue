<script setup lang="ts">
definePageMeta({ layout: false })
const { fetch: refreshSession } = useUserSession()
const email = ref('')
const code = ref<string[]>([])
const step = ref<'email' | 'code'>('email')
const busy = ref(false)
const error = ref('')

async function request() {
  busy.value = true; error.value = ''
  await $fetch('/api/auth/request', { method: 'POST', body: { email: email.value } })
  step.value = 'code'; busy.value = false
}
async function verify() {
  busy.value = true; error.value = ''
  try {
    await $fetch('/api/auth/verify', { method: 'POST', body: { email: email.value, code: code.value.join('') } })
    await refreshSession()
    navigateTo('/')
  } catch (e: any) { error.value = e?.data?.message ?? 'Login failed' } finally { busy.value = false }
}
</script>

<template>
  <div class="min-h-screen grid place-items-center bg-elevated/40 p-4">
    <UCard class="w-full max-w-sm">
      <div class="flex items-center gap-3 mb-6">
        <div class="size-10 rounded-xl bg-primary text-white grid place-items-center font-bold">R</div>
        <div><div class="font-semibold">Randkeeper</div><div class="text-sm text-muted">Sign in with your email</div></div>
      </div>
      <form v-if="step === 'email'" class="space-y-4" @submit.prevent="request">
        <UFormField label="Email"><UInput v-model="email" type="email" autofocus placeholder="you@example.com" class="w-full" /></UFormField>
        <UButton type="submit" block :loading="busy" label="Send code" />
      </form>
      <form v-else class="space-y-4" @submit.prevent="verify">
        <p class="text-sm text-muted">We sent a 6-digit code to <b>{{ email }}</b>. <span class="text-xs">(Locally: check the terminal running the app.)</span></p>
        <UPinInput v-model="code" :length="6" otp autofocus size="xl" class="justify-center" @complete="verify" />
        <p v-if="error" class="text-sm text-error">{{ error }}</p>
        <UButton type="submit" block :loading="busy" label="Sign in" />
        <UButton variant="link" color="neutral" block label="Use a different email" @click="step = 'email'" />
      </form>
    </UCard>
  </div>
</template>
