# Randkeeper

Personal finance for one person: Investec transactions → categorised → budget, 50/30/20, tax efficiency, goals.

```sh
pnpm install
pnpm dev          # http://localhost:4100
```

Login: enter the email in `NUXT_OWNER_EMAIL` (.env). The 6-digit code is printed in the terminal (no email provider yet).
Then **Sync bank** in the sidebar. With `NUXT_BANK_PROVIDER=mock` (default) this loads ~6 months of fake data.

## Connecting Investec

```
NUXT_BANK_PROVIDER=investec
NUXT_INVESTEC_CLIENT_ID=...
NUXT_INVESTEC_CLIENT_SECRET=...
NUXT_INVESTEC_API_KEY=...
```

Each provider has its own database (`data/wealth.<provider>.db`), so mock and real data never mix. The Investec client lives in `server/utils/bank.ts` and is untested.

## Layout

- `shared/domain.ts` — spending groups, categories (with default needs/wants/savings), tax constants, money formatting
- `server/utils/` — `db.ts` (node:sqlite), `bank.ts` (provider + mock), `categorise.ts` (rules), `periods.ts` (payday-based periods), `stats.ts`
- `server/api/` — one file per endpoint
- `app/pages/` — overview, transactions, budget, goals, settings
- `docs/` — idea, category and spending-group reference
