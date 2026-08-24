export default defineEventHandler(() => {
  const ps = periods()
  return { periods: ps, taxYears: taxYearPeriods(ps) }
})
