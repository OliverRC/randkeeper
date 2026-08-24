// { period, categoryId, amount | null }  or  { period, copyFrom }
export default defineEventHandler(async (event) => {
  const b = await readBody<{ period: string; categoryId?: string; amount?: number | null; copyFrom?: string; spreadBack?: boolean; note?: string }>(event)
  if (typeof b.note === 'string') { run('INSERT INTO budget_notes (period, note) VALUES (?, ?) ON CONFLICT(period) DO UPDATE SET note = excluded.note', b.period, b.note); return { ok: true } }
  if (b.spreadBack) {
    // Copy this period's per-category amounts to every earlier period, filling only categories
    // that have no amount there yet (existing amounts are kept).
    const ps = periods(), i = ps.findIndex(p => p.key === b.period)
    let n = 0
    for (const p of ps.slice(i + 1)) {
      const r = run('INSERT OR IGNORE INTO budgets (period, categoryId, amount) SELECT ?, categoryId, amount FROM budgets WHERE period = ?', p.key, b.period)
      n += Number(r.changes)
    }
    return { ok: true, rows: n }
  }
  if (b.copyFrom) {
    run('INSERT OR REPLACE INTO budgets (period, categoryId, amount) SELECT ?, categoryId, amount FROM budgets WHERE period = ?', b.period, b.copyFrom)
  } else if (b.categoryId) {
    if (b.amount == null || b.amount <= 0) run('DELETE FROM budgets WHERE period = ? AND categoryId = ?', b.period, b.categoryId)
    else run('INSERT OR REPLACE INTO budgets (period, categoryId, amount) VALUES (?, ?, ?)', b.period, b.categoryId, b.amount)
  }
  return { ok: true }
})
