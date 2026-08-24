export default defineEventHandler((event) => {
  const q = getQuery(event) as Record<string, string>
  const where: string[] = [], p: any[] = []
  if (q.period) { const pr = currentPeriod(q.period); where.push('date BETWEEN ? AND ?'); p.push(pr.start, pr.end) }
  if (q.q) { where.push('(description LIKE ? OR merchant LIKE ?)'); p.push(`%${q.q}%`, `%${q.q}%`) }
  if (q.group) { where.push('groupId = ?'); p.push(q.group) }
  if (q.merchant) { where.push('merchant = ?'); p.push(q.merchant) }
  if (q.category) { where.push('categoryId = ?'); p.push(q.category) }
  if (q.tranche) { where.push('tranche = ?'); p.push(q.tranche) }
  if (q.account) { where.push('accountId = ?'); p.push(q.account) }
  if (q.wasteful === '1') where.push('wasteful = 1')
  if (q.flagged === '1') where.push('flagged = 1')
  if (q.unverified === '1') where.push('verified = 0')
  if (q.uncategorised === '1') where.push("categoryId = 'uncategorised'")
  const sql = `SELECT * FROM transactions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY date DESC, rowid DESC LIMIT 1000`
  const rows = all(sql, ...p)
  const ids = rows.map(t => t.id)
  const q2 = ids.length ? `(${ids.map(() => '?').join(',')})` : '(NULL)'
  const links = all(`SELECT id, linkedId, amount, merchant FROM transactions WHERE linkedId IN ${q2} OR id IN (SELECT linkedId FROM transactions WHERE id IN ${q2})`, ...ids, ...ids)
  const byDebit: Record<string, any[]> = {}, byId: Record<string, any> = {}
  for (const l of links) { byId[l.id] = l; if (l.linkedId) (byDebit[l.linkedId] ??= []).push(l) }
  return rows.map(t => ({ ...t, tags: JSON.parse(t.tags),
    reimburses: t.linkedId ? byId[t.linkedId] ?? null : null,
    reimbursedBy: byDebit[t.id] ?? [] }))
})
