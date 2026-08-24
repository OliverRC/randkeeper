export default defineEventHandler(async (event) => {
  const g = await readBody<{ id?: number; name: string; target: number; categoryId?: string | null; startDate: string; manual?: number }>(event)
  if (g.id) run('UPDATE goals SET name=?, target=?, categoryId=?, startDate=?, manual=? WHERE id=?', g.name, g.target, g.categoryId || null, g.startDate, g.manual ?? 0, g.id)
  else run('INSERT INTO goals (name, target, categoryId, startDate, manual) VALUES (?,?,?,?,?)', g.name, g.target, g.categoryId || null, g.startDate, g.manual ?? 0)
  return { ok: true }
})
