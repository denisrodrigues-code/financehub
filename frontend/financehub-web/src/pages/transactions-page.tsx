import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { downloadCsv } from '../lib/csv'
import { getApiErrorMessage } from '../lib/http-error'
import { formatBrl } from '../utils/currency'

function getTodayInputDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toIsoFromInputDate(inputDate: string) {
  if (!inputDate) {
    return new Date().toISOString()
  }

  return new Date(`${inputDate}T12:00:00`).toISOString()
}

function toInputDate(isoDate: string) {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return getTodayInputDate()
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isFutureInputDate(inputDate: string) {
  if (!inputDate) {
    return false
  }

  const selected = new Date(`${inputDate}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return selected.getTime() > today.getTime()
}

export function TransactionsPage() {
  const queryClient = useQueryClient()
  const [accountId, setAccountId] = useState('')
  const [description, setDescription] = useState('')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('0')
  const [postedAtInput, setPostedAtInput] = useState(getTodayInputDate())
  const [type, setType] = useState('1')
  const [categoryId, setCategoryId] = useState('')
  const [editingTransactionId, setEditingTransactionId] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingMerchant, setEditingMerchant] = useState('')
  const [editingAmount, setEditingAmount] = useState('0')
  const [editingPostedAtInput, setEditingPostedAtInput] = useState(getTodayInputDate())
  const [editingType, setEditingType] = useState('1')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | '1' | '2'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.getAccounts().then((r) => r.data) })
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => api.getCategories().then((r) => r.data) })
  const transactions = useQuery({
    queryKey: ['transactions'],
    queryFn: () => api.getTransactions().then((r) => r.data),
  })

  const createTransaction = useMutation({
    mutationFn: (payload: {
      accountId: string
      description: string
      merchant: string
      amount: number
      type: number
      categoryId?: string
      postedAt: string
    }) => api.createTransaction(payload),
    onSuccess: () => {
      setDescription('')
      setMerchant('')
      setAmount('0')
      setPostedAtInput(getTodayInputDate())
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Transação registrada com sucesso.')
    },
    onError: async (error: unknown, variables) => {
      const refreshed = await transactions.refetch()
      const wasCreated = Boolean(
        refreshed.data?.some(
          (transaction) =>
            transaction.accountId === variables.accountId &&
            transaction.description === variables.description &&
            transaction.merchant === variables.merchant &&
            Number(transaction.amount) === Number(variables.amount) &&
            Number(transaction.type) === Number(variables.type) &&
            toInputDate(transaction.postedAt) === toInputDate(variables.postedAt),
        ),
      )

      if (wasCreated) {
        setDescription('')
        setMerchant('')
        setAmount('0')
        setPostedAtInput(getTodayInputDate())
        queryClient.invalidateQueries({ queryKey: ['summary'] })
        toast.success('Transação registrada com sucesso.')
        return
      }

      const message =
        getApiErrorMessage(error, 'Não foi possível salvar a transação.')

      toast.error(message)
    },
  })

  const deleteTransaction = useMutation({
    mutationFn: (transactionId: string) => api.deleteTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
      toast.success('Transação excluída com sucesso.')
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível excluir a transação.')),
  })

  const updateTransaction = useMutation({
    mutationFn: (payload: {
      transactionId: string
      description: string
      merchant: string
      amount: number
      type: number
      categoryId?: string
      postedAt: string
    }) =>
      api.updateTransaction(payload.transactionId, {
        description: payload.description,
        merchant: payload.merchant,
        amount: payload.amount,
        type: payload.type,
        categoryId: payload.categoryId,
        postedAt: payload.postedAt,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      queryClient.invalidateQueries({ queryKey: ['report'] })
      setEditingTransactionId('')
      toast.success('Transação atualizada com sucesso.')
    },
    onError: async (error: unknown, variables) => {
      const refreshed = await transactions.refetch()
      const updated = refreshed.data?.find((transaction) => transaction.id === variables.transactionId)
      const wasUpdated = Boolean(
        updated &&
          updated.description === variables.description &&
          updated.merchant === variables.merchant &&
          Number(updated.amount) === Number(variables.amount) &&
          Number(updated.type) === Number(variables.type) &&
          (updated.category?.id ?? '') === (variables.categoryId ?? ''),
      )

      if (wasUpdated) {
        queryClient.invalidateQueries({ queryKey: ['summary'] })
        queryClient.invalidateQueries({ queryKey: ['report'] })
        setEditingTransactionId('')
        toast.success('Transação atualizada com sucesso.')
        return
      }

      const message =
        getApiErrorMessage(error, 'Não foi possível atualizar a transação.')

      toast.error(message)
    },
  })

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()

    return (transactions.data ?? [])
      .filter((transaction) => {
        if (typeFilter !== 'all' && String(transaction.type) !== typeFilter) {
          return false
        }

        if (categoryFilter !== 'all' && (transaction.category?.id ?? '') !== categoryFilter) {
          return false
        }

        if (!query) {
          return true
        }

        return [transaction.description, transaction.merchant, transaction.category?.name ?? '']
          .join(' ')
          .toLowerCase()
          .includes(query)
      })
      .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
  }, [transactions.data, search, typeFilter, categoryFilter])

  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedTransactions = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const exportFilteredTransactions = () => {
    if (!filteredTransactions.length) {
      toast.error('Não há transações para exportar.')
      return
    }

    const header = ['Data', 'Tipo', 'Descrição', 'Estabelecimento', 'Categoria', 'Valor (BRL)']
    const rows = filteredTransactions.map((transaction) => [
      new Date(transaction.postedAt).toLocaleDateString('pt-BR'),
      transaction.type === 2 ? 'Receita' : 'Despesa',
      transaction.description,
      transaction.merchant,
      transaction.category?.name ?? 'Sem categoria',
      Number(transaction.amount).toFixed(2),
    ])

    downloadCsv(`transacoes-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
    toast.success('CSV gerado com sucesso.')
  }

  if (accounts.isError || categories.isError || transactions.isError) {
    return <p className="text-sm text-rose-300">Não foi possível carregar os dados de transações.</p>
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="app-title text-2xl font-bold">Transações</h2>
        <p className="app-subtitle text-sm">Registre receitas e despesas para alimentar o motor analítico.</p>
      </header>

      <section className="app-panel p-4">
        <h3 className="mb-3 text-lg font-semibold text-slate-100">Nova transação</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="app-select">
            <option value="">Selecione a conta</option>
            {accounts.data?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>

          <select value={type} onChange={(e) => setType(e.target.value)} className="app-select">
            <option value="1">Despesa</option>
            <option value="2">Receita</option>
          </select>

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição"
            className="app-input"
          />

          <input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder="Estabelecimento"
            className="app-input"
          />

          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Valor"
            type="number"
            className="app-input"
          />

          <input
            value={postedAtInput}
            onChange={(e) => setPostedAtInput(e.target.value)}
            type="date"
            className="app-input"
          />

          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="app-select">
            <option value="">Sem categoria</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={!accountId || !description || createTransaction.isPending}
          onClick={() => {
            const parsedAmount = Number(amount)
            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
              toast.error('Informe um valor maior que zero.')
              return
            }

            if (isFutureInputDate(postedAtInput)) {
              toast.error('A data da transação não pode ser no futuro.')
              return
            }

            const payload = {
              accountId,
              description,
              merchant,
              amount: parsedAmount,
              type: Number(type),
              categoryId: categoryId || undefined,
              postedAt: toIsoFromInputDate(postedAtInput),
            }
            createTransaction.mutate(payload)
          }}
          className="app-button mt-3 px-4 py-2 text-sm disabled:opacity-60"
        >
          Salvar transação
        </button>
      </section>

      <section className="app-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-slate-100">Últimas transações</h3>
          <button type="button" onClick={exportFilteredTransactions} className="rounded-lg border border-cyan-300/35 px-3 py-1.5 text-xs text-cyan-200 hover:border-cyan-300/60">
            Exportar CSV
          </button>
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar descrição/estabelecimento"
            className="app-input md:col-span-2"
          />
          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as 'all' | '1' | '2')
              setPage(1)
            }}
            className="app-select"
          >
            <option value="all">Todos os tipos</option>
            <option value="1">Despesas</option>
            <option value="2">Receitas</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value)
              setPage(1)
            }}
            className="app-select"
          >
            <option value="all">Todas as categorias</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {!filteredTransactions.length ? (
          <div className="rounded-lg border border-indigo-300/20 bg-indigo-950/25 px-3 py-2 text-sm text-slate-300/85">
            Nenhuma transação encontrada com os filtros atuais.
          </div>
        ) : null}
        <div className="space-y-2">
          {pagedTransactions.map((transaction) => (
            <div key={transaction.id} className="table-line flex items-center justify-between rounded-lg border bg-indigo-950/25 px-3 py-2">
              <div>
                <p className="font-medium text-slate-100">{transaction.description}</p>
                <p className="text-xs text-slate-300/75">
                  {transaction.merchant} • {new Date(transaction.postedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className={`font-semibold ${transaction.type === 2 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {transaction.type === 2 ? '+' : '-'} {formatBrl(transaction.amount)}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTransactionId(transaction.id)
                    setEditingDescription(transaction.description)
                    setEditingMerchant(transaction.merchant)
                    setEditingAmount(String(transaction.amount))
                    setEditingPostedAtInput(toInputDate(transaction.postedAt))
                    setEditingType(String(transaction.type))
                    setEditingCategoryId(transaction.category?.id ?? '')
                  }}
                  className="rounded-md border border-cyan-300/30 px-2 py-1 text-xs text-cyan-200 hover:border-cyan-300/60"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Deseja realmente excluir esta transação?')) {
                      deleteTransaction.mutate(transaction.id)
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

        {filteredTransactions.length > pageSize ? (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-300/80">
            <p>
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-md border border-indigo-300/30 px-2 py-1 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="rounded-md border border-indigo-300/30 px-2 py-1 disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}

        {editingTransactionId ? (
          <div className="mt-4 rounded-lg border border-cyan-300/22 bg-indigo-950/35 p-3">
            <p className="mb-2 text-sm font-semibold text-slate-100">Editar transação</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={editingDescription}
                onChange={(event) => setEditingDescription(event.target.value)}
                className="app-input"
                placeholder="Descrição"
              />
              <input
                value={editingMerchant}
                onChange={(event) => setEditingMerchant(event.target.value)}
                className="app-input"
                placeholder="Estabelecimento"
              />
              <input
                value={editingAmount}
                onChange={(event) => setEditingAmount(event.target.value)}
                type="number"
                className="app-input"
                placeholder="Valor"
              />
              <input
                value={editingPostedAtInput}
                onChange={(event) => setEditingPostedAtInput(event.target.value)}
                type="date"
                className="app-input"
              />
              <select value={editingType} onChange={(event) => setEditingType(event.target.value)} className="app-select">
                <option value="1">Despesa</option>
                <option value="2">Receita</option>
              </select>
              <select
                value={editingCategoryId}
                onChange={(event) => setEditingCategoryId(event.target.value)}
                className="app-select md:col-span-2"
              >
                <option value="">Sem categoria</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const original = transactions.data?.find((item) => item.id === editingTransactionId)
                  if (!original) {
                    return
                  }

                  const parsedAmount = Number(editingAmount)
                  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                    toast.error('Informe um valor maior que zero.')
                    return
                  }

                  if (isFutureInputDate(editingPostedAtInput)) {
                    toast.error('A data da transação não pode ser no futuro.')
                    return
                  }

                  updateTransaction.mutate({
                    transactionId: editingTransactionId,
                    description: editingDescription,
                    merchant: editingMerchant,
                    amount: parsedAmount,
                    type: Number(editingType),
                    categoryId: editingCategoryId || undefined,
                    postedAt: toIsoFromInputDate(editingPostedAtInput),
                  })
                }}
                disabled={!editingDescription || updateTransaction.isPending}
                className="app-button px-4 py-2 text-sm disabled:opacity-60"
              >
                {updateTransaction.isPending ? 'Salvando...' : 'Salvar edição'}
              </button>
              <button
                type="button"
                onClick={() => setEditingTransactionId('')}
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
