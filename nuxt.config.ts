export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', 'nuxt-auth-utils'],
  css: ['~/assets/css/main.css'],
  colorMode: { preference: 'light', fallback: 'light' },
  runtimeConfig: {
    // Only this address may log in. Set in .env.
    ownerEmail: '',
    // 'mock' until the Investec credentials are wired up; then 'investec'.
    bankProvider: 'mock',
    investec: { clientId: '', clientSecret: '', apiKey: '' },
  },
  nitro: {
    // node:sqlite is a Node built-in; keep it out of the bundle.
    externals: { external: ['node:sqlite'] },
  },
})
