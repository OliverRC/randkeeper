export default defineEventHandler(() => ({
  demo: (useRuntimeConfig().bankProvider || 'mock') !== 'investec',
  accounts: all('SELECT * FROM accounts ORDER BY name'),
  lastSync: getSettings().lastSync ?? null,
  periods: periods(),
  taxYears: taxYearPeriods(periods()),
}))
