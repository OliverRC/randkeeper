import { fmtZAR } from '~~/shared/domain'

export const usePeriod = () => useState<string | undefined>('period', () => undefined)
export const money = fmtZAR

/** "R1,302.84" → whole/cents parts for the Vault22-style amount rendering */
export function moneyParts(n: number, sign = false) {
  const s = fmtZAR(n, { sign })
  const i = s.lastIndexOf('.')
  return { whole: s.slice(0, i), cents: s.slice(i) }
}

export const fmtDate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
export const pct = (n: number) => `${Math.round(n * 100)}%`
