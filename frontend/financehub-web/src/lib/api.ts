import axios from 'axios'
import type {
  Account,
  AuthResponse,
  BankDirectoryItem,
  BankConnection,
  Budget,
  Category,
  DashboardSummary,
  Institution,
  MonthlyReport,
  Transaction,
  UserProfile,
} from '../types/api'
import { useAuthStore } from '../store/auth-store'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

client.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

export const api = {
  register: (payload: { name: string; email: string; password: string }) =>
    client.post<AuthResponse>('/auth/register', payload),
  login: (payload: { email: string; password: string }) =>
    client.post<AuthResponse>('/auth/login', payload),
  refresh: (refreshToken: string) => client.post<AuthResponse>('/auth/refresh', { refreshToken }),
  getMe: () => client.get<UserProfile>('/me'),
  updateMe: (payload: { name: string; email: string }) => client.put<UserProfile>('/me', payload),
  updatePassword: (payload: { currentPassword: string; newPassword: string }) =>
    client.put<{ message: string }>('/me/password', payload),

  getSummary: () => client.get<DashboardSummary>('/dashboard/summary'),
  getInstitutions: () => client.get<Institution[]>('/institutions'),
  getBanksDirectory: () => client.get<BankDirectoryItem[]>('/banks'),
  getBankConnections: () => client.get<BankConnection[]>('/bank-connections'),
  createBankConnection: (institutionId: string) =>
    client.post<BankConnection>(`/bank-connections?institutionId=${institutionId}`),
  createBankConnectionFromDirectory: (payload: { name: string; code?: string; ispb?: string }) =>
    client.post<BankConnection>('/bank-connections/from-directory', payload),
  deleteBankConnection: (connectionId: string) => client.delete(`/bank-connections/${connectionId}`),

  getAccounts: () => client.get<Account[]>('/accounts'),
  createAccount: (payload: {
    bankConnectionId: string
    name: string
    bankName?: string
    bankCode?: string
    bankIspb?: string
    type: number
    currentBalance: number
    availableBalance: number
    currency: string
  }) => client.post<Account>('/accounts', payload),
  updateAccount: (accountId: string, payload: {
    name: string
    bankName?: string
    bankCode?: string
    bankIspb?: string
    currentBalance: number
    availableBalance: number
    type: number
    currency: string
  }) => client.put<Account>(`/accounts/${accountId}`, payload),
  deleteAccount: (accountId: string) => client.delete(`/accounts/${accountId}`),

  getCategories: () => client.get<Category[]>('/categories'),
  createCategory: (payload: { name: string; type: string; color: string }) =>
    client.post<Category>('/categories', payload),

  getTransactions: () => client.get<Transaction[]>('/transactions'),
  createTransaction: (payload: {
    accountId: string
    description: string
    merchant: string
    amount: number
    type: number
    categoryId?: string
    postedAt: string
  }) => client.post<Transaction>('/transactions', payload),
  updateTransaction: (transactionId: string, payload: {
    description: string
    merchant: string
    amount: number
    type: number
    categoryId?: string
    postedAt: string
  }) => client.put<Transaction>(`/transactions/${transactionId}`, payload),
  deleteTransaction: (transactionId: string) => client.delete(`/transactions/${transactionId}`),

  getBudgets: () => client.get<Budget[]>('/budgets'),
  createBudget: (payload: {
    categoryId: string
    limitAmount: number
    period: number
    startDate: string
    endDate: string
  }) => client.post<Budget>('/budgets', payload),
  updateBudget: (budgetId: string, payload: {
    categoryId: string
    limitAmount: number
    period: number
    startDate: string
    endDate: string
  }) => client.put<Budget>(`/budgets/${budgetId}`, payload),
  deleteBudget: (budgetId: string) => client.delete(`/budgets/${budgetId}`),

  getMonthlyReport: () => client.get<MonthlyReport>('/reports/monthly'),
}
