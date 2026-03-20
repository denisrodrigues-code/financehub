import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { MobileAppFrame } from '../components/layout/mobile-app-frame'
import { api } from '../lib/api'
import { PageLoader } from '../components/ui/page-loader'
import { formatBrl } from '../utils/currency'

const COLORS = ['#0891b2', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#0ea5e9']

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const transactionsQuery = useQuery({ queryKey: ['transactions'], queryFn: () => api.getTransactions().then((r) => r.data) })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: () => api.getAccounts().then((r) => r.data) })

  if (transactionsQuery.isLoading || accountsQuery.isLoading) {
    return <PageLoader label="Carregando relatorios..." />
  }

  if (transactionsQuery.isError || accountsQuery.isError || !transactionsQuery.data || !accountsQuery.data) {
    return <p className="text-sm text-rose-300">Não foi possível carregar o relatório.</p>
  }

  const transactions = transactionsQuery.data
  const accounts = accountsQuery.data
  const monthFilter = searchParams.get('month') ?? 'all'
  const accountFilter = searchParams.get('account') ?? 'all'

  const setFilter = (key: 'month' | 'account', value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') {
      next.delete(key)
    } else {
      next.set(key, value)
    }

    setSearchParams(next, { replace: true })
  }

  const filterMonths = (() => {
    const map = new Map<string, string>()
    transactions.forEach((transaction) => {
      const date = new Date(transaction.postedAt)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const value = `${year}-${String(month).padStart(2, '0')}`
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      map.set(value, label)
    })

    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([value, label]) => ({ value, label }))
  })()

  const filteredExpenses = transactions
    .filter((transaction) => transaction.type === 1)
    .filter((transaction) => {
      if (accountFilter !== 'all' && transaction.accountId !== accountFilter) {
        return false
      }

      if (monthFilter === 'all') {
        return true
      }

      const [year, month] = monthFilter.split('-').map(Number)
      if (!year || !month) {
        return true
      }

      const postedAt = new Date(transaction.postedAt)
      return postedAt.getFullYear() === year && postedAt.getMonth() + 1 === month
    })

  const categoriesMap = new Map<string, number>()
  filteredExpenses.forEach((transaction) => {
    const key = transaction.category?.name ?? 'Sem categoria'
    categoriesMap.set(key, (categoriesMap.get(key) ?? 0) + Number(transaction.amount))
  })

  const categories = [...categoriesMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const hasCategories = categories.length > 0

  const pageContent = (
    <>
      <header>
        <h2 className="app-title text-2xl font-bold">Relatórios</h2>
        <p className="app-subtitle text-sm">Distribuição de gastos por categoria e análise de tendência.</p>
      </header>

      <section className="app-panel grid gap-2 p-3 md:grid-cols-2">
        <select value={monthFilter} onChange={(event) => setFilter('month', event.target.value)} className="app-select">
          <option value="all">Todos os meses</option>
          {filterMonths.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={accountFilter} onChange={(event) => setFilter('account', event.target.value)} className="app-select">
          <option value="all">Todas as contas</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </section>

      <section className="grid gap-2.5 xl:grid-cols-2">
        <article className="app-panel p-3 lg:p-2.5 xl:p-3.5">
          <h3 className="text-primary-theme mb-3 text-lg font-semibold">Gastos por categoria</h3>
          <div className="h-72">
            {!hasCategories ? (
              <div className="surface-soft text-secondary-theme grid h-full place-items-center rounded-lg text-sm">
                Sem dados de categorias para exibir no período.
              </div>
            ) : null}
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categories} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={100}>
                  {categories.map((entry, index) => (
                    <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(7, 13, 38, 0.94)',
                    border: '1px solid rgba(129, 140, 248, 0.25)',
                    borderRadius: '12px',
                    color: '#e5edff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="app-panel p-3 lg:p-2.5 xl:p-3.5">
          <h3 className="text-primary-theme mb-3 text-lg font-semibold">Resumo de categorias</h3>
          <div className="space-y-2">
            {!hasCategories ? (
              <div className="surface-soft text-secondary-theme rounded-lg px-3 py-2 text-sm">
                Nenhuma categoria encontrada para o relatório.
              </div>
            ) : null}
            {categories.map((item, index) => (
              <div key={item.category} className="surface-inner table-line flex items-center justify-between rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <p className="text-primary-theme text-sm font-medium">{item.category}</p>
                </div>
                <p className="text-primary-theme text-sm font-semibold">{formatBrl(item.amount)}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  )

  return (
    <div className="flex h-full flex-col md:block">
      <MobileAppFrame title="Relatórios">
        <div className="space-y-3 [&>header]:hidden [&_.app-panel]:rounded-xl [&_.app-panel]:border [&_.app-panel]:p-3 [&_.table-line]:border [&_h3]:text-[15px] [&_h3]:font-semibold [&_label]:text-slate-200 [&_.app-input]:h-11 [&_.app-input]:rounded-xl [&_.app-select]:h-11 [&_.app-select]:rounded-xl">{pageContent}</div>
      </MobileAppFrame>

      <div className="hidden space-y-3 lg:space-y-2.5 md:block">{pageContent}</div>
    </div>
  )
}
