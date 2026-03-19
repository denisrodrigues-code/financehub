import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { MetricCard } from '../components/ui/metric-card'
import { PageLoader } from '../components/ui/page-loader'
import { formatBrl } from '../utils/currency'

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const summaryQuery = useQuery({ queryKey: ['summary'], queryFn: () => api.getSummary().then((r) => r.data) })
  const reportQuery = useQuery({ queryKey: ['report'], queryFn: () => api.getMonthlyReport().then((r) => r.data) })
  const transactionsQuery = useQuery({ queryKey: ['transactions'], queryFn: () => api.getTransactions().then((r) => r.data) })
  const budgetsQuery = useQuery({ queryKey: ['budgets'], queryFn: () => api.getBudgets().then((r) => r.data) })
  const accountsQuery = useQuery({ queryKey: ['accounts'], queryFn: () => api.getAccounts().then((r) => r.data) })

  if (summaryQuery.isLoading || reportQuery.isLoading || transactionsQuery.isLoading || budgetsQuery.isLoading || accountsQuery.isLoading) {
    return <PageLoader label="Carregando dashboard..." />
  }

  if (
    summaryQuery.isError ||
    reportQuery.isError ||
    transactionsQuery.isError ||
    budgetsQuery.isError ||
    accountsQuery.isError ||
    !summaryQuery.data ||
    !reportQuery.data ||
    !transactionsQuery.data ||
    !budgetsQuery.data ||
    !accountsQuery.data
  ) {
    return <p className="text-sm text-rose-300">Não foi possível carregar os dados do dashboard.</p>
  }

  const summary = summaryQuery.data
  const accounts = accountsQuery.data
  const transactions = transactionsQuery.data
  const budgets = budgetsQuery.data
  const monthFilter = searchParams.get('month') ?? 'all'
  const accountFilter = searchParams.get('account') ?? 'all'
  const periodFilter = searchParams.get('period') ?? 'all'

  const filteredTransactions = transactions.filter((transaction) => {
    if (accountFilter !== 'all' && transaction.accountId !== accountFilter) {
      return false
    }

    const postedAt = new Date(transaction.postedAt)

    if (monthFilter !== 'all') {
      const [year, month] = monthFilter.split('-').map(Number)
      if (year && month && (postedAt.getFullYear() !== year || postedAt.getMonth() + 1 !== month)) {
        return false
      }
    }

    if (periodFilter === 'all') {
      return true
    }

    const days = Number(periodFilter)
    if (!Number.isFinite(days) || days <= 0) {
      return true
    }

    const threshold = new Date()
    threshold.setDate(threshold.getDate() - days)
    return postedAt.getTime() >= threshold.getTime()
  })

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

  const setFilter = (key: 'month' | 'account' | 'period', value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') {
      next.delete(key)
    } else {
      next.set(key, value)
    }

    setSearchParams(next, { replace: true })
  }

  const monthlyMap = new Map(
    reportQuery.data.monthly.map((item) => [`${item.year}-${item.month}`, item]),
  )

  const chartData = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - index))
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const key = `${year}-${month}`
    const monthData = monthlyMap.get(key)

    return {
      mes: `${month.toString().padStart(2, '0')}/${year}`,
      entradas: monthData?.income ?? 0,
      saidas: monthData?.expense ?? 0,
    }
  })

  const hasAnyMovement = chartData.some((item) => item.entradas > 0 || item.saidas > 0)
  const recentTransactions = [...filteredTransactions]
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, 3)

  const budgetProgress = budgets
    .map((budget) => {
      const startAt = new Date(budget.startDate).getTime()
      const endAt = new Date(budget.endDate).getTime()
      const spent = filteredTransactions
        .filter((transaction) => {
          const postedAt = new Date(transaction.postedAt).getTime()
          return (
            transaction.type === 1 &&
            transaction.category?.id === budget.category.categoryId &&
            postedAt >= startAt &&
            postedAt <= endAt
          )
        })
        .reduce((accumulator, transaction) => accumulator + Number(transaction.amount), 0)

      const progress = budget.limitAmount > 0 ? (spent / Number(budget.limitAmount)) * 100 : 0
      return {
        budget,
        spent,
        progress,
      }
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3)

  return (
    <div className="space-y-3 lg:space-y-2.5">
      <header>
        <h2 className="app-title text-xl font-bold xl:text-2xl">Dashboard Financeiro</h2>
        <p className="app-subtitle mt-0.5 text-xs xl:text-sm">Visão consolidada das suas contas e fluxo de caixa.</p>
      </header>

      <section className="app-panel grid gap-2 p-3 md:grid-cols-2">
        <select value={periodFilter} onChange={(event) => setFilter('period', event.target.value)} className="app-select">
          <option value="all">Período completo</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
        <select value={monthFilter} onChange={(event) => setFilter('month', event.target.value)} className="app-select">
          <option value="all">Todos os meses</option>
          {filterMonths.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={accountFilter} onChange={(event) => setFilter('account', event.target.value)} className="app-select md:col-span-2">
          <option value="all">Todas as contas</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </section>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Saldo total" value={formatBrl(summary.totalBalance)} tone="neutral" />
        <MetricCard label="Receitas do mês" value={formatBrl(summary.monthlyIncome)} tone="positive" />
        <MetricCard label="Despesas do mês" value={formatBrl(summary.monthlyExpense)} tone="negative" />
        <MetricCard label="Fluxo de caixa" value={formatBrl(summary.cashflow)} tone={summary.cashflow >= 0 ? 'positive' : 'negative'} />
        <MetricCard label="Contas conectadas" value={String(summary.accountsCount)} />
        <MetricCard label="Transações" value={String(summary.transactionsCount)} />
      </section>

      <section className="rounded-xl border border-indigo-300/20 bg-[#0f1740]/50 p-3 lg:p-2.5 xl:p-3.5">
        <div className="mb-2">
          <h3 className="text-base font-semibold text-slate-100 xl:text-lg">Receitas x Despesas</h3>
        </div>
        <div className="h-44 lg:h-36 xl:h-52">
          {!hasAnyMovement ? (
            <div className="mb-2 rounded-lg border border-indigo-300/20 bg-indigo-950/30 px-3 py-2 text-xs text-slate-300/85">
              Sem movimentação financeira nos últimos 6 meses.
            </div>
          ) : null}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" strokeDasharray="3 3" />
              <XAxis dataKey="mes" stroke="#9fb0d7" />
              <YAxis stroke="#9fb0d7" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(7, 13, 38, 0.94)',
                  border: '1px solid rgba(129, 140, 248, 0.25)',
                  borderRadius: '12px',
                  color: '#e5edff',
                }}
              />
              <Area dataKey="entradas" stroke="#22c55e" fill="url(#incomeGradient)" strokeWidth={2.5} dot={{ r: 3 }} />
              <Area dataKey="saidas" stroke="#f87171" fill="url(#expenseGradient)" strokeWidth={2.5} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-2.5 xl:grid-cols-2">
        <div className="rounded-xl border border-indigo-300/20 bg-[#0f1740]/50 p-3 lg:p-2.5 xl:p-3.5">
          <h3 className="mb-2 text-base font-semibold text-slate-100 xl:text-lg">Transações recentes</h3>
          {!recentTransactions.length ? (
            <div className="rounded-lg border border-indigo-300/20 bg-indigo-950/30 px-3 py-2 text-xs text-slate-300/85">
              Você ainda não registrou transações.
            </div>
          ) : (
            <div className="space-y-1.5 lg:space-y-1">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="table-line flex items-center justify-between rounded-lg border bg-indigo-950/25 px-3 py-1.5"
                >
                  <div>
                    <p className="text-[13px] font-medium text-slate-100">{transaction.description}</p>
                    <p className="text-[11px] text-slate-300/75">
                      {transaction.merchant} - {new Date(transaction.postedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <p className={`text-[13px] font-semibold ${transaction.type === 2 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {transaction.type === 2 ? '+' : '-'} {formatBrl(Number(transaction.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-indigo-300/20 bg-[#0f1740]/50 p-3 lg:p-2.5 xl:p-3.5">
          <h3 className="mb-2 text-base font-semibold text-slate-100 xl:text-lg">Progresso dos orçamentos</h3>
          {!budgetProgress.length ? (
            <div className="rounded-lg border border-indigo-300/20 bg-indigo-950/30 px-3 py-2 text-xs text-slate-300/85">
              Nenhum orçamento ativo para acompanhar.
            </div>
          ) : (
            <div className="space-y-2">
              {budgetProgress.map(({ budget, spent, progress }) => {
                const clampedProgress = Math.min(progress, 100)
                const barToneClass = progress >= 100 ? 'bg-rose-400' : progress >= 80 ? 'bg-amber-300' : 'bg-cyan-300'
                return (
                  <div key={budget.id} className="rounded-lg border border-indigo-300/20 bg-indigo-950/25 px-3 py-1.5">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="text-[13px] font-medium text-slate-100">{budget.category.name}</p>
                      <p className="text-[11px] text-slate-300/80">{Math.round(progress)}%</p>
                    </div>
                    <div className="h-2 rounded-full bg-indigo-950/70">
                      <div className={`h-2 rounded-full ${barToneClass}`} style={{ width: `${clampedProgress}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300/80">
                      {formatBrl(spent)} de {formatBrl(Number(budget.limitAmount))}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
