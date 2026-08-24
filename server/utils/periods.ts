/**
 * Budget periods. 'salary' mode: each period starts on a salary day and runs
 * to the day before the next one (so the month is budgeted from payday).
 * 'calendar' mode: plain months. Periods are derived, never stored.
 */
export interface Period { key: string; label: string; start: string; end: string }

import { localISO, taxYearStart } from '~~/shared/domain'
const iso = (d: Date) => d.toISOString().slice(0, 10)
const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
const addDays = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return iso(d) }

export function periods(): Period[] {
  const mode = getSettings().periodMode ?? 'salary'
  const today = localISO()
  if (mode === 'salary') {
    const paydays = all<{ date: string }>(`SELECT DISTINCT date FROM transactions WHERE categoryId = 'salaries-wages' AND amount > 0 ORDER BY date`)
      .map(r => r.date)
      // collapse paydays closer than 14 days (e.g. bonus + salary)
      .filter((d, i, a) => i === 0 || addDays(a[i - 1], 14) <= d)
    if (paydays.length) {
      const ps = paydays.map((start, i) => {
        const end = paydays[i + 1] ? addDays(paydays[i + 1], -1) : addDays(start, 30)
        return { key: start, start, end, label: `${fmt(start)} – ${fmt(end)}` }
      })
      // extend the last period so "today" always falls in one
      const last = ps[ps.length - 1]
      if (last.end < today) last.end = today
      return ps.reverse()
    }
  }
  const first = one<{ d: string }>('SELECT MIN(date) d FROM transactions')?.d ?? today
  const out: Period[] = []
  for (let d = new Date(first.slice(0, 7) + '-01T00:00:00Z'); iso(d) <= today; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const start = iso(d)
    const endD = new Date(d); endD.setUTCMonth(endD.getUTCMonth() + 1); endD.setUTCDate(0)
    out.push({ key: start.slice(0, 7), start, end: iso(endD), label: d.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' }) })
  }
  return out.reverse()
}

/** Virtual "whole tax year" periods (1 Mar – 28/29 Feb), one per year that has data. Key: ty:YYYY */
export function taxYearPeriods(ps: Period[]): Period[] {
  const today = localISO()
  const years = new Set(ps.map(p => Number(taxYearStart(new Date(p.end + 'T00:00:00')).slice(0, 4))))
  return [...years].sort((a, b) => b - a).map(y => {
    const start = `${y}-03-01`, endFull = `${y + 1}-02-${new Date(y + 1, 1, 29).getDate() === 29 ? 29 : 28}`
    return { key: `ty:${y}`, start, end: endFull < today ? endFull : today, label: `Tax year ${y}/${String(y + 1).slice(2)}` }
  })
}

export function currentPeriod(key?: string) {
  const ps = periods()
  if (key?.startsWith('ty:')) return taxYearPeriods(ps).find(p => p.key === key) ?? ps[0]
  return (key && ps.find(p => p.key === key)) || ps[0]
}
export const isTaxYear = (p: Period) => p.key.startsWith('ty:')
