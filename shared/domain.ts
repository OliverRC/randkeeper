// Shared between server and client. Pure data + pure functions only.

export type Tranche = 'needs' | 'wants' | 'savings' | 'none'

export interface SpendingGroup { id: string; name: string; icon: string; color: string }

export const SPENDING_GROUPS: SpendingGroup[] = [
  { id: 'day-to-day', name: 'Day-to-day', icon: 'i-lucide-shopping-bag', color: 'text-sky-600' },
  { id: 'recurring', name: 'Recurring', icon: 'i-lucide-repeat', color: 'text-violet-600' },
  { id: 'exceptions', name: 'Exceptions', icon: 'i-lucide-sparkles', color: 'text-amber-600' },
  { id: 'invest-save-repay', name: 'Invest-save-repay', icon: 'i-lucide-piggy-bank', color: 'text-emerald-600' },
  { id: 'income', name: 'Income', icon: 'i-lucide-banknote', color: 'text-green-600' },
  { id: 'insurance', name: 'Insurance', icon: 'i-lucide-shield', color: 'text-teal-600' },
  { id: 'transfer', name: 'Transfer', icon: 'i-lucide-arrow-left-right', color: 'text-slate-500' },
  { id: 'communications', name: 'Communications', icon: 'i-lucide-smartphone', color: 'text-blue-600' },
  { id: 'debt', name: 'Debt', icon: 'i-lucide-credit-card', color: 'text-rose-600' },
  { id: 'bank-fees', name: 'Bank Fees', icon: 'i-lucide-landmark', color: 'text-orange-600' },
  { id: 'utilities', name: 'Utilities', icon: 'i-lucide-plug-zap', color: 'text-yellow-600' },
  { id: 'split', name: 'Split', icon: 'i-lucide-split', color: 'text-slate-500' },
]

export interface Category { id: string; name: string; group: string; tranche: Tranche; custom?: boolean }

const c = (name: string, group: string, tranche: Tranche, custom = false): Category =>
  ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), name, group, tranche, custom })

