import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { MobileAppFrame } from '../components/layout/mobile-app-frame'
import { api } from '../lib/api'
import { downloadCsv } from '../lib/csv'
import { getApiErrorMessage } from '../lib/http-error'
import { formatBrl } from '../utils/currency'

export function AccountsPage() {
  const queryClient = useQueryClient()
  const [selectedBankForConnectionIspb, setSelectedBankForConnectionIspb] = useState('')
  const [selectedConnection, setSelectedConnection] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNameTouched, setAccountNameTouched] = useState(false)
  const [lastSuggestedAccountName, setLastSuggestedAccountName] = useState('')
  const [balance, setBalance] = useState('')
  const [editingAccountId, setEditingAccountId] = useState('')
  const [editingAccountName, setEditingAccountName] = useState('')
  const [editingBalance, setEditingBalance] = useState('0')

  const connections = useQuery({
    queryKey: ['connections'],
    queryFn: () => api.getBankConnections().then((r) => r.data),
  })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.getAccounts().then((r) => r.data) })
  const banksDirectory = useQuery({
    queryKey: ['banks-directory'],
    queryFn: () => api.getBanksDirectory().then((r) => r.data),
    staleTime: 1000 * 60 * 60,
  })

  const createConnection = useMutation({
    mutationFn: (payload: { name: string; code?: string; ispb?: string }) => api.createBankConnectionFromDirectory(payload),
    onSuccess: () => {
      setSelectedBankForConnectionIspb('')
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success('Conexão bancária criada com sucesso.')
    },
    onError: async (error: unknown, variables) => {
      const refreshed = await connections.refetch()
      const wasCreated = Boolean(
        refreshed.data?.some(
          (connection) =>
            connection.institution.name === variables.name ||
            (variables.code ? connection.institution.code === variables.code : false),
        ),
      )

      if (wasCreated) {
        setSelectedBankForConnectionIspb('')
        toast.success('Conexão criada com sucesso.')
        return
      }

      toast.error(getApiErrorMessage(error, 'Não foi possível conectar o banco.'))
    },
  })

  const deleteConnection = useMutation({
    mutationFn: (connectionId: string) => api.deleteBankConnection(connectionId),
    onSuccess: (_, connectionId) => {
      setSelectedConnection((current) => (current === connectionId ? '' : current))
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success('Conexão bancária removida com sucesso.')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Não foi possível remover a conexão bancária.'))
    },
  })

  const createAccount = useMutation({
    mutationFn: () => {
      const connection = connections.data?.find((item) => item.id === selectedConnection)
      return api.createAccount({
        bankConnectionId: selectedConnection,
        name: accountName,
        bankName: connection?.institution.name,
        bankCode: connection?.institution.code,
        type: 1,
        currentBalance: balance.trim() === '' ? 0 : Number(balance),
        availableBalance: balance.trim() === '' ? 0 : Number(balance),
        currency: 'BRL',
      })
    },
    onSuccess: () => {
      setAccountName('')
      setAccountNameTouched(false)
      setLastSuggestedAccountName('')
      setBalance('')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('Conta criada com sucesso.')
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível criar a conta.')),
  })

  const deleteAccount = useMutation({
    mutationFn: (accountId: string) => api.deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Conta excluída com sucesso.')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Não foi possível excluir a conta.'))
    },
  })

  const updateAccount = useMutation({
    mutationFn: (payload: { accountId: string; name: string; currentBalance: number; type: number; currency: string }) =>
      api.updateAccount(payload.accountId, {
        name: payload.name,
        currentBalance: payload.currentBalance,
        availableBalance: payload.currentBalance,
        type: payload.type,
        currency: payload.currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      setEditingAccountId('')
      setEditingAccountName('')
      setEditingBalance('0')
      toast.success('Conta atualizada com sucesso.')
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível atualizar a conta.')),
  })

  if (connections.isError || accounts.isError) {
    return <p className="text-sm text-rose-300">Não foi possível carregar os dados de contas.</p>
  }

  const deletingConnectionId = deleteConnection.variables

  const exportAccountsCsv = () => {
    if (!accounts.data?.length) {
      toast.error('Não há contas para exportar.')
      return
    }

    const rows: Array<Array<string | number>> = [
      ['Conta', 'Banco', 'Código Banco', 'Tipo', 'Moeda', 'Saldo Atual', 'Saldo Disponível'],
      ...accounts.data.map((account) => [
        account.name,
        account.bankName ?? 'Não informado',
        account.bankCode ?? '-',
        String(account.type),
        account.currency,
        Number(account.currentBalance).toFixed(2),
        Number(account.availableBalance).toFixed(2),
      ]),
    ]

    downloadCsv(`contas-${new Date().toISOString().slice(0, 10)}.csv`, rows)
    toast.success('CSV de contas gerado com sucesso.')
  }

  const pageContent = (
    <>
      <header>
        <h2 className="app-title text-2xl font-bold">Contas e Conexões</h2>
        <p className="app-subtitle text-sm">Conecte bancos e cadastre contas para iniciar a consolidação.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="app-panel p-3 lg:p-2.5 xl:p-3.5">
          <h3 className="text-primary-theme mb-3 text-lg font-semibold">Nova conexão bancária</h3>
          <select
            value={selectedBankForConnectionIspb}
            onChange={(e) => setSelectedBankForConnectionIspb(e.target.value)}
            className="app-select"
            disabled={banksDirectory.isLoading || banksDirectory.isError}
          >
            <option value="">Selecione um banco</option>
            {banksDirectory.data?.map((bank) => (
              <option key={bank.ispb} value={bank.ispb}>
                {bank.code ? `${String(bank.code).padStart(3, '0')} - ` : ''}
                {bank.name}
              </option>
            ))}
          </select>
          {banksDirectory.isLoading ? <p className="text-secondary-theme mt-2 text-xs">Carregando bancos...</p> : null}
          {banksDirectory.isError ? (
            <p className="mt-2 text-xs text-rose-300">Não foi possível carregar os bancos externos.</p>
          ) : null}
            <button
              type="button"
              disabled={!selectedBankForConnectionIspb || createConnection.isPending}
            onClick={() => {
              const selectedBank = banksDirectory.data?.find((bank) => bank.ispb === selectedBankForConnectionIspb)
              if (!selectedBank) {
                toast.error('Selecione um banco válido.')
                return
              }

              createConnection.mutate({
                name: selectedBank.name,
                code: selectedBank.code ? String(selectedBank.code).padStart(3, '0') : undefined,
                ispb: selectedBank.ispb,
              })
            }}
            className="app-button mt-3 px-4 py-2 text-sm disabled:opacity-60"
            >
              Conectar banco
            </button>
          </div>

        <div className="app-panel p-3 lg:p-2.5 xl:p-3.5">
          <h3 className="text-primary-theme mb-3 text-lg font-semibold">Nova conta</h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={selectedConnection}
                onChange={(e) => {
                  const nextConnectionId = e.target.value
                  setSelectedConnection(nextConnectionId)

                  const nextConnection = connections.data?.find((item) => item.id === nextConnectionId)
                  const nextSuggestion = nextConnection ? `Conta - ${nextConnection.institution.name}` : ''
                  const canApplySuggestion =
                    !accountNameTouched || !accountName.trim() || accountName === lastSuggestedAccountName

                  if (canApplySuggestion) {
                    setAccountName(nextSuggestion)
                    setAccountNameTouched(false)
                  }

                  setLastSuggestedAccountName(nextSuggestion)
                }}
                className="app-select"
              >
                <option value="">Selecione uma conexão</option>
                {connections.data?.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.institution.code} - {connection.institution.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedConnection || deleteConnection.isPending}
                onClick={() => {
                  if (!selectedConnection) {
                    return
                  }
                  if (window.confirm('Deseja remover esta conexão bancária?')) {
                    deleteConnection.mutate(selectedConnection)
                  }
                }}
                className="btn-outline-danger rounded-lg px-3 py-2 text-xs disabled:opacity-60"
              >
                {deleteConnection.isPending && deletingConnectionId === selectedConnection ? 'Removendo...' : 'Remover'}
              </button>
            </div>

              <input
                value={accountName}
                onChange={(e) => {
                  setAccountName(e.target.value)
                  setAccountNameTouched(true)
                }}
                placeholder="Nome da conta"
                className="app-input"
              />

            <input
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="Saldo inicial"
              type="number"
              className="app-input"
            />

            <button
              type="button"
              disabled={!selectedConnection || !accountName || createAccount.isPending}
              onClick={() => createAccount.mutate()}
              className="app-button px-4 py-2 text-sm disabled:opacity-60"
            >
              Criar conta
            </button>
          </div>
        </div>
      </section>

      <section className="app-panel p-3 lg:p-2.5 xl:p-3.5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-primary-theme text-lg font-semibold">Contas cadastradas</h3>
          <button
            type="button"
            onClick={exportAccountsCsv}
            className="btn-outline-accent rounded-lg px-3 py-1.5 text-xs"
          >
            Exportar CSV
          </button>
        </div>
        {!accounts.data?.length ? (
          <div className="surface-soft text-secondary-theme rounded-lg px-3 py-2 text-sm">
            Você ainda não tem contas cadastradas.
          </div>
        ) : null}

        <div className="space-y-2 md:hidden">
          {accounts.data?.map((account) => (
            <article key={account.id} className="surface-inner table-line rounded-lg px-3 py-2">
              <p className="text-primary-theme text-sm font-semibold">{account.name}</p>
              <p className="text-secondary-theme text-xs">Tipo: {account.type}</p>
              <p className="text-accent-theme text-xs">Banco: {account.bankName ?? 'Não informado'}</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-primary-theme text-sm font-medium">{formatBrl(account.currentBalance)}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAccountId(account.id)
                      setEditingAccountName(account.name)
                      setEditingBalance(String(account.currentBalance))
                    }}
                    className="btn-outline-accent rounded-md px-2 py-1 text-xs"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Deseja realmente excluir esta conta?')) {
                        deleteAccount.mutate(account.id)
                      }
                    }}
                    className="btn-outline-danger rounded-md px-2 py-1 text-xs"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="text-primary-theme w-full text-left text-sm">
            <thead>
              <tr className="table-line text-secondary-theme border-b">
                <th className="pb-2">Conta</th>
                <th className="pb-2">Tipo</th>
                <th className="pb-2">Banco</th>
                <th className="pb-2">Saldo atual</th>
                <th className="pb-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data?.map((account) => (
                <tr key={account.id} className="table-line border-b">
                  <td className="py-2">{account.name}</td>
                  <td className="py-2">{account.type}</td>
                  <td className="py-2">{account.bankName ?? '-'}</td>
                  <td className="py-2 font-medium">{formatBrl(account.currentBalance)}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAccountId(account.id)
                          setEditingAccountName(account.name)
                          setEditingBalance(String(account.currentBalance))
                        }}
                        className="btn-outline-accent rounded-md px-2.5 py-1 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Deseja realmente excluir esta conta?')) {
                            deleteAccount.mutate(account.id)
                          }
                        }}
                        className="btn-outline-danger rounded-md px-2.5 py-1 text-xs"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingAccountId ? (
          <div className="surface-soft mt-4 rounded-lg p-3">
            <p className="text-primary-theme mb-2 text-sm font-semibold">Editar conta</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={editingAccountName}
                onChange={(event) => setEditingAccountName(event.target.value)}
                className="app-input"
                placeholder="Nome da conta"
              />
              <input
                value={editingBalance}
                onChange={(event) => setEditingBalance(event.target.value)}
                type="number"
                className="app-input"
                placeholder="Saldo"
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const original = accounts.data?.find((item) => item.id === editingAccountId)
                  if (!original) {
                    return
                  }
                  updateAccount.mutate({
                    accountId: editingAccountId,
                    name: editingAccountName,
                    currentBalance: Number(editingBalance),
                    type: original.type,
                    currency: original.currency,
                  })
                }}
                disabled={!editingAccountName || updateAccount.isPending}
                className="app-button px-4 py-2 text-sm disabled:opacity-60"
              >
                {updateAccount.isPending ? 'Salvando...' : 'Salvar edição'}
              </button>
              <button
                type="button"
                onClick={() => setEditingAccountId('')}
                className="btn-outline text-secondary-theme rounded-lg px-4 py-2 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </>
  )

  return (
    <div className="flex h-full flex-col md:block">
      <MobileAppFrame title="Contas e Conexões">
        <div className="space-y-3 [&>header]:hidden [&_.app-panel]:rounded-xl [&_.app-panel]:border [&_.app-panel]:p-3 [&_.table-line]:border [&_h3]:text-[15px] [&_h3]:font-semibold [&_label]:text-slate-200 [&_.app-input]:h-11 [&_.app-input]:rounded-xl [&_.app-select]:h-11 [&_.app-select]:rounded-xl">{pageContent}</div>
      </MobileAppFrame>

      <div className="hidden space-y-3 lg:space-y-2.5 md:block">{pageContent}</div>
    </div>
  )
}
