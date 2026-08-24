export default defineEventHandler(() => ({
  accounts: all('SELECT * FROM accounts ORDER BY name'),
  lastSync: getSettings().lastSync ?? null,
  periods: periods(),
  taxYears: taxYearPeriods(periods()),
}))
