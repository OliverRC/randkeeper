export default defineEventHandler(async (event) => {
  const { email, code } = await readBody<{ email: string; code: string }>(event)
  const key = (email ?? '').trim().toLowerCase()
  const row = one<{ code: string; expiresAt: number; attempts: number }>('SELECT * FROM otp WHERE email = ?', key)
  if (!row || row.attempts >= 5 || Date.now() > row.expiresAt) throw createError({ statusCode: 401, message: 'Code expired or locked. Request a new one.' })
  if (row.code !== String(code).trim()) {
    run('UPDATE otp SET attempts = attempts + 1 WHERE email = ?', key)
    throw createError({ statusCode: 401, message: 'Incorrect code.' })
  }
  run('DELETE FROM otp WHERE email = ?', key)
  await setUserSession(event, { user: { email: key }, loggedInAt: Date.now() })
  return { ok: true }
})
