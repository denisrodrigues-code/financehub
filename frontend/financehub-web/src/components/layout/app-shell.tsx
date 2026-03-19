import type { ChangeEvent, ReactNode } from 'react'
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, NavLink, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { decodeJwtPayload } from '../../lib/jwt'
import { useAuthStore } from '../../store/auth-store'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/accounts', label: 'Contas' },
  { to: '/transactions', label: 'Transações' },
  { to: '/budgets', label: 'Orçamentos' },
  { to: '/reports', label: 'Relatórios' },
  { to: '/profile', label: 'Perfil' },
]

const NAME_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'

export function AppShell({ children }: { children: ReactNode }) {
  const clearTokens = useAuthStore((state) => state.clearTokens)
  const accessToken = useAuthStore((state) => state.accessToken)
  const profilePhoto = useAuthStore((state) => state.profilePhoto)
  const userNameFromStore = useAuthStore((state) => state.userName)
  const setProfilePhoto = useAuthStore((state) => state.setProfilePhoto)
  const location = useLocation()
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const payload = decodeJwtPayload(accessToken)
  const userName = String(userNameFromStore ?? payload[NAME_CLAIM] ?? payload.name ?? 'Usuário FinanceHub')

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

  const removeProfilePhoto = () => {
    setProfilePhoto(null)
    toast.success('Foto de perfil removida.')
  }

  return (
    <div className="relative flex min-h-screen items-start px-4 py-6 sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0 opacity-70 lg:opacity-95" style={{
        backgroundImage:
          'radial-gradient(circle at 14% 10%, rgba(34,211,238,0.28) 0%, transparent 32%), radial-gradient(circle at 80% 42%, rgba(124,58,237,0.28) 0%, transparent 36%), radial-gradient(circle at 52% 100%, rgba(91,95,240,0.2) 0%, transparent 30%)',
      }} />

      <div className="app-panel relative mx-auto flex w-full max-w-7xl gap-6 rounded-3xl p-3 lg:min-h-[calc(100vh-3.5rem)]">
        <aside className="hidden w-56 shrink-0 rounded-2xl border border-cyan-300/20 bg-[#030b19]/90 p-4 text-slate-100 md:block">
          <Link to="/dashboard" className="mb-8 block">
            <p className="mono text-xs uppercase tracking-[0.2em] text-cyan-300">FinanceHub</p>
            <h1 className="mt-2 text-xl font-semibold text-slate-100">Painel Financeiro</h1>
          </Link>

          <div className="mb-6 rounded-xl bg-slate-950/45 p-3 shadow-[0_0_18px_rgba(34,211,238,0.1)]">
            <div className="mb-3 flex justify-center">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="group relative h-16 w-16 overflow-hidden rounded-full border border-cyan-300/35 bg-indigo-900/55"
                title="Alterar foto"
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Foto do perfil" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-xs font-semibold text-cyan-200">
                    FOTO
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-slate-950/65 py-0.5 text-[10px] text-slate-200 opacity-0 transition group-hover:opacity-100">
                  Editar
                </span>
              </button>
            </div>
            <p className="text-center text-sm font-semibold text-slate-100">Bem-vindo, {userName.trim().split(" ")[0]}!</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? 'bg-cyan-300/18 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.16)]'
                        : 'text-slate-300 hover:bg-violet-300/10'
                    }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={clearTokens}
            className="mt-8 w-full rounded-lg border border-indigo-300/25 px-3 py-2 text-sm text-slate-300 hover:border-cyan-300/40"
          >
            Sair
          </button>

          {profilePhoto ? (
            <button
              type="button"
              onClick={removeProfilePhoto}
              className="mt-2 w-full rounded-lg border border-indigo-300/20 px-3 py-2 text-xs text-slate-300/85 hover:border-rose-300/45 hover:text-rose-200"
            >
              Remover foto
            </button>
          ) : null}
        </aside>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full overflow-visible rounded-2xl bg-[#030a18]/80 p-4 backdrop-blur-sm sm:p-6"
        >
          <div className="mb-3 flex items-center justify-between md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg border border-indigo-300/25 bg-indigo-950/30 px-3 py-1.5 text-xs text-slate-200"
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="rounded-lg border border-indigo-300/25 bg-indigo-950/30 px-3 py-1.5 text-xs text-slate-200"
            >
              Foto
            </button>
          </div>

          <div className="mb-5 flex items-center justify-between rounded-xl bg-slate-950/45 px-3 py-2 shadow-[0_0_12px_rgba(6,182,212,0.08)] md:hidden">
            <div>
              <p className="text-sm font-semibold text-slate-100">Bem-vindo, {userName}</p>
            </div>
            <button
              type="button"
              onClick={clearTokens}
              className="rounded-md border border-indigo-300/25 px-2.5 py-1 text-xs text-slate-200"
            >
              Sair
            </button>
          </div>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {isMobileMenuOpen ? (
            <button
              type="button"
              aria-label="Fechar menu"
              className="fixed inset-0 z-30 bg-slate-950/65 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ) : null}

          <aside
            className={`fixed left-3 top-3 z-40 w-64 rounded-2xl border border-indigo-300/20 bg-[#080f2b]/95 p-4 text-slate-100 shadow-[0_0_30px_rgba(59,130,246,0.18)] transition-transform md:hidden ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[120%]'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="mono text-xs uppercase tracking-[0.2em] text-cyan-300">FinanceHub</p>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-md border border-indigo-300/25 px-2 py-1 text-xs"
              >
                Fechar
              </button>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? 'bg-cyan-300/18 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.16)]'
                        : 'text-slate-300 hover:bg-indigo-200/10'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {profilePhoto ? (
              <button
                type="button"
                onClick={removeProfilePhoto}
                className="mt-5 w-full rounded-lg border border-indigo-300/20 px-3 py-2 text-xs text-slate-300/85 hover:border-rose-300/45 hover:text-rose-200"
              >
                Remover foto
              </button>
            ) : null}
          </aside>
          {children}
        </motion.main>
      </div>
    </div>
  )
}
