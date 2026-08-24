import { CATEGORY_BY_ID } from '~~/shared/domain'
// Bulk edit. Body: { ids: string[], patch: {...}, remember?: boolean }
// `remember` applies the same change to every other transaction from the same merchant(s)
// and stores a rule so future syncs categorise the same way.
const EDITABLE = ['groupId', 'categoryId', 'tranche', 'wasteful', 'verified', 'flagged', 'note', 'tags'] as const

export default defineEventHandler(async (event) => {
  const { ids, patch, remember } = await readBody<{ ids: string[]; patch: Record<string, any>; remember?: boolean }>(event)
  if (!ids?.length) throw createError({ statusCode: 400, message: 'ids required' })

  // A split child's amount is per-month: change it here and the parent's "extra" line rebalances
  // so the children still sum to the bank transaction. The template's defaults are untouched.
  if ('amount' in patch && ids.length === 1) {
    const t = one<any>('SELECT * FROM transactions WHERE id = ?', ids[0])
    if (t?.parentId && !t.id.endsWith('#extra')) {
      const parent = one<any>('SELECT * FROM transactions WHERE id = ?', t.parentId)!
      const sign = parent.amount < 0 ? -1 : 1
      run('UPDATE transactions SET amount = ?, edited = 1 WHERE id = ?', sign * Math.abs(Number(patch.amount) || 0), t.id)
      const xid = `${parent.id}#extra`
      const others = one<any>('SELECT COALESCE(SUM(amount), 0) s FROM transactions WHERE parentId = ? AND id != ?', parent.id, xid)!.s
      const extra = Math.round((parent.amount - others) * 100) / 100
      if (!extra) run('DELETE FROM transactions WHERE id = ?', xid)
      else if (one('SELECT 1 FROM transactions WHERE id = ?', xid)) run('UPDATE transactions SET amount = ? WHERE id = ?', extra, xid)
      else {
        const sp = matchSplit(parent.description, loadSplits())
        const cid = sp?.extraCategoryId ?? 'shared-expenses', c = CATEGORY_BY_ID[cid]
        run('INSERT INTO transactions (id, accountId, date, description, merchant, amount, groupId, categoryId, tranche, parentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          xid, parent.accountId, parent.date, `${sp?.name ?? 'Split'} – extra`, `${sp?.name ?? 'Split'} extra`, extra, c?.group ?? 'day-to-day', cid, c?.tranche ?? 'none', parent.id)
      }
    }
  }
  const sets: string[] = [], vals: any[] = []
  for (const k of EDITABLE) {
    if (!(k in patch)) continue
    sets.push(`${k} = ?`)
    vals.push(k === 'tags' ? JSON.stringify(patch[k]) : k === 'wasteful' || k === 'verified' || k === 'flagged' ? (patch[k] ? 1 : 0) : patch[k])
  }
  // Changing category without an explicit group/tranche re-derives them from the category.
  if (patch.categoryId && !patch.groupId) { sets.push('groupId = ?'); vals.push(CATEGORY_BY_ID[patch.categoryId]?.group) }
  if (patch.categoryId && !patch.tranche) { sets.push('tranche = ?'); vals.push(CATEGORY_BY_ID[patch.categoryId]?.tranche) }
  // Any hand change to the classification pins the row: rule re-runs leave it alone.
  if (patch.categoryId || patch.groupId || patch.tranche || 'wasteful' in patch) { sets.push('edited = 1'); vals.push() }
  if (sets.length) run(`UPDATE transactions SET ${sets.join(', ')} WHERE id IN (${ids.map(() => '?').join(',')})`, ...vals, ...ids)

  if (remember) {
    const merchants = all<{ merchant: string }>(`SELECT DISTINCT merchant FROM transactions WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)
    // Same field set as above, minus per-transaction note/verified.
    const sibSets = sets.filter(x => !x.startsWith('note') && !x.startsWith('verified') && !x.startsWith('flagged') && !x.startsWith('edited'))
    const sibVals = vals.filter((_, i) => !sets[i].startsWith('note') && !sets[i].startsWith('verified') && !sets[i].startsWith('flagged') && !sets[i].startsWith('edited'))
    for (const { merchant } of merchants) {
      if (!merchant) continue
      if (sibSets.length) run(`UPDATE transactions SET ${sibSets.join(', ')} WHERE merchant = ?`, ...sibVals, merchant)
      if (patch.categoryId) run('INSERT INTO rules (pattern, categoryId, tranche, wasteful) VALUES (?, ?, ?, ?) ON CONFLICT(pattern) DO UPDATE SET categoryId=excluded.categoryId, tranche=excluded.tranche, wasteful=excluded.wasteful',
        merchant, patch.categoryId, patch.tranche ?? null, patch.wasteful ? 1 : 0)
    }
  }
  return { ok: true }
})
