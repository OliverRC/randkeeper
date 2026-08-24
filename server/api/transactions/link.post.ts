// Mark a credit as reimbursing a debit. The credit takes the debit's classification and is
// excluded from income; spend queries count it as negative spend so the pair nets out.
export default defineEventHandler(async (event) => {
  const { creditId, debitId } = await readBody<{ creditId: string; debitId: string | null }>(event)
  const credit = one('SELECT * FROM transactions WHERE id = ?', creditId)
  if (!credit || credit.amount <= 0) throw createError({ statusCode: 400, message: 'creditId must be a money-in transaction' })
  if (!debitId) {
    // unlink: back to income, re-categorised by the rules
    const c = categorise(credit.description, credit.amount, all<Rule>('SELECT pattern, categoryId, tranche, wasteful FROM rules ORDER BY id DESC'))
    run('UPDATE transactions SET linkedId = NULL, groupId = ?, categoryId = ?, tranche = ?, edited = 1 WHERE id = ?', c.groupId, c.categoryId, c.tranche, creditId)
    return { ok: true }
  }
  const debit = one('SELECT * FROM transactions WHERE id = ?', debitId)
  if (!debit || debit.amount >= 0) throw createError({ statusCode: 400, message: 'debitId must be a money-out transaction' })
  run('UPDATE transactions SET linkedId = ?, groupId = ?, categoryId = ?, tranche = ?, edited = 1 WHERE id = ?', debitId, debit.groupId, debit.categoryId, debit.tranche, creditId)
  return { ok: true }
})
