// Email OTP, step 1. Until an email provider is wired, the code is printed to
// the server terminal (this app runs locally, for one person).
export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)
  const owner = useRuntimeConfig().ownerEmail
  const ok = !!owner && email?.trim().toLowerCase() === owner.trim().toLowerCase()
  if (ok) {
    const code = (crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).toString().padStart(6, '0')
    run('INSERT INTO otp (email, code, expiresAt, attempts) VALUES (?, ?, ?, 0) ON CONFLICT(email) DO UPDATE SET code=excluded.code, expiresAt=excluded.expiresAt, attempts=0',
      owner.toLowerCase(), code, Date.now() + 10 * 60_000)
    // ponytail: console "email". Swap for a real sender when hosting beyond localhost.
    console.log(`\n  ┌──────────────────────────┐\n  │  Login code: ${code}      │\n  └──────────────────────────┘\n`)
  }
  // Always 200 so the form can't be used to probe which email is the owner.
  return { ok: true }
})
