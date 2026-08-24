// Debits a credit could reimburse. With `q`: search all debits by merchant/description/amount.
// Without: the 90 days before the credit, closest amount first.
export default defineEventHandler((event) => {
  const { id, q } = getQuery(event) as { id: string; q?: string }
  const c = one('SELECT * FROM transactions WHERE id = ?', id)
  if (!c) return []
  const base = `SELECT id, date, merchant, description, amount, categoryId FROM transactions WHERE amount < 0 AND parentId IS NULL AND groupId != 'split'`
  if (q?.trim()) {
    const like = `%${q.trim()}%`
    return all(`${base} AND (merchant LIKE ? OR description LIKE ? OR CAST(-amount AS TEXT) LIKE ?) ORDER BY date DESC LIMIT 40`, like, like, like)
  }
  return all(`${base} AND groupId != 'transfer' AND date BETWEEN date(?, '-90 days') AND ? ORDER BY ABS(ABS(amount) - ?) ASC, date DESC LIMIT 40`, c.date, c.date, c.amount)
})
