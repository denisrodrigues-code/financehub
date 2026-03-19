import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { api } from '../lib/api'
import { PageLoader } from '../components/ui/page-loader'
import { getApiErrorMessage } from '../lib/http-error'
import { useAuthStore } from '../store/auth-store'

export function ProfilePage() {
  const setUserProfile = useAuthStore((state) => state.setUserProfile)

  const profileQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe().then((response) => response.data),
  })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const updateProfile = useMutation({
    mutationFn: (payload: { name: string; email: string }) => api.updateMe(payload),
    onSuccess: (response) => {
      setUserProfile(response.data.name, response.data.email)
      toast.success('Perfil atualizado com sucesso.')
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o perfil.')),
  })

  const updatePassword = useMutation({
    mutationFn: () => api.updatePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      toast.success('Senha atualizada com sucesso.')
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error, 'Não foi possível atualizar a senha.')),
  })

  if (profileQuery.isLoading) {
    return <PageLoader label="Carregando perfil..." />
  }

  if (profileQuery.isError || !profileQuery.data) {
    return <p className="text-sm text-rose-300">Não foi possível carregar os dados do perfil.</p>
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="app-title text-2xl font-bold">Perfil</h2>
        <p className="app-subtitle text-sm">Atualize seus dados pessoais e sua senha.</p>
      </header>

      <section className="app-panel p-4">
        <h3 className="mb-3 text-lg font-semibold text-slate-100">Dados pessoais</h3>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            const name = String(formData.get('name') ?? '').trim()
            const email = String(formData.get('email') ?? '').trim()
            if (!name || !email) {
              toast.error('Preencha nome e e-mail.')
              return
            }
            updateProfile.mutate({ name, email })
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="profile-name" className="mb-1 block text-sm text-slate-200">
                Nome
              </label>
              <input id="profile-name" name="name" defaultValue={profileQuery.data.name} className="app-input" />
            </div>
            <div>
              <label htmlFor="profile-email" className="mb-1 block text-sm text-slate-200">
                E-mail
              </label>
              <input id="profile-email" name="email" defaultValue={profileQuery.data.email} className="app-input" />
            </div>
          </div>

          <button type="submit" disabled={updateProfile.isPending} className="app-button px-4 py-2 text-sm disabled:opacity-60">
            {updateProfile.isPending ? 'Salvando...' : 'Salvar dados'}
          </button>
        </form>
      </section>

      <section className="app-panel p-4">
        <h3 className="mb-3 text-lg font-semibold text-slate-100">Segurança</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="current-password" className="mb-1 block text-sm text-slate-200">
              Senha atual
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="app-input"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm text-slate-200">
              Nova senha
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="app-input"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => updatePassword.mutate()}
          disabled={!currentPassword || !newPassword || updatePassword.isPending}
          className="app-button mt-4 px-4 py-2 text-sm disabled:opacity-60"
        >
          {updatePassword.isPending ? 'Atualizando...' : 'Atualizar senha'}
        </button>
      </section>
    </div>
  )
}
