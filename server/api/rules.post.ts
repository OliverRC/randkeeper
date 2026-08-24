export default defineEventHandler(async (event) => {
  const r = await readBody<{ pattern: string; categoryId: string; tranche?: string | null; wasteful?: boolean }>(event)
  run('INSERT INTO rules (pattern, categoryId, tranche, wasteful) VALUES (?,?,?,?) ON CONFLICT(pattern) DO UPDATE SET categoryId=excluded.categoryId, tranche=excluded.tranche, wasteful=excluded.wasteful',
    r.pattern.trim(), r.categoryId, r.tranche || null, r.wasteful ? 1 : 0)
  return { ok: true }
})
