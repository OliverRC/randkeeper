export default defineEventHandler(async (event) => {
  const { id } = await readBody<{ id: number }>(event)
  const sp = one<{ pattern: string }>('SELECT pattern FROM splits WHERE id = ?', id)
  if (sp) unsplit(sp.pattern, all<Rule>('SELECT pattern, categoryId, tranche, wasteful FROM rules ORDER BY id DESC'))
  run('DELETE FROM split_lines WHERE splitId = ?', id); run('DELETE FROM splits WHERE id = ?', id)
  return { ok: true }
})
