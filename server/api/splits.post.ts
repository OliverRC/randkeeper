// Create/update a split template and (re)apply it to every matching transaction.
export default defineEventHandler(async (event) => {
  const b = await readBody<{ id?: number; pattern: string; name: string; extraCategoryId?: string; lines: { label: string; categoryId: string; amount: number }[] }>(event)
  const pattern = b.pattern.trim()
  if (!pattern || !b.name?.trim()) throw createError({ statusCode: 400, message: 'pattern and name required' })
  let id = b.id
  if (id) run('UPDATE splits SET pattern = ?, name = ?, extraCategoryId = ? WHERE id = ?', pattern, b.name.trim(), b.extraCategoryId || 'shared-expenses', id)
  else id = Number(run('INSERT INTO splits (pattern, name, extraCategoryId) VALUES (?, ?, ?)', pattern, b.name.trim(), b.extraCategoryId || 'shared-expenses').lastInsertRowid)
  // Lines are replaced wholesale; stable ids matter only for keeping hand-edited children, which is rare.
  run('DELETE FROM split_lines WHERE splitId = ?', id)
  b.lines.filter(l => l.label?.trim() && l.categoryId).forEach((l, i) => run('INSERT INTO split_lines (splitId, label, categoryId, amount, sort) VALUES (?, ?, ?, ?, ?)', id, l.label.trim(), l.categoryId, Number(l.amount) || 0, i))
  const sp = loadSplits().find(x => x.id === id)!
  // Children built from old line ids would linger: clear the untouched ones, then rebuild (hand-edited children are kept).
  run("DELETE FROM transactions WHERE edited = 0 AND parentId IN (SELECT id FROM transactions WHERE groupId = 'split' AND lower(description) LIKE ?)", `%${pattern.toLowerCase()}%`)
  return { ok: true, applied: applySplit(sp) }
})
