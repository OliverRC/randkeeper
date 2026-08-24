import { localISO } from '~~/shared/domain'
// Pull accounts + transactions from the bank provider into SQLite.
// Idempotent: existing transactions keep their (possibly hand-edited) categorisation.
export default defineEventHandler(async () => {
  const bank = useBank()
  const rules = all<Rule>('SELECT pattern, categoryId, tranche, wasteful FROM rules ORDER BY id DESC')
  const splits = loadSplits()
  const accounts = await bank.accounts()
  const to = localISO()
  const from = localISO(new Date(Date.now() - 400 * 86400_000))
  let inserted = 0
  const ins = db().prepare(`INSERT OR IGNORE INTO transactions (id, accountId, date, description, merchant, amount, groupId, categoryId, tranche, wasteful)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  for (const a of accounts) {
    run('INSERT INTO accounts (id, name, type, number, balance) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET balance = excluded.balance, name = excluded.name',
      a.accountId, a.accountName, a.productName, a.accountNumber, a.currentBalance)
    for (const t of await bank.transactions(a.accountId, from, to)) {
      const c = categorise(t.description, t.amount, rules)
      const r = ins.run(t.uuid, a.accountId, t.transactionDate, t.description, merchantOf(t.description), t.amount, c.groupId, c.categoryId, c.tranche, c.wasteful)
      inserted += Number(r.changes)
      if (r.changes) { const sp = matchSplit(t.description, splits); if (sp) materialise({ id: t.uuid, accountId: a.accountId, date: t.transactionDate, amount: t.amount }, sp) }
    }
  }
  setSetting('lastSync', Date.now())
  return { inserted, accounts: accounts.length }
})
