// Re-run categorisation over transactions nobody has touched (not verified, not hand-edited).
export default defineEventHandler(() => {
  const rules = all<Rule>('SELECT pattern, categoryId, tranche, wasteful FROM rules ORDER BY id DESC')
  const upd = db().prepare('UPDATE transactions SET categoryId=?, groupId=?, tranche=?, wasteful=?, merchant=? WHERE id=?')
  let n = 0
  for (const t of all('SELECT id, description, amount, categoryId, merchant FROM transactions WHERE verified = 0 AND edited = 0')) {
    const c = categorise(t.description, t.amount, rules)
    const m = merchantOf(t.description)
    if (c.categoryId !== t.categoryId || m !== t.merchant) { upd.run(c.categoryId, c.groupId, c.tranche, c.wasteful, m, t.id); n++ }
  }
  return { updated: n }
})
