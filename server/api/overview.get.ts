export default defineEventHandler((event) => {
  const { period: key } = getQuery(event) as { period?: string }
  const ps = periods()
  const period = currentPeriod(key)
  if (!period) return { empty: true, periods: ps }
  const yearly = isTaxYear(period)
  const settings = getSettings()
  const inc = income(period.start, period.end)
  const t = trancheTotals(period.start, period.end)
  // Everything that left the account (incl. uncategorised), matching the budget page's Expenditure total.
  const spent = t.needs + t.wants + t.savings + t.none

  const wasteful = one<{ n: number; total: number }>(`SELECT COUNT(*) n, COALESCE(SUM(-amount),0) total FROM transactions WHERE wasteful = 1 AND (amount < 0 OR linkedId IS NOT NULL) AND date BETWEEN ? AND ?`, period.start, period.end)!
  const topCategories = all(`SELECT categoryId, groupId, SUM(-amount) total, COUNT(*) n FROM transactions WHERE date BETWEEN ? AND ? AND (amount < 0 OR linkedId IS NOT NULL) AND groupId NOT IN ('transfer','split','invest-save-repay') GROUP BY categoryId ORDER BY total DESC LIMIT 8`, period.start, period.end)
  const byGroup = all(`SELECT groupId, SUM(-amount) total FROM transactions WHERE date BETWEEN ? AND ? AND (amount < 0 OR linkedId IS NOT NULL) AND groupId NOT IN ('transfer','split') GROUP BY groupId ORDER BY total DESC`, period.start, period.end)
  const budgetKeys = yearly ? ps.filter(p => p.start >= period.start && p.start <= period.end).map(p => p.key) : [period.key]
  const budget = budgetKeys.length ? one<{ total: number }>(`SELECT COALESCE(SUM(amount),0) total FROM budgets WHERE period IN (${budgetKeys.map(() => '?').join(',')})`, ...budgetKeys)!.total : 0
  const budgetSpend = t.needs + t.wants + t.none
  const attention = one<{ uncat: number; unver: number; flagged: number }>(`SELECT SUM(categoryId = 'uncategorised') uncat, SUM(verified = 0) unver, SUM(flagged = 1) flagged FROM transactions WHERE date BETWEEN ? AND ?`, period.start, period.end)!

  const history = ps.slice(0, 12).reverse().map(p => ({ key: p.key, label: p.label, income: income(p.start, p.end), ...trancheTotals(p.start, p.end),
    wasteful: one<{ t: number }>(`SELECT COALESCE(SUM(-amount),0) t FROM transactions WHERE wasteful = 1 AND (amount < 0 OR linkedId IS NOT NULL) AND date BETWEEN ? AND ?`, p.start, p.end)!.t }))

  // One dot per period for the last 12. Big dot: did money out stay under money in.
  // Small dot: 50/30/20 score. Grey when there's no income to measure against.
  const year = ps.slice(0, 12).reverse().map(p => {
    const inc = income(p.start, p.end)
    const tt = trancheTotals(p.start, p.end)
    const spent = tt.needs + tt.wants + tt.savings + tt.none
    const score = (tt.needs <= inc * 0.5 ? 1 : 0) + (tt.wants <= inc * 0.3 ? 1 : 0) + (tt.savings >= inc * 0.2 ? 1 : 0)
    const status = !inc ? 'none' : spent <= inc ? 'good' : spent <= inc * 1.1 ? 'warn' : 'bad'
    const rule = !inc ? 'none' : score === 3 ? 'good' : score === 2 ? 'warn' : 'bad'
    return { key: p.key, label: p.label, income: inc, spent, score, status, rule }
  })

  const flaggedAll = one<{ n: number }>('SELECT COUNT(*) n FROM transactions WHERE flagged = 1')!.n
  return {
    flaggedAll, period, periods: ps, taxYears: taxYearPeriods(ps), yearly, year, income: inc, spent, net: inc - spent,
    tranches: t,
    rule: (['needs', 'wants', 'savings', 'none'] as const).map(k => ({ key: k, amount: t[k], pct: inc ? t[k] / inc : 0 })),
    wasteful, topCategories, byGroup,
    budget: { total: budget, spent: budgetSpend },
    tax: taxEfficiency(period, settings),
    goals: goalsWithProgress(),
    attention, history,
    accounts: all('SELECT * FROM accounts ORDER BY name'),
  }
})
