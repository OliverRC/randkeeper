import { CATEGORY_BY_ID } from '~~/shared/domain'
export default defineEventHandler((event) => {
  const { period: key } = getQuery(event) as { period?: string }
  const ps = periods()
  const period = currentPeriod(key)
  if (!period) return { periods: ps, rows: [], incomeRows: [] }
  const prev = ps.slice(ps.indexOf(period) + 1, ps.indexOf(period) + 4)

  const budgets = Object.fromEntries(all<{ categoryId: string; amount: number }>('SELECT categoryId, amount FROM budgets WHERE period = ?', period.key).map(b => [b.categoryId, b.amount]))
  const incomeRows = all(`SELECT groupId, categoryId, SUM(amount) total, COUNT(*) n FROM transactions WHERE date BETWEEN ? AND ? AND amount > 0 AND groupId = 'income' GROUP BY groupId, categoryId ORDER BY total DESC`, period.start, period.end).map(r => ({ ...r, budget: budgets[r.categoryId] ?? null }))
  // Budgeted income categories with nothing received yet still show (e.g. salary not in yet).
  for (const [id, amount] of Object.entries(budgets)) if (CATEGORY_BY_ID[id]?.group === 'income' && !incomeRows.some(r => r.categoryId === id)) incomeRows.push({ groupId: 'income', categoryId: id, total: 0, n: 0, budget: amount })
  const inc = incomeRows.reduce((s, r) => s + r.total, 0)

  // Spend rows keyed by the tranche the transactions actually carry (a category can be split across tranches by hand).
  const spend = all<{ tranche: string; groupId: string; categoryId: string; total: number; n: number }>(
    `SELECT tranche, groupId, categoryId, SUM(-amount) total, COUNT(*) n FROM transactions WHERE date BETWEEN ? AND ? AND (amount < 0 OR linkedId IS NOT NULL) AND groupId NOT IN ('transfer','split','income') GROUP BY tranche, groupId, categoryId`, period.start, period.end)
  const avg: Record<string, number> = {}
  if (prev.length) for (const r of all<{ categoryId: string; total: number }>(`SELECT categoryId, SUM(-amount)/${prev.length}.0 total FROM transactions WHERE date BETWEEN ? AND ? AND (amount < 0 OR linkedId IS NOT NULL) AND groupId NOT IN ('transfer','split','income') GROUP BY categoryId`, prev[prev.length - 1].start, prev[0].end)) avg[r.categoryId] = r.total

  const rowKey = (t: string, g: string, c: string) => `${t}|${g}|${c}`
  const rows = new Map(spend.map(r => [rowKey(r.tranche, r.groupId, r.categoryId), { ...r, budget: null as number | null, avg: avg[r.categoryId] ?? 0 }]))
  // Budgets and averages for categories with no spend this period sit under the category's default tranche/group.
  for (const id of new Set([...Object.keys(budgets), ...Object.keys(avg)])) {
    const c = CATEGORY_BY_ID[id]; if (!c || c.group === 'income' || c.group === 'transfer') continue
    const k = rowKey(c.tranche, c.group, id)
    if (!rows.has(k) && ![...rows.values()].some(r => r.categoryId === id)) rows.set(k, { tranche: c.tranche, groupId: c.group, categoryId: id, total: 0, n: 0, budget: null, avg: avg[id] ?? 0 })
  }
  // Attach each budget to exactly one row (the default-tranche row if it exists).
  for (const [id, amount] of Object.entries(budgets)) {
    const c = CATEGORY_BY_ID[id]
    const r = rows.get(rowKey(c?.tranche, c?.group, id)) ?? [...rows.values()].find(r => r.categoryId === id)
    if (r) r.budget = amount
  }

  const list = [...rows.values()].map(r => ({ ...r, spent: r.total }))
  const t = { needs: 0, wants: 0, savings: 0, none: 0 }
  for (const r of list) t[r.tranche as keyof typeof t] += r.spent
  const rule = (['needs', 'wants', 'savings', 'none'] as const).map(k => ({ key: k, amount: t[k], pct: inc ? t[k] / inc : 0 }))
  const hasPrevBudget = !!prev.length && !!one('SELECT 1 FROM budgets WHERE period = ?', prev[0].key)
  return { period, periods: ps, taxYears: taxYearPeriods(ps), note: one<{ note: string }>('SELECT note FROM budget_notes WHERE period = ?', period.key)?.note ?? '', rows: list, incomeRows, income: inc, tranches: t, rule, hasPrevBudget, prevKey: prev[0]?.key }
})
