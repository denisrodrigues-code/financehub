import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { NavLink, useSearchParams } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { decodeJwtPayload } from '../lib/jwt'
import { useAuthStore } from '../store/auth-store'
import { useThemeStore } from '../store/theme-store'
import { api } from '../lib/api'
import { MetricCard } from '../components/ui/metric-card'
import { PageLoader } from '../components/ui/page-loader'
import { formatBrl } from '../utils/currency'

const NAME_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'

function DashboardBottomIcon({ type }: { type: 'home' | 'wallet' | 'transfer' | 'user' }) {
  if (type === 'home') {
    return (
      <svg viewBox="0 0 24 24" className="mx-auto mb-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <title>Dashboard</title>
        <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (type === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" className="mx-auto mb-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <title>Contas</title>
        <rect x="3" y="6" width="18" height="12" rx="3" />
        <path d="M15 12h6" strokeLinecap="round" />
        <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (type === 'transfer') {
    return (
      <svg viewBox="0 0 24 24" className="mx-auto mb-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <title>Operações</title>
        <path d="M6 8h12" strokeLinecap="round" />
        <path d="m14 5 4 3-4 3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 16H6" strokeLinecap="round" />
        <path d="m10 13-4 3 4 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="mx-auto mb-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <title>Perfil</title>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.2 3.1-5 7-5s7 1.8 7 5" strokeLinecap="round" />
    </svg>
  )
}

export function DashboardPage() {
  const [mobileChartView, setMobileChartView] = useState<'income' | 'expense' | 'balance'>('balance')
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const [searchParams, setSearchParams] = useSearchParams()
  const isLightTheme = theme === 'light'
  const accessToken = useAuthStore((state) => state.accessToken)
  const userNameFromStore = useAuthStore((state) => state.userName)
  const profilePhoto = useAuthStore((state) => state.profilePhoto)
  const setProfilePhoto = useAuthStore((state) => state.setProfilePhoto)

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A foto deve ter no máximo 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfilePhoto(reader.result)
        toast.success('Foto de perfil atualizada.')
      }
    }
    reader.readAsDataURL(file)
  }

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
      saldo: (monthData?.income ?? 0) - (monthData?.expense ?? 0),
    }
  })

  const hasAnyMovement = chartData.some((item) => item.entradas > 0 || item.saidas > 0)
  const recentTransactions = [...filteredTransactions]
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, 3)

  const mobileRecentTransactions = recentTransactions.filter((transaction) => {
    if (mobileChartView === 'income') {
      return transaction.type === 2
    }

    if (mobileChartView === 'expense') {
      return transaction.type === 1
    }

    return true
  })

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

  const payload = decodeJwtPayload(accessToken)
  const fullName = String(userNameFromStore ?? payload[NAME_CLAIM] ?? payload.name ?? 'Usuário')
  const firstName = fullName.trim().split(' ')[0] ?? 'Usuário'

  return (
    <div className="flex h-full flex-col md:block md:space-y-3 lg:space-y-2.5">
      <section className="mobile-dashboard-frame flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-violet-300/25 bg-[#150d2f]/90 p-4 md:hidden">
        <header className="mb-3">
          <div className="relative mb-3 flex items-center">
            <label className="h-14 w-14 cursor-pointer overflow-hidden rounded-full border border-violet-300/35 bg-violet-950/55">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Foto do perfil" className="h-full w-full object-cover" />
              ) : (
                <span className="text-accent-theme grid h-full w-full place-items-center text-sm font-semibold">{firstName.charAt(0).toUpperCase()}</span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
            <p className="text-accent-theme absolute left-1/2 -translate-x-1/2 mono text-xs font-semibold tracking-[0.2em]">FINANCEHUB</p>
            <button
              type="button"
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              onClick={toggleTheme}
              className="text-accent-theme absolute right-0 grid h-9 w-9 place-items-center rounded-full border border-violet-300/35 bg-violet-950/55 transition hover:border-violet-200/70"
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <title>Tema claro</title>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2.5V5" strokeLinecap="round" />
                  <path d="M12 19v2.5" strokeLinecap="round" />
                  <path d="M4.5 12H2" strokeLinecap="round" />
                  <path d="M22 12h-2.5" strokeLinecap="round" />
                  <path d="m18.36 5.64-1.77 1.77" strokeLinecap="round" />
                  <path d="m7.41 16.59-1.77 1.77" strokeLinecap="round" />
                  <path d="m5.64 5.64 1.77 1.77" strokeLinecap="round" />
                  <path d="m16.59 16.59 1.77 1.77" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <title>Tema escuro</title>
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
          <h2 className="text-primary-theme text-[1.72rem] font-bold leading-tight">Olá, {firstName} 👋</h2>
        </header>

        <div
          className="mb-3 rounded-2xl border border-violet-300/30 p-3.5"
          style={{
            backgroundImage: isLightTheme
              ? 'linear-gradient(110deg,#cbb9ff 0%,#ab92f4 56%,#8c79dd 100%)'
              : 'linear-gradient(110deg,#a855f7 0%,#7c3aed 56%,#4c1d95 100%)',
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-50/90">Saldo total</p>
          <p className="mt-1 text-[2rem] font-extrabold leading-none text-white">{formatBrl(summary.totalBalance)}</p>
          <p className={`mt-1 text-[11px] font-semibold ${summary.cashflow >= 0 ? 'text-violet-50' : 'text-rose-100'}`}>
            {summary.cashflow >= 0 ? '+' : '-'} {formatBrl(Math.abs(summary.cashflow))} este mês
          </p>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="surface-inner rounded-xl p-2.5">
            <p className="text-[10px] uppercase text-slate-300/80">Receitas</p>
            <p className="mt-1 text-sm font-semibold text-emerald-300">{formatBrl(summary.monthlyIncome)}</p>
          </div>
          <div className="surface-inner rounded-xl p-2.5">
            <p className="text-[10px] uppercase text-slate-300/80">Despesas</p>
            <p className="mt-1 text-sm font-semibold text-rose-300">{formatBrl(summary.monthlyExpense)}</p>
          </div>
          <div className="surface-inner rounded-xl p-2.5">
            <p className="text-[10px] uppercase text-slate-300/80">Fluxo</p>
            <p className={`mt-1 text-sm font-semibold ${summary.cashflow >= 0 ? 'text-violet-300' : 'text-rose-300'}`}>{formatBrl(summary.cashflow)}</p>
          </div>
          <div className="surface-inner rounded-xl p-2.5">
            <p className="text-[10px] uppercase text-slate-300/80">Contas</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{summary.accountsCount}</p>
          </div>
        </div>

        <div className="surface-card rounded-xl p-2.5">
          <div className="h-28">
            {!hasAnyMovement ? (
              <div className="surface-soft text-secondary-theme rounded-lg px-2 py-1.5 text-[10px]">
                Sem movimentação financeira nos últimos 6 meses.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 2, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGradientMobile" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGradientMobile" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={isLightTheme ? 'rgba(100, 116, 139, 0.25)' : 'rgba(148, 163, 184, 0.12)'} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: isLightTheme ? '#334155' : '#93a4d6', fontSize: isLightTheme ? 10 : 9 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.96)' : 'rgba(7, 13, 38, 0.94)',
                      border: isLightTheme ? '1px solid rgba(203, 213, 225, 0.9)' : '1px solid rgba(129, 140, 248, 0.25)',
                      borderRadius: '10px',
                      color: isLightTheme ? '#111827' : '#e5edff',
                      fontSize: '11px',
                    }}
                  />
                  <Area dataKey="entradas" stroke="#c084fc" fill="url(#incomeGradientMobile)" strokeWidth={2} dot={false} />
                  <Area dataKey="saidas" stroke="#f87171" fill="url(#expenseGradientMobile)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="mt-2 mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => setMobileChartView('balance')}
            className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
              mobileChartView === 'balance'
                ? 'border border-violet-300/70 bg-violet-500/45 text-white shadow-[0_0_12px_rgba(139,92,246,0.42)]'
                : 'btn-outline text-secondary-theme'
            }`}
          >
            Saldo
          </button>
          <button
            type="button"
            onClick={() => setMobileChartView('income')}
            className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
              mobileChartView === 'income'
                ? 'border border-violet-300/70 bg-violet-500/45 text-white shadow-[0_0_12px_rgba(139,92,246,0.42)]'
                : 'btn-outline text-secondary-theme'
            }`}
          >
            Receitas
          </button>
          <button
            type="button"
            onClick={() => setMobileChartView('expense')}
            className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
              mobileChartView === 'expense'
                ? 'border border-violet-300/70 bg-violet-500/45 text-white shadow-[0_0_12px_rgba(139,92,246,0.42)]'
                : 'btn-outline text-secondary-theme'
            }`}
          >
            Despesas
          </button>
        </div>

        <div className="surface-card rounded-xl p-2.5">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-200">Atividades recentes</h3>
          {!mobileRecentTransactions.length ? (
            <p className="surface-soft text-secondary-theme rounded-lg px-2 py-1.5 text-[10px]">
              Nenhuma atividade recente.
            </p>
          ) : (
            <div className="space-y-1.5">
              {mobileRecentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="surface-inner flex items-center justify-between rounded-lg px-2 py-1.5"
                >
                  <div>
                    <p className="text-[11px] font-semibold text-slate-100">{transaction.description}</p>
                    <p className="text-[10px] text-slate-300/80">{new Date(transaction.postedAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <p className={`text-[11px] font-semibold ${transaction.type === 2 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {transaction.type === 2 ? '+' : '-'} {formatBrl(Number(transaction.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <nav className="mt-auto grid grid-cols-4 gap-1 rounded-2xl border border-violet-300/20 bg-[#1a1036]/95 px-2 py-1.5 shadow-[0_10px_36px_rgba(20,10,40,0.55)] md:hidden">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `rounded-xl px-2 py-1.5 text-center text-[11px] font-semibold leading-none transition ${
                isActive
                  ? 'border border-violet-300/65 bg-violet-500/45 text-white shadow-[0_0_12px_rgba(139,92,246,0.38)]'
                  : 'text-slate-300/90'
              }`
            }
          >
            <DashboardBottomIcon type="home" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/accounts"
            className={({ isActive }) =>
              `rounded-xl px-2 py-1.5 text-center text-[11px] font-semibold leading-none transition ${
                isActive
                  ? 'border border-violet-300/65 bg-violet-500/45 text-white shadow-[0_0_12px_rgba(139,92,246,0.38)]'
                  : 'text-slate-300/90'
              }`
            }
          >
            <DashboardBottomIcon type="wallet" />
            <span>Contas</span>
          </NavLink>
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              `rounded-xl px-2 py-1.5 text-center text-[11px] font-semibold leading-none transition ${
                isActive
                  ? 'border border-violet-300/65 bg-violet-500/45 text-white shadow-[0_0_12px_rgba(139,92,246,0.38)]'
                  : 'text-slate-300/90'
              }`
            }
          >
            <DashboardBottomIcon type="transfer" />
            <span>Operações</span>
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `rounded-xl px-2 py-1.5 text-center text-[11px] font-semibold leading-none transition ${
                isActive
                  ? 'border border-violet-300/65 bg-violet-500/45 text-white shadow-[0_0_12px_rgba(139,92,246,0.38)]'
                  : 'text-slate-300/90'
              }`
            }
          >
            <DashboardBottomIcon type="user" />
            <span>Perfil</span>
          </NavLink>
        </nav>

      </section>

      <div className="hidden space-y-3 lg:space-y-2.5 md:block">
        <header>
          <h2 className="app-title text-xl font-bold xl:text-2xl">Dashboard Financeiro</h2>
          <p className="app-subtitle mt-0.5 text-xs xl:text-sm">Visão consolidada das suas contas e fluxo de caixa.</p>
        </header>

        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Saldo total" value={formatBrl(summary.totalBalance)} tone="neutral" />
          <MetricCard label="Receitas do mês" value={formatBrl(summary.monthlyIncome)} tone="positive" />
          <MetricCard label="Despesas do mês" value={formatBrl(summary.monthlyExpense)} tone="negative" />
          <MetricCard label="Fluxo de caixa" value={formatBrl(summary.cashflow)} tone={summary.cashflow >= 0 ? 'positive' : 'negative'} />
          <MetricCard label="Contas conectadas" value={String(summary.accountsCount)} />
          <MetricCard label="Transações" value={String(summary.transactionsCount)} />
        </section>

        <section className="surface-card rounded-xl p-3 lg:p-2.5 xl:p-3.5">
          <div className="mb-2">
            <h3 className="text-primary-theme text-base font-semibold xl:text-lg">Receitas x Despesas</h3>
          </div>
          <div className="h-44 lg:h-36 xl:h-52">
            {!hasAnyMovement ? (
              <div className="surface-soft text-secondary-theme mb-2 rounded-lg px-3 py-2 text-xs">
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
                    backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.96)' : 'rgba(7, 13, 38, 0.94)',
                    border: isLightTheme ? '1px solid rgba(203, 213, 225, 0.9)' : '1px solid rgba(129, 140, 248, 0.25)',
                    borderRadius: '12px',
                    color: isLightTheme ? '#111827' : '#e5edff',
                  }}
                />
                <Area dataKey="entradas" stroke="#22c55e" fill="url(#incomeGradient)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Area dataKey="saidas" stroke="#f87171" fill="url(#expenseGradient)" strokeWidth={2.5} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="app-panel grid gap-2 p-3 md:grid-cols-3">
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
          <div className="surface-card rounded-xl p-3 lg:p-2.5 xl:p-3.5">
            <h3 className="text-primary-theme mb-2 text-base font-semibold xl:text-lg">Transações recentes</h3>
            {!recentTransactions.length ? (
              <div className="surface-soft text-secondary-theme rounded-lg px-3 py-2 text-xs">
                Você ainda não registrou transações.
              </div>
            ) : (
              <div className="space-y-1.5 lg:space-y-1">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="surface-inner table-line flex items-center justify-between rounded-lg px-3 py-1.5"
                  >
                    <div>
                      <p className="text-primary-theme text-[13px] font-medium">{transaction.description}</p>
                      <p className="text-secondary-theme text-[11px]">
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

          <div className="surface-card rounded-xl p-3 lg:p-2.5 xl:p-3.5">
            <h3 className="text-primary-theme mb-2 text-base font-semibold xl:text-lg">Progresso dos orçamentos</h3>
            {!budgetProgress.length ? (
              <div className="surface-soft text-secondary-theme rounded-lg px-3 py-2 text-xs">
                Nenhum orçamento ativo para acompanhar.
              </div>
            ) : (
              <div className="space-y-2">
                {budgetProgress.map(({ budget, spent, progress }) => {
                  const clampedProgress = Math.min(progress, 100)
                  const barToneColor = progress >= 100 ? (isLightTheme ? '#dc2626' : '#fb7185') : progress >= 80 ? (isLightTheme ? '#d97706' : '#fcd34d') : (isLightTheme ? '#2563eb' : '#67e8f9')
                  const trackToneColor = isLightTheme ? 'rgba(148, 163, 184, 0.32)' : 'rgba(49, 46, 129, 0.7)'
                  return (
                    <div key={budget.id} className="surface-inner rounded-lg px-3 py-1.5">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-primary-theme text-[13px] font-medium">{budget.category.name}</p>
                        <p className="text-secondary-theme text-[11px]">{Math.round(progress)}%</p>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: trackToneColor }}>
                        <div className="h-2 rounded-full" style={{ width: `${clampedProgress}%`, backgroundColor: barToneColor }} />
                      </div>
                      <p className="text-secondary-theme mt-1 text-[11px]">
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
    </div>
  )
}