// From docs/categories.md, with a default 50/30/20 tranche per category.
export const CATEGORIES: Category[] = [
  c('Account Fees / Monthly Fee', 'bank-fees', 'needs'),
  c('Airtime & Data', 'communications', 'needs'),
  c('Alcohol', 'day-to-day', 'wants'),
  c('ATM Fees', 'bank-fees', 'needs'),
  c('Bank Charges', 'bank-fees', 'needs'),
  c('Books & Stationery', 'day-to-day', 'wants'),
  c('Business', 'exceptions', 'needs'),
  c('Buy Now Pay Later', 'debt', 'needs'),
  c('Capital Gains', 'income', 'none'),
  c('Car Insurance', 'insurance', 'needs'),
  c('Card Replacement Fee', 'bank-fees', 'needs'),
  c('Cash', 'day-to-day', 'wants'),
  c('Cellphone', 'communications', 'needs'),
  c('Charity', 'day-to-day', 'wants', true),
  c('Toys', 'day-to-day', 'wants', true),
  c('Fraud', 'exceptions', 'none', true),
  c('Children', 'day-to-day', 'needs'),
  c('Cigarettes', 'day-to-day', 'wants'),
  c('Clothing', 'day-to-day', 'wants'),
  c('Coffee', 'day-to-day', 'wants'),
  c('Consulting / Freelance', 'income', 'none'),
  c('Credit Card Repayment', 'debt', 'needs'),
  c('Crypto Gains', 'income', 'none'),
  c('Dividends', 'income', 'none'),
  c('Donations (Out)', 'day-to-day', 'wants'),
  c('Eating Out & Takeaways', 'day-to-day', 'wants'),
  c('Education', 'recurring', 'needs'),
  c('EFT / Interbank Fees', 'bank-fees', 'needs'),
  c('Electricity', 'utilities', 'needs'),
  c('Emergency Fund', 'invest-save-repay', 'savings'),
  c('Entertainment', 'day-to-day', 'wants'),
  c('Friends & Family', 'exceptions', 'wants'),
  c('Funeral Cover', 'insurance', 'needs'),
  c('General Purchases', 'day-to-day', 'wants'),
  c('Gifts (Out)', 'day-to-day', 'wants'),
  c('Government Benefits', 'income', 'none'),
  c('Grants', 'income', 'none'),
  c('Groceries', 'day-to-day', 'needs'),
  c('Hobbies', 'day-to-day', 'wants'),
  c('Holidays & Travel', 'exceptions', 'wants'),
  c('Home & Contents Insurance', 'insurance', 'needs'),
  c('Home & Garden', 'day-to-day', 'wants'),
  c('Home Loan / Bond', 'debt', 'needs'),
  c('Home Utility & Service', 'recurring', 'needs'),
  c('Housekeeping', 'recurring', 'needs'),
  c('Income Protection', 'insurance', 'needs'),
  c('Interest', 'income', 'none'),
  c('Interest Paid', 'debt', 'needs'),
  c('Internet & Fibre', 'communications', 'needs'),
  c('Investments', 'invest-save-repay', 'savings'),
  c('Late Payment Fees', 'debt', 'needs'),
  c('Life Insurance', 'insurance', 'needs'),
  c('Lotto & Gambling', 'day-to-day', 'wants'),
  c('Medical', 'day-to-day', 'needs'),
  c('Medical Aid', 'insurance', 'needs'),
  c('Mobile Phone Contract', 'communications', 'needs'),
  c('Other Income (In)', 'income', 'none'),
  c('Other Insurance', 'insurance', 'needs'),
  c('Other Phone & Internet', 'communications', 'needs'),
  c('Other Savings', 'invest-save-repay', 'savings'),
  c('Overdraft', 'debt', 'needs'),
  c('Pension', 'income', 'none'),
  c('Personal Care', 'day-to-day', 'needs'),
  c('Personal Loan', 'debt', 'needs'),
  c('Pets', 'day-to-day', 'needs'),
  c('Private Sales', 'income', 'none'),
  c('Professional Services', 'day-to-day', 'needs'),
  c('Refunds (In)', 'income', 'none'),
  c('Reimbursements (In)', 'income', 'none'),
  c('Rent', 'recurring', 'needs'),
  c('Rental Income', 'income', 'none'),
  c('Retirement Annuity', 'invest-save-repay', 'savings'),
  c('Tax-Free Savings (TFSA)', 'invest-save-repay', 'savings'),
  c("Blake's TFSA", 'invest-save-repay', 'savings'),
  c('Rewards', 'income', 'none'),
  c('Salaries & Wages', 'income', 'none'),
  c('Security / Alarm', 'utilities', 'needs'),
  c('Shared Expenses', 'day-to-day', 'needs'),
  c('Side Hustle Income', 'income', 'none'),
  c('Software & Services', 'recurring', 'wants'),
  c('Sport & Fitness', 'day-to-day', 'wants'),
  c('Stokvel / Burial Society', 'invest-save-repay', 'savings'),
  c('Store Account / Retail Credit', 'debt', 'needs'),
  c('Student Loan', 'debt', 'needs'),
  c('Subscriptions', 'recurring', 'wants'),
  c('Tax', 'recurring', 'needs'),
  c('Tax Refund', 'income', 'none'),
  c('Tech & Appliances', 'day-to-day', 'wants'),
  c('Transfer', 'transfer', 'none'),
  c('Transport & Fuel', 'day-to-day', 'needs'),
  c('Travel Insurance', 'insurance', 'needs'),
  c('TV', 'recurring', 'wants'),
  c('Uncategorised', 'day-to-day', 'none'),
  c('Vehicle Expenses', 'day-to-day', 'needs'),
  c('Vehicle Loan / Car Loan', 'debt', 'needs'),
  c('Water', 'utilities', 'needs'),
  // custom
  c('Gaming', 'day-to-day', 'wants', true),
  c('Work', 'day-to-day', 'needs', true),
  c('Work Travel', 'exceptions', 'needs', true),
  c('Shipping', 'day-to-day', 'wants', true),
  c('Investment Fees', 'recurring', 'needs', true),
  c('Financial Adviser Fees', 'recurring', 'needs', true),
  c('Drinks', 'day-to-day', 'wants', true),
  c('Pre-made Meals', 'day-to-day', 'wants', true),
  c('Health and Fitness', 'day-to-day', 'wants', true),
  c('3D Printing', 'day-to-day', 'wants', true),
  c('Bike', 'day-to-day', 'wants', true),
  c('Mums Aide', 'recurring', 'needs', true),
  c('Split', 'split', 'none'),
]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map(x => [x.id, x]))
export const GROUP_BY_ID = Object.fromEntries(SPENDING_GROUPS.map(x => [x.id, x]))

export const TRANCHES: Record<Tranche, { label: string; target: number; color: string; good: 'under' | 'over' }> = {
  needs: { label: 'Needs', target: 0.5, color: 'sky', good: 'under' },
  wants: { label: 'Wants', target: 0.3, color: 'amber', good: 'under' },
  savings: { label: 'Savings', target: 0.2, color: 'emerald', good: 'over' },
  none: { label: 'Excluded', target: 0, color: 'slate', good: 'under' },
}

// SA tax year runs 1 March – end Feb.
export function taxYearStart(d: Date): string {
  const y = d.getMonth() >= 2 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}-03-01`
}

export const DEFAULT_SETTINGS = {
  raAnnualCap: 430000,     // 27.5% of taxable income, max R430k p.a. from 1 March 2026 (Budget 2026; was R350k)
  tfsaAnnualCap: 46000,    // per docs/IDEA.md; verify against SARS for the current tax year
  emergencyFundMonths: 1,
  marginalTaxRate: 0.41,   // your top SARS bracket; RA contributions are deducted at this rate
}

export function fmtZAR(n: number, opts: { sign?: boolean } = {}) {
  const abs = Math.abs(n)
  const s = 'R' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (n < 0 ? '-' : opts.sign && n > 0 ? '+' : '') + s
}

/** YYYY-MM-DD in local time (toISOString would shift SAST evenings to the previous day). */
export function localISO(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
