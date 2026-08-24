export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  for (const [k, v] of Object.entries(body)) setSetting(k, v)
  return getSettings()
})
