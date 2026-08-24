/**
 * Bank provider boundary. The app only ever talks to `BankProvider`; swap the
 * mock for the Investec implementation once credentials are configured
 * (NUXT_BANK_PROVIDER=investec). Shapes mirror Investec's SA PB Account
 * Information API so the real client is a thin mapping.
 */
export interface BankAccount { accountId: string; accountName: string; productName: string; accountNumber: string; currentBalance: number }
export interface BankTransaction { accountId: string; transactionDate: string; description: string; amount: number; type: 'DEBIT' | 'CREDIT'; uuid: string }

export interface BankProvider {
  accounts(): Promise<BankAccount[]>
  transactions(accountId: string, fromDate: string, toDate: string): Promise<BankTransaction[]>
}

export function useBank(): BankProvider {
  const cfg = useRuntimeConfig()
  if (cfg.bankProvider === 'investec') return investecProvider(cfg.investec)
  return mockProvider()
}

// ---------------------------------------------------------------------------
// Investec (real) — untested until credentials are available.
// ---------------------------------------------------------------------------
function investecProvider(cfg: { clientId: string; clientSecret: string; apiKey: string }): BankProvider {
  const base = 'https://openapi.investec.com'
  let token: { value: string; exp: number } | undefined
  async function auth() {
    if (token && token.exp > Date.now()) return token.value
    const res = await $fetch<{ access_token: string; expires_in: number }>(`${base}/identity/v2/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64'),
        'x-api-key': cfg.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
    token = { value: res.access_token, exp: Date.now() + (res.expires_in - 60) * 1000 }
    return token.value
  }
  const get = async <T>(path: string) =>
    $fetch<{ data: T }>(`${base}${path}`, { headers: { Authorization: `Bearer ${await auth()}` } }).then(r => r.data)
  return {
    async accounts() {
      const d = await get<{ accounts: any[] }>('/za/pb/v1/accounts')
      return Promise.all(d.accounts.map(async a => {
        const b = await get<{ currentBalance: number }>(`/za/pb/v1/accounts/${a.accountId}/balance`)
        return { ...a, currentBalance: b.currentBalance }
      }))
    },
    async transactions(accountId, fromDate, toDate) {
      const d = await get<{ transactions: any[] }>(`/za/pb/v1/accounts/${accountId}/transactions?fromDate=${fromDate}&toDate=${toDate}`)
      return d.transactions.map(t => ({
        accountId, transactionDate: t.transactionDate, description: t.description,
        amount: t.type === 'DEBIT' ? -t.amount : t.amount, type: t.type,
        uuid: t.uuid ?? `${accountId}:${t.postedOrder}:${t.transactionDate}`,
      }))
    },
  }
}

// ---------------------------------------------------------------------------
// Mock — deterministic, ~12 months of plausible SA spending.
// ---------------------------------------------------------------------------
function mockProvider(): BankProvider {
  const ACC = { accountId: 'mock-cheque', accountName: 'Private Bank Account', productName: 'Private Bank Account', accountNumber: '10012345678', currentBalance: 0 }
  const SAV = { accountId: 'mock-savings', accountName: 'PrimeSaver', productName: 'PrimeSaver', accountNumber: '10012345679', currentBalance: 0 }
  const txs = buildMock()
  return {
    async accounts() { return [{ ...ACC, currentBalance: 52847.31 }, { ...SAV, currentBalance: 231502.66 }] },
    async transactions(accountId, from, to) { return txs.filter(t => t.accountId === accountId && t.transactionDate >= from && t.transactionDate <= to) },
  }
}

function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 } }
import { localISO as iso } from '~~/shared/domain'

function buildMock(): BankTransaction[] {
  // Modelled on the shape of the real Investec feed (merchants, processors, debit orders,
  // own-account transfers) with altered amounts. Each month is scripted to exercise a feature:
  // reimbursements, splits, cross-border fees, savings round-trips, wasteful months, overspend months.
  const rand = rng(42)
  const out: BankTransaction[] = []
  const seen = new Map<string, number>()
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth() - 13, 1)
  const pick = <T>(a: T[]) => a[Math.floor(rand() * a.length)]
  const add = (acc: string, d: Date, description: string, amount: number) => {
    if (d > today || d < start) return
    const key = `${acc}|${iso(d)}|${description}|${Math.round(amount * 100)}`
    const n = (seen.get(key) ?? 0) + 1; seen.set(key, n)
    out.push({ accountId: acc, transactionDate: iso(d), description, amount: Math.round(amount * 100) / 100, type: amount < 0 ? 'DEBIT' : 'CREDIT', uuid: `${key}|${n}` })
  }
  const C = 'mock-cheque', S = 'mock-savings'

  const GROCERS = ['WOOLWORTHS KWAZULU NATAL ZA', 'CHECKERS HYPER BALLITO', 'WOZZA MEAT - BALLITO LI DURBAN ZA', 'UMHLALI FRESH PRODUCE', 'GOOD: BREAD AND STUFF DURBAN ZA', 'PICK N PAY UMHLANGA']
  const COFFEE = ['SEATTLE KENSINGTON KWAZULU', 'NOW COFFEE NORTH BEACH', 'SCIENCE OF COFFEE', 'SKYLINE COFFEE', 'VIDA E CAFFE GATEWAY']
  const EATOUT = ['ZAPPER1*WOODLANDS CAFE BALLITO ZA', 'YOCO *THE PHAT CHEF', 'MRD*MR D FOOD DURBAN', 'THE WOK BOX BALLITO', 'TOAST BALLITO', 'YOCO *PANGELI POKE B', 'WAXY O CONNORS UMHLANGA']
  const KIDS = ['BOUNCE INC CORNUBIA', 'FLAG ANIMAL FARM', 'MR FUNTUBBLES GATEWAY', 'SOFT PLAY TIME', 'THE MAGIC COMPANY GATEWAY', 'LEGO STORE GATEWAY', 'TOYS R US GATEWAY']
  const FUEL = ['ENGEN BALLITO', 'SHELL UMHLANGA', 'BP SIBAYA', 'SASOL SALT ROCK']
  const WORK = ['THE SETT DURBAN NORTH DURBAN NORTH ZA', 'ZAPPER1*THE SETT DURBAN ZA']
  const ODD = ['NEW SALT ROCK', 'JANET POTTERTON', 'AG29 2 FOXHILL', 'BMS BALLITO KWAZULU', 'OUT THE BOX', 'METZTRADINGBACON QUEENSBURGH', 'SMW 0744 BALLITO']

  for (let m = 0; m <= 13; m++) {
    const y = start.getFullYear(), mo = start.getMonth() + m
    const on = (day: number) => new Date(y, mo, day)
    const holidayMonth = m % 6 === 4      // big travel spend, blows the budget
    const frugalMonth = m % 6 === 2       // everything on track
    const lowSaveMonth = m % 6 === 0      // savings short of 20% → 50/30/20 warn

    // --- income (payday 24th → salary-based periods) ---
    add(C, on(24), `WOOTWARE SALARY ${on(24).toLocaleString('en', { month: 'short' }).toUpperCase()}`, 145000)
    add(S, on(1), 'CREDIT INTEREST', 480 + rand() * 90)
    if (m % 3 === 1) add(C, on(10), 'NIKI MEDICAL AID', 2800 + rand() * 1500)          // reimbursement credit
    if (m % 2 === 0) add(C, on(15), `DISC MEMB 000${m}240102-28${m}178217`, 600 + rand() * 900) // rewards credit
    if (m === 12) add(C, on(8), 'SARS EFILING REFUND', 14350)

    // --- recurring debit orders (1st/2nd) ---
    add(C, on(1), 'JOINT ACCOUNT', -39500)                                             // split template demo
    add(C, on(1), `DISC PREM 000${m}240102-3425709`, -5950)
    add(C, on(1), `LIBERTY0${m}856800291600ETC`, -3450)
    add(C, on(1), 'SL-DEBITS SANLAM 34761632', -1180)
    add(C, on(2), 'KAELO HEALTH GAP COVER', -545)
    add(C, on(2), 'OUTSURANCE PREMIUM', -1520)
    add(C, on(3), 'WILDPEACH 419816089 NETCASH', -1499)                                // fibre
    add(C, on(3), 'VODACOM CONTRACT 082XXX', -949)
    add(C, on(5), 'NETFLIX.COM', -229)
    add(C, on(5), 'SPOTIFY', -99.99)
    add(C, on(6), 'APPLE.COM/BILL', -149)
    add(C, on(6), 'TIDAL MALMO SE', -71) 
    add(C, on(6), 'CROSS-BORDER CARD FEE - TIDAL', -3.55)
    add(C, on(9), 'VIRGIN ACTIVE MONTHLY', -845)
    add(C, on(10), 'GITHUB INC', -82)
    add(C, on(10), 'CROSS-BORDER CARD FEE - GITHUB', -4.1)
    add(C, on(26), 'MONTHLY SERVICE CHARGE', -675)
    if (m % 4 === 3) add(C, on(27), 'DEBIT INTEREST', -(30 + rand() * 60))

    // --- savings & tax efficiency ---
    add(C, on(25), 'TRANSFER TO 10X RETIREMENT ANNUITY', -10500)
    add(C, on(25), 'EASYEQUITIES TFSA CONTRIBUTION', -3800)
    add(C, on(25), 'EASYEQUITIES TFSA BLAKE CONTRIBUTION', -1900)
    if (!lowSaveMonth) { add(C, on(25), 'INCREASE SAVINGS', -12000); add(S, on(25), 'INCREASE SAVINGS', 12000) }
    if (holidayMonth) { add(S, on(12), 'ONE MONTH MIN SAVINGS 11005794', -15000); add(C, on(12), 'ONE MONTH MIN SAVINGS 11005794', 15000) } // dip into savings
    add(C, on(27), 'EVO FUND 1100579477501', -4200)
    add(C, on(15), 'FINANCIAL ADVISER FEES CHIPS WEALTH', -820)

    // --- day-to-day noise ---
    const days = new Date(y, mo + 1, 0).getDate()
    for (let d = 1; d <= days; d++) {
      const date = on(d)
      if (rand() < 0.34) add(C, date, pick(GROCERS), -(140 + rand() * 750))
      if (rand() < 0.38) add(C, date, pick(COFFEE), -(42 + rand() * 55))
      if (rand() < (frugalMonth ? 0.1 : 0.26)) add(C, date, pick(EATOUT), -(95 + rand() * 340))
      if (rand() < 0.16) add(C, date, pick(FUEL), -(650 + rand() * 520))
      if (rand() < 0.1) add(C, date, pick(KIDS), -(90 + rand() * 380))
      if (rand() < 0.12) add(C, date, pick(WORK), -(60 + rand() * 220))
      if (rand() < 0.08) add(C, date, 'TAKEALOT CAPE TOWN ZA', -(160 + rand() * 1400))
      if (rand() < 0.05) { add(C, date, 'PLAYSTATION NETWORK SONY PSN GB', -(199 + rand() * 800)); add(C, date, 'CROSS-BORDER CARD FEE - PLAYSTATION', -16.18) }
      if (rand() < 0.05) { add(C, date, 'ARAMEX INTERNATIONAL DUBAI AE', -(120 + rand() * 700)); add(C, date, 'CROSS-BORDER CARD FEE - ARAMEX INTERNATIONAL', -(2 + rand() * 12)) }
      if (rand() < 0.05) add(C, date, 'TOPS BALLITO', -(190 + rand() * 480))
      if (rand() < 0.05) add(C, date, pick(['DIS-CHEM BALLITO', 'CLICKS GATEWAY']), -(95 + rand() * 420))
      if (rand() < 0.04) add(C, date, pick(['BBS MICA BALLITO', 'BUILDERS WAREHOUSE']), -(180 + rand() * 1300))
      if (rand() < 0.04) add(C, date, pick(['SUPERBALIST', 'MR PRICE GATEWAY', 'BOARDRIDERS']), -(260 + rand() * 800))
      if (rand() < 0.05) add(C, date, pick(['SERVEST BALLITO JUNCTION', 'LA LUCIA LA PARKING', 'SUNCOAST TOLLGATE']), -(8 + rand() * 45))
      if (rand() < 0.03) add(C, date, 'ATM WITHDRAWAL BALLITO', -(500 + Math.floor(rand() * 3) * 500))
      if (rand() < 0.05) add(C, date, pick(ODD), -(120 + rand() * 900))               // stays uncategorised → Unknown bucket
      if (rand() < 0.03) add(C, date, 'ITUNES LOTTO STAR', -(50 + rand() * 200))      // wasteful candidate
    }

    // --- monthly extras ---
    if (holidayMonth) {
      add(C, on(11), 'FLYSAFAIR LRI668:X5678 SOUTH AFRICA ZA', -(4200 + rand() * 3800))
      add(C, on(13), 'PESTANA ALVOR PRAIA PORTIMAO PT', -(18000 + rand() * 9000))
      add(C, on(13), 'CROSS-BORDER CARD FEE - PESTANA', -110)
      add(C, on(14), 'VIATOR* IT-1779201281 LONDON GB', -8900)
      add(C, on(14), 'CROSS-BORDER CARD FEE - VIATOR', -62)
      add(C, on(20), 'VIATOR* IT-1779201281 LONDON GB', 8900)                          // refund → reimbursement-link demo
    }
    if (m % 5 === 2) add(C, on(12 + Math.floor(rand() * 8)), 'LANDON AUTO - INVOICE XX8006', -(2200 + rand() * 6500))
    if (m % 3 === 0) add(C, on(18), 'REFUND TAKEALOT', 350 + rand() * 700)             // small reimbursement demo
    if (m % 4 === 1) add(C, on(16), 'DAD', -3500)
    if (m % 6 === 5) add(C, on(21), 'YUPPIECHEF ONLINE', -(800 + rand() * 1200))
  }
  return out.sort((a, b) => a.transactionDate.localeCompare(b.transactionDate))
}
