import { CATEGORY_BY_ID, type Tranche } from '~~/shared/domain'

export interface Rule { pattern: string; categoryId: string; tranche: string | null; wasteful: number; creditCategoryId?: string; groupId?: string }

// Keyword rules that ship with the app. User rules (DB) are checked first.
export const BUILTIN_RULES: Rule[] = [
  // Fees first: a fee line mentions the merchant too, so these must beat the merchant rules.
  ['cross-border', 'bank-charges'], ['cross border', 'bank-charges'], ['currency conversion', 'bank-charges'],
  // --- own accounts & transfers (third element = category when money comes IN) ---
  ['one month min savings', 'other-savings', 'transfer'], ['increase savings', 'other-savings', 'transfer'], ['rivett-carnac', 'transfer', 'transfer'], ['evo fund', 'investments', 'transfer'],
  ['joint account', 'shared-expenses', 'transfer'], ['niki personal account', 'shared-expenses', 'transfer'], ['niki med', 'medical-aid', 'reimbursements-in'],
  ['points-to-cash', 'rewards', 'rewards'], ['disc memb', 'rewards', 'rewards'], ['disc prem', 'medical-aid', undefined, 'recurring'], ['sl-debits sanlam', 'life-insurance'], ['kaelo', 'medical-aid', undefined, 'insurance'], ['liberty', 'life-insurance', undefined, 'insurance'], ['sanlam', 'life-insurance'],
  ['monthly service charge', 'account-fees-monthly-fee'], ['debit interest', 'interest-paid'], ['credit interest', 'interest'],
  // --- SA merchants seen in the real feed ---
  ['mrd', 'eating-out-takeaways'], ['the sett', 'work'], ['wozza meat', 'groceries'], ['umhlali fresh', 'groceries'], ['good: bread', 'groceries'], ['yoli', 'groceries'], ['biltong', 'groceries'],
  ['seattle', 'coffee'], ['science of coffee', 'coffee'], ['skyline coffee', 'coffee'],
  ['tidal', 'subscriptions'], ['temu', 'general-purchases'], ['yuppiechef', 'general-purchases'], ['bargain books', 'books-stationery'], ['paypal', 'general-purchases'], ['toys r us', 'children'],
  ['pestana', 'holidays-travel'], ['viator', 'holidays-travel'], ['zoomarine', 'holidays-travel'], ['romney park', 'holidays-travel'], ['salt rock hotel', 'eating-out-takeaways'],
  ['bounce', 'children'], ['funworld', 'children'], ['soft play', 'children'], ['animal farm', 'children'], ['magic company', 'children'], ['barnyard', 'entertainment'], ['funtubbles', 'children'], ['total ninja', 'children'],
  ['bbs mica', 'home-garden'], ['bbs ballito', 'home-garden'], ['simply bathrooms', 'home-garden'], ['electrician', 'home-utility-service'],
  ['tollgate', 'transport-fuel'], ['toll plaza', 'transport-fuel'], ['servest', 'transport-fuel'], ['adelaide tambo', 'transport-fuel'], ['la lucia la', 'transport-fuel'], ['parking', 'transport-fuel'],
  ['tri ridge freight', 'shipping'], ['dad', 'friends-family'], ['wildpeach', 'internet-fibre'], ['wild peach', 'internet-fibre'],
  ['coffee', 'coffee'], ['caffe', 'coffee'], ['lego', 'children'], ['theatr', 'entertainment'], ['boardriders', 'clothing'], ['game rese', 'holidays-travel'], ['wok box', 'eating-out-takeaways'], ['phat chef', 'eating-out-takeaways'], ['toast ballito', 'eating-out-takeaways'], ['waxy o', 'eating-out-takeaways'],
  ['woolworths', 'groceries'], ['checkers', 'groceries'], ['pick n pay', 'groceries'], ['spar ', 'groceries'], ['food lover', 'groceries'],
  ['uber eats', 'eating-out-takeaways'], ['mr d ', 'eating-out-takeaways'], ['nandos', 'eating-out-takeaways'], ['kfc', 'eating-out-takeaways'], ['cafe', 'eating-out-takeaways'], ['restaurant', 'eating-out-takeaways'], ['burger', 'eating-out-takeaways'], ['sushi', 'eating-out-takeaways'],
  ['starbucks', 'coffee'], ['seattle coffee', 'coffee'], ['vida e', 'coffee'], ['bootlegger', 'coffee'],
  ['engen', 'transport-fuel'], ['shell ', 'transport-fuel'], ['bp ', 'transport-fuel'], ['sasol', 'transport-fuel'], ['uber ', 'transport-fuel'], ['bolt ', 'transport-fuel'], ['caltex', 'transport-fuel'],
  ['netflix', 'subscriptions'], ['spotify', 'subscriptions'], ['youtube', 'subscriptions'], ['apple.com/bill', 'subscriptions'], ['disney', 'subscriptions'],
  ['dstv', 'tv'], ['multichoice', 'tv'],
  ['playstation', 'gaming'], ['steam', 'gaming'], ['xbox', 'gaming'], ['nintendo', 'gaming'],
  ['takealot', 'general-purchases'], ['amazon', 'general-purchases'], ['makro', 'general-purchases'],
  ['aramex', 'shipping'], ['courier guy', 'shipping'], ['postnet', 'shipping'],
  ['discovery health', 'medical-aid'], ['discovery life', 'life-insurance'], ['momentum', 'medical-aid'],
  ['outsurance', 'car-insurance'], ['santam', 'car-insurance'], ['king price', 'car-insurance'],
  ['vodacom', 'cellphone'], ['mtn', 'cellphone'], ['telkom', 'cellphone'], ['rain', 'internet-fibre'], ['afrihost', 'internet-fibre'], ['webafrica', 'internet-fibre'], ['vumatel', 'internet-fibre'],
  ['city of cape town', 'electricity'], ['ethekwini', 'electricity'], ['prepaid elec', 'electricity'], ['eskom', 'electricity'],
  ['adt ', 'security-alarm'], ['fidelity', 'security-alarm'],
  ['flysafair', 'holidays-travel'], ['airbnb', 'holidays-travel'], ['kulula', 'holidays-travel'], ['booking.com', 'holidays-travel'],
  ['virgin active', 'sport-fitness'], ['planet fitness', 'sport-fitness'],
  ['dis-chem', 'personal-care'], ['clicks', 'personal-care'],
  ['bond repayment', 'home-loan-bond'], ['home loan', 'home-loan-bond'],
  ['credit card payment', 'credit-card-repayment'],
  ['salary', 'salaries-wages'], ['wootware', 'salaries-wages'],
  ['interest received', 'interest'], ['interest capitalised', 'interest'],
  ['monthly fee', 'account-fees-monthly-fee'], ['service fee', 'account-fees-monthly-fee'], ['atm', 'atm-fees'], ['swift', 'eft-interbank-fees'], ['card fee', 'bank-charges'],
  ['tfsa blake', 'blake-s-tfsa'], ['blake', 'blake-s-tfsa'], ['tfsa', 'tax-free-savings-tfsa'], ['tax free', 'tax-free-savings-tfsa'], ['10x', 'retirement-annuity'], ['retirement annuity', 'retirement-annuity'], ['emergency', 'emergency-fund'],
  ['allan gray', 'investments'], ['easyequities', 'investments'], ['sygnia', 'investments'], ['satrix', 'investments'],
  ['transfer to', 'transfer'], ['transfer from', 'transfer'], ['internet transfer', 'transfer'],
  ['sars', 'tax'],
  ['landon auto', 'vehicle-expenses'], ['tyres', 'vehicle-expenses'], ['autozone', 'vehicle-expenses'],
  ['builders', 'home-garden'], ['leroy merlin', 'home-garden'],
  ['tops', 'alcohol'], ['liquor', 'alcohol'], ['norman goodfellows', 'alcohol'],
  ['github', 'software-services'], ['jetbrains', 'software-services'], ['openai', 'software-services'], ['anthropic', 'software-services'], ['cloudflare', 'software-services'], ['google cloud', 'software-services'],
  ['bash ', 'clothing'], ['superbalist', 'clothing'], ['mr price', 'clothing'], ['cotton on', 'clothing'],
  ['pnp liquor', 'alcohol'],
].map(([pattern, categoryId, creditCategoryId, groupId]) => ({ pattern, categoryId, creditCategoryId, groupId, tranche: null, wasteful: 0 }))

