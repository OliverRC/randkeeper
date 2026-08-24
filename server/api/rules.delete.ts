export default defineEventHandler(async (event) => { const { id } = await readBody(event); run('DELETE FROM rules WHERE id = ?', id); return { ok: true } })
