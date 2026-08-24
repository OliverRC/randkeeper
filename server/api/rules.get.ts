export default defineEventHandler(() => ({ user: all('SELECT * FROM rules ORDER BY id DESC'), builtin: BUILTIN_RULES }))
