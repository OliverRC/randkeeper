import { CATEGORY_BY_ID } from '~~/shared/domain'

export interface Split { id: number; pattern: string; name: string; extraCategoryId: string; lines: { id: number; label: string; categoryId: string; amount: number; sort: number }[] }

export function loadSplits(): Split[] {
  const lines = all('SELECT * FROM split_lines ORDER BY sort, id')
  return all('SELECT * FROM splits ORDER BY id').map(sp => ({ ...sp, lines: lines.filter(l => l.splitId === sp.id) }))
}

export const matchSplit = (description: string, splits: Split[]) => splits.find(sp => description.toLowerCase().includes(sp.pattern.toLowerCase()))

/**
 * Turn one bank transaction into a parent (excluded from stats) plus one child per template
 * line, with any leftover in an "extra" line. Children are ordinary transactions.
 * Hand-edited children are kept; everything else is regenerated.
 */
export function materialise(tx: { id: string; accountId: string; date: string; amount: number }, sp: Split) {
  run("UPDATE transactions SET groupId = 'split', categoryId = 'split', tranche = 'none' WHERE id = ?", tx.id)
  run('DELETE FROM transactions WHERE parentId = ? AND edited = 0', tx.id)
  const kept = new Set(all<{ id: string }>('SELECT id FROM transactions WHERE parentId = ?', tx.id).map(r => r.id))
  const ins = db().prepare(`INSERT INTO transactions (id, accountId, date, description, merchant, amount, groupId, categoryId, tranche, parentId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const sign = tx.amount < 0 ? -1 : 1
  let allocated = 0
  for (const l of sp.lines) {
    allocated += l.amount
    const id = `${tx.id}#${l.id}`
    if (kept.has(id) || !l.amount) continue
    const c = CATEGORY_BY_ID[l.categoryId]
    ins.run(id, tx.accountId, tx.date, `${l.label} (${sp.name})`, l.label, sign * l.amount, c?.group ?? 'day-to-day', l.categoryId, c?.tranche ?? 'none', tx.id)
  }
  const extra = Math.round((Math.abs(tx.amount) - allocated) * 100) / 100
  const xid = `${tx.id}#extra`
  if (extra && !kept.has(xid)) {
    const c = CATEGORY_BY_ID[sp.extraCategoryId]
    ins.run(xid, tx.accountId, tx.date, `${sp.name} – extra`, `${sp.name} extra`, sign * extra, c?.group ?? 'day-to-day', sp.extraCategoryId, c?.tranche ?? 'none', tx.id)
  }
}

/**
 * Apply a template to matching parents that aren't split yet. Template amounts are defaults,
 * locked into each transaction at apply time — editing the template never rewrites months
 * already split; those are adjusted on the transaction itself.
 */
export function applySplit(sp: Split) {
  let n = 0
  for (const t of all(`SELECT id, accountId, date, amount, description FROM transactions WHERE parentId IS NULL AND COALESCE(groupId, '') != 'split' AND lower(description) LIKE ?`, `%${sp.pattern.toLowerCase()}%`)) { materialise(t, sp); n++ }
  return n
}

/** Undo: delete children and let the rules re-categorise the parent. */
export function unsplit(pattern: string, rules: Rule[]) {
  for (const t of all(`SELECT id, description, amount FROM transactions WHERE groupId = 'split' AND lower(description) LIKE ?`, `%${pattern.toLowerCase()}%`)) {
    run('DELETE FROM transactions WHERE parentId = ?', t.id)
    const c = categorise(t.description, t.amount, rules)
    run('UPDATE transactions SET groupId = ?, categoryId = ?, tranche = ? WHERE id = ?', c.groupId, c.categoryId, c.tranche, t.id)
  }
}
