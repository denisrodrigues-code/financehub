import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { MobileAppFrame } from '../components/layout/mobile-app-frame'
import { api } from '../lib/api'
import { PageLoader } from '../components/ui/page-loader'
import { getApiErrorMessage } from '../lib/http-error'
import { useAuthStore } from '../store/auth-store'

export function ProfilePage() {
  const setUserProfile = useAuthStore((state) => state.setUserProfile)
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const profilePhoto = useAuthStore((state) => state.profilePhoto)
  const setProfilePhoto = useAuthStore((state) => state.setProfilePhoto)

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

  const pageContent = (
    <>
      <header>
        <h2 className="app-title text-2xl font-bold">Perfil</h2>
        <p className="app-subtitle text-sm">Atualize seus dados pessoais e sua senha.</p>
      </header>

      <section className="app-panel p-3 lg:p-2.5 xl:p-3.5">
        <h3 className="text-primary-theme mb-3 text-lg font-semibold">Dados pessoais</h3>
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
              <label htmlFor="profile-name" className="text-secondary-theme mb-1 block text-sm">
                Nome
              </label>
              <input id="profile-name" name="name" defaultValue={profileQuery.data.name} className="app-input" />
            </div>
            <div>
              <label htmlFor="profile-email" className="text-secondary-theme mb-1 block text-sm">
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

      <section className="app-panel p-3 lg:p-2.5 xl:p-3.5">
        <h3 className="text-primary-theme mb-3 text-lg font-semibold">Segurança</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="current-password" className="text-secondary-theme mb-1 block text-sm">
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
            <label htmlFor="new-password" className="text-secondary-theme mb-1 block text-sm">
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

      <section className="app-panel p-3 md:hidden">
        <button
          type="button"
          onClick={clearTokens}
          className="btn-mobile-logout w-full px-4 py-2 text-sm"
        >
          <span className="btn-mobile-logout-icon" aria-hidden>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
              <path d="M15 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 12H9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 21H6a2 2 0 01-2-2V5a2 2 0 012-2h7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Sair
        </button>
      </section>

      <section className="app-panel hidden p-3 md:block lg:p-2.5 xl:p-3.5">
        <h3 className="text-primary-theme mb-3 text-lg font-semibold">Sessão</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={clearTokens} className="profile-action-btn profile-action-btn-danger text-sm">
            <span className="profile-action-icon" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
                <path d="M15 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 12H9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 21H6a2 2 0 01-2-2V5a2 2 0 012-2h7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Sair
          </button>
          {profilePhoto ? (
            <button
              type="button"
              onClick={() => {
                setProfilePhoto(null)
                toast.success('Foto de perfil removida.')
              }}
              className="profile-action-btn profile-action-btn-neutral text-sm"
            >
              <span className="profile-action-icon" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
                  <path d="M9 3h6" strokeLinecap="round" />
                  <path d="M4 7h16" strokeLinecap="round" />
                  <path d="m18 7-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 11v6" strokeLinecap="round" />
                  <path d="M14 11v6" strokeLinecap="round" />
                </svg>
              </span>
              Remover foto
            </button>
          ) : null}
        </div>
      </section>
    </>
  )

  return (
    <div className="flex h-full flex-col md:block">
      <MobileAppFrame title="Perfil">
        <div className="space-y-3 [&>header]:hidden [&_.app-panel]:rounded-xl [&_.app-panel]:border [&_.app-panel]:p-3 [&_h3]:text-[15px] [&_h3]:font-semibold [&_label]:text-slate-200 [&_.app-input]:h-11 [&_.app-input]:rounded-xl [&_.app-select]:h-11 [&_.app-select]:rounded-xl">{pageContent}</div>
      </MobileAppFrame>

      <div className="hidden space-y-3 lg:space-y-2.5 md:block">{pageContent}</div>
    </div>
  )
}
