export type AuthResponse = {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export type UserProfile = {
  id: string
  name: string
  email: string
  createdAt: string
}

export type Institution = {
  id: string
  name: string
  code: string
}

export type BankDirectoryItem = {
  ispb: string
  name: string
  code: number | null
  fullName: string | null
}

export type BankConnection = {
  id: string
  institutionId: string
  institution: {
    name: string
    code: string
  }
  status: string
  consentGrantedAt: string
  consentExpiresAt: string
  lastSyncAt: string
}

export type Account = {
  id: string
  bankConnectionId: string
  name: string
  bankName: string | null
  bankCode: string | null
  bankIspb: string | null
  type: number
  currency: string
  currentBalance: number
  availableBalance: number
}

export type Category = {
  id: string
  name: string
  type: string
  color: string
}

export type Transaction = {
  id: string
  accountId: string
  description: string
  merchant: string
  amount: number
  type: number
  postedAt: string
  category: Category | null
}

export type Budget = {
  id: string
  limitAmount: number
  period: number
  startDate: string
  endDate: string
  category: {
    categoryId: string
    name: string
    color: string
  }
}

export type DashboardSummary = {
  totalBalance: number
  monthlyIncome: number
  monthlyExpense: number
  cashflow: number
  accountsCount: number
  transactionsCount: number
}

export type MonthlyReport = {
  monthly: Array<{
    year: number
    month: number
    income: number
    expense: number
  }>
  byCategory: Array<{
    category: string
    amount: number
  }>
}