/** Pick group/category/tranche for a transaction. User rules win over built-ins. */
export function categorise(description: string, amount: number, userRules: Rule[]) {
  const d = description.toLowerCase()
  const hit = [...userRules, ...BUILTIN_RULES].find(r => d.includes(r.pattern.toLowerCase()))
  const categoryId = (amount > 0 && hit?.creditCategoryId) || hit?.categoryId || (amount > 0 ? 'other-income-in' : 'uncategorised')
  const cat = CATEGORY_BY_ID[categoryId]
  return {
    categoryId,
    groupId: hit?.groupId ?? cat.group,
    tranche: (hit?.tranche ?? cat.tranche) as Tranche,
    wasteful: hit?.wasteful ?? 0,
  }
}

/** Best-effort merchant name: first chunk before a separator, title-cased. */
const PROCESSORS = /^(zapper\d*|yoco|ik|mrd|snapscan|paygate|pp|s2s|express|bex|payfast|ozow)$/i
export function merchantOf(description: string) {
  const chunks = description.split(/\s[-–|*]\s|\*|\s{2,}/).map(c => c.trim()).filter(Boolean)
  const first = (PROCESSORS.test(chunks[0] ?? '') && chunks[1]) ? chunks[1] : (chunks[0] ?? description)
  const cleaned = first.replace(/\b(za|pty|ltd|cape town|durban|johannesburg|sandton|online)\b/gi, '').trim()
  return cleaned.split(/\s+/).slice(0, 3).map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}
