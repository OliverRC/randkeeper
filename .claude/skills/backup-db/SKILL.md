---
name: backup-db
description: Back up the live SQLite database (data/wealth.investec.db). Use when the user asks to back up, snapshot, or restore the database. Trigger: /backup-db
---

# Backup the live database

The app stores everything in one SQLite file per bank provider: `data/wealth.<provider>.db`.
The live Investec ledger is `data/wealth.investec.db`. WAL mode is on, so never
copy the file with `cp` — use SQLite's online backup, which is safe while the app runs.

## Back up

```sh
mkdir -p data/backups
sqlite3 data/wealth.investec.db ".backup 'data/backups/wealth.investec.$(date +%Y%m%d-%H%M%S).db'"
```

If `data/wealth.investec.db` doesn't exist, list `data/*.db` and back up what's there
(e.g. the mock db), telling the user which file you used.

Verify the backup with `sqlite3 <backup-file> "PRAGMA integrity_check; SELECT count(*) FROM transactions"` and report the transaction count.

Backups land in `data/backups/`, which is git-ignored.

## Restore

Stop the dev server first, then:

```sh
sqlite3 data/backups/<chosen-backup>.db ".backup 'data/wealth.investec.db'"
```

Always confirm with the user which backup file to restore before overwriting the live db.
