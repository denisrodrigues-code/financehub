import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { api } from '../lib/api'
import { downloadCsv } from '../lib/csv'
import { getApiErrorMessage } from '../lib/http-error'
import { formatBrl } from '../utils/currency'

export function BudgetsPage() {
  const queryClient = useQueryClient()
  const [categoryId, setCategoryId] = useState('')
  const [limitAmount, setLimitAmount] = useState('0')
  const [editingBudgetId, setEditingBudgetId] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editingLimitAmount, setEditingLimitAmount] = useState('0')

  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.getCategories().then((r) => r.data) })
  const budgets = useQuery({ queryKey: ['budgets'], queryFn: () => api.getBudgets().then((r) => r.data) })

  const createBudget = useMutation({
    mutationFn: () =>
      api.createBudget({
        categoryId,
        limitAmount: Number(limitAmount),
        period: 1,
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      }),
    onSuccess: () => {
      setLimitAmount('0')
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Orçamento criado com sucesso.')
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível criar o orçamento.')),
  })

  const deleteBudget = useMutation({
    mutationFn: (budgetId: string) => api.deleteBudget(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success('Orçamento excluído com sucesso.')
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível excluir o orçamento.')),
  })

  const updateBudget = useMutation({
    mutationFn: (payload: {
      budgetId: string
      categoryId: string
      limitAmount: number
      period: number
      startDate: string
      endDate: string
    }) =>
      api.updateBudget(payload.budgetId, {
        categoryId: payload.categoryId,
        limitAmount: payload.limitAmount,
        period: payload.period,
        startDate: payload.startDate,
        endDate: payload.endDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      setEditingBudgetId('')
      toast.success('Orçamento atualizado com sucesso.')
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o orçamento.')),
  })

  if (categories.isError || budgets.isError) {
    return <p className="text-sm text-rose-300">Não foi possível carregar os dados de orçamentos.</p>
  }

  const exportBudgetsCsv = () => {
    if (!budgets.data?.length) {
      toast.error('Não há orçamentos para exportar.')
      return
    }

    const rows: Array<Array<string | number>> = [
      ['Categoria', 'Período', 'Início', 'Fim', 'Limite'],
      ...budgets.data.map((budget) => [
        budget.category.name,
        String(budget.period),
        new Date(budget.startDate).toLocaleDateString('pt-BR'),
        new Date(budget.endDate).toLocaleDateString('pt-BR'),
        Number(budget.limitAmount).toFixed(2),
      ]),
    ]

    downloadCsv(`orcamentos-${new Date().toISOString().slice(0, 10)}.csv`, rows)
    toast.success('CSV de orçamentos gerado com sucesso.')
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="app-title text-2xl font-bold">Orçamentos</h2>
        <p className="app-subtitle text-sm">Defina limites por categoria e monitore excedentes.</p>
      </header>

      <section className="app-panel p-4">
        <h3 className="mb-3 text-lg font-semibold text-slate-100">Novo orçamento mensal</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="app-select">
            <option value="">Selecione a categoria</option>
            {categories.data
              ?.filter((category) => category.type === 'Expense')
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>

          <input
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            type="number"
            placeholder="Limite"
            className="app-input"
          />
        </div>

        <button
          type="button"
          disabled={!categoryId || createBudget.isPending}
          onClick={() => {
            const parsedLimitAmount = Number(limitAmount)
            if (!Number.isFinite(parsedLimitAmount) || parsedLimitAmount <= 0) {
              toast.error('Informe um limite maior que zero.')
              return
            }

            createBudget.mutate()
          }}
          className="app-button mt-3 px-4 py-2 text-sm disabled:opacity-60"
        >
          Criar orçamento
        </button>
      </section>

      <section className="app-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-100">Orçamentos ativos</h3>
          <button
            type="button"
            onClick={exportBudgetsCsv}
            className="rounded-lg border border-cyan-300/35 px-3 py-1.5 text-xs text-cyan-200 hover:border-cyan-300/60"
          >
            Exportar CSV
          </button>
        </div>
        {!budgets.data?.length ? (
          <div className="rounded-lg border border-indigo-300/20 bg-indigo-950/25 px-3 py-2 text-sm text-slate-300/85">
            Você ainda não possui orçamentos ativos.
          </div>
        ) : null}
        <div className="space-y-2">
          {budgets.data?.map((budget) => (
            <div key={budget.id} className="table-line flex items-center justify-between rounded-lg border bg-indigo-950/25 px-3 py-2">
              <div>
                <p className="font-medium text-slate-100">{budget.category.name}</p>
                <p className="text-xs text-slate-300/75">
                  {new Date(budget.startDate).toLocaleDateString('pt-BR')} -{' '}
                  {new Date(budget.endDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-slate-100">{formatBrl(budget.limitAmount)}</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBudgetId(budget.id)
                    setEditingCategoryId(budget.category.categoryId)
                    setEditingLimitAmount(String(budget.limitAmount))
                  }}
                  className="rounded-md border border-cyan-300/30 px-2 py-1 text-xs text-cyan-200 hover:border-cyan-300/60"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Deseja realmente excluir este orçamento?')) {
                      deleteBudget.mutate(budget.id)
                    }
                  }}
                  className="rounded-md border border-rose-300/30 px-2 py-1 text-xs text-rose-200 hover:border-rose-300/60"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>

        {editingBudgetId ? (
          <div className="mt-4 rounded-lg border border-cyan-300/22 bg-indigo-950/35 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-100">Editar orçamento</p>
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={editingCategoryId}
                onChange={(event) => setEditingCategoryId(event.target.value)}
                className="app-select"
              >
                <option value="">Selecione a categoria</option>
                {categories.data
                  ?.filter((category) => category.type === 'Expense')
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
              <input
                value={editingLimitAmount}
                onChange={(event) => setEditingLimitAmount(event.target.value)}
                type="number"
                className="app-input"
                placeholder="Limite"
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const original = budgets.data?.find((item) => item.id === editingBudgetId)
                  if (!original || !editingCategoryId) {
                    return
                  }

                  const parsedLimitAmount = Number(editingLimitAmount)
                  if (!Number.isFinite(parsedLimitAmount) || parsedLimitAmount <= 0) {
                    toast.error('Informe um limite maior que zero.')
                    return
                  }

                  updateBudget.mutate({
                    budgetId: editingBudgetId,
                    categoryId: editingCategoryId,
                    limitAmount: parsedLimitAmount,
                    period: original.period,
                    startDate: original.startDate,
                    endDate: original.endDate,
                  })
                }}
                disabled={!editingCategoryId || updateBudget.isPending}
                className="app-button px-4 py-2 text-sm disabled:opacity-60"
              >
                {updateBudget.isPending ? 'Salvando...' : 'Salvar edição'}
              </button>
              <button
                type="button"
                onClick={() => setEditingBudgetId('')}
                className="rounded-lg border border-indigo-300/30 px-4 py-2 text-sm text-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
