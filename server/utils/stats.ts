import { taxYearStart, localISO } from '~~/shared/domain'

const SPEND = `(amount < 0 OR linkedId IS NOT NULL) AND groupId NOT IN ('transfer','split')`

export function trancheTotals(start: string, end: string) {
  const rows = all<{ tranche: string; total: number }>(`SELECT tranche, SUM(-amount) total FROM transactions WHERE date BETWEEN ? AND ? AND ${SPEND} GROUP BY tranche`, start, end)
  const t = { needs: 0, wants: 0, savings: 0, none: 0 }
  for (const r of rows) t[r.tranche as keyof typeof t] = r.total
  return t
}

export function income(start: string, end: string) {
  return one<{ total: number }>(`SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE date BETWEEN ? AND ? AND amount > 0 AND groupId = 'income'`, start, end)!.total
}

export function categorySum(categoryId: string, start: string, end: string) {
  return one<{ total: number }>(`SELECT COALESCE(SUM(-amount),0) total FROM transactions WHERE categoryId = ? AND (amount < 0 OR linkedId IS NOT NULL) AND date BETWEEN ? AND ?`, categoryId, start, end)!.total
}

export function goalsWithProgress() {
  const today = localISO()
  return all<any>('SELECT * FROM goals ORDER BY id').map(g => {
    const fromTx = g.categoryId ? categorySum(g.categoryId, g.startDate, today) : 0
    const current = g.manual + fromTx
    return { ...g, current, pct: Math.min(1, g.target ? current / g.target : 0) }
  })
}

export function taxEfficiency(period: Period, settings: Record<string, any>) {
  const tyStart = taxYearStart(new Date(period.end + 'T00:00:00'))
  // Measure the whole tax year up to today (or its end, for past years) — not just up to the selected period.
  const y = Number(tyStart.slice(0, 4))
  const tyEnd = `${y + 1}-02-${new Date(y + 1, 1, 29).getDate() === 29 ? 29 : 28}`
  period = { ...period, end: tyEnd < localISO() ? tyEnd : localISO() }
  // Months elapsed in the tax year through this period (for on-track lines and projections).
  const monthsIn = Math.max(1, Math.round((new Date(period.end).getTime() - new Date(tyStart).getTime()) / (30.44 * 86400_000)))
  const ra = categorySum('retirement-annuity', period.start, period.end)
  const raYtd = categorySum('retirement-annuity', tyStart, period.end)
  const raMonthly = settings.raAnnualCap / 12
  // Rebate projection: deductible contributions × marginal rate. Remaining months assume the YTD monthly average continues.
  const monthsLeft = 12 - Math.min(12, monthsIn)
  const raProjected = Math.min(settings.raAnnualCap, raYtd + (raYtd / Math.min(12, monthsIn)) * monthsLeft)
  const rate = settings.marginalTaxRate ?? 0
  const tfsaYtd = categorySum('tax-free-savings-tfsa', tyStart, period.end)
  const tfsaPeriod = categorySum('tax-free-savings-tfsa', period.start, period.end)
  const childYtd = categorySum('blake-s-tfsa', tyStart, period.end)
  return {
    taxYearStart: tyStart,
    // Always the tax year that contains the selected period — the card doesn't change month to month.
    ra: { amount: raYtd, cap: settings.raAnnualCap, pct: settings.raAnnualCap ? raYtd / settings.raAnnualCap : 0,
      ytd: raYtd, annualCap: settings.raAnnualCap, ytdPct: settings.raAnnualCap ? raYtd / settings.raAnnualCap : 0, monthly: raMonthly, onTrack: settings.raAnnualCap * Math.min(12, monthsIn) / 12,
      rate, rebateSoFar: Math.min(raYtd, settings.raAnnualCap) * rate, projected: raProjected, rebateProjected: raProjected * rate, rebateMax: settings.raAnnualCap * rate },
    tfsa: {
      ytd: tfsaYtd, period: tfsaPeriod, cap: settings.tfsaAnnualCap,
      pct: settings.tfsaAnnualCap ? tfsaYtd / settings.tfsaAnnualCap : 0,
      onTrack: settings.tfsaAnnualCap * Math.min(12, monthsIn) / 12,
    },
    child: { ytd: childYtd, cap: settings.tfsaAnnualCap, pct: settings.tfsaAnnualCap ? childYtd / settings.tfsaAnnualCap : 0, onTrack: settings.tfsaAnnualCap * Math.min(12, monthsIn) / 12 },
  }
}
