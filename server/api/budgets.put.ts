// { period, categoryId, amount | null }  or  { period, copyFrom }  or  { blame: transactionId }
export default defineEventHandler(async (event) => {
  const b = await readBody<{ period: string; categoryId?: string; amount?: number | null; copyFrom?: string; spreadBack?: boolean; note?: string; blame?: string }>(event)
  if (b.blame) {
    // Append the transaction to its period's note as the reason the budget looks the way it does.
    const t = one<{ date: string; merchant: string | null; description: string; amount: number }>('SELECT date, merchant, description, amount FROM transactions WHERE id = ?', b.blame)
    if (!t) throw createError({ statusCode: 404, statusMessage: 'Transaction not found' })
    const p = periods().find(p => t.date >= p.start && t.date <= p.end)
    if (!p) throw createError({ statusCode: 404, statusMessage: 'No period covers that date' })
    const when = new Date(t.date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
    const line = `- **${t.merchant || t.description}** R${Math.round(Math.abs(t.amount)).toLocaleString('en-ZA')} (${when}) — `
    const existing = one<{ note: string }>('SELECT note FROM budget_notes WHERE period = ?', p.key)?.note
    run('INSERT INTO budget_notes (period, note) VALUES (?, ?) ON CONFLICT(period) DO UPDATE SET note = excluded.note', p.key, existing ? `${existing.trimEnd()}\n${line}` : line)
    return { ok: true, period: p.key, label: p.label }
  }
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
