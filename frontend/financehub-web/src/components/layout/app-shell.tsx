import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link, NavLink, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { decodeJwtPayload } from '../../lib/jwt'
import { useAuthStore } from '../../store/auth-store'
import { useThemeStore } from '../../store/theme-store'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/accounts', label: 'Contas' },
  { to: '/transactions', label: 'Transações' },
  { to: '/budgets', label: 'Orçamentos' },
  { to: '/reports', label: 'Relatórios' },
  { to: '/profile', label: 'Perfil' },
]

const mobileBottomNavItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'home' },
  { to: '/accounts', label: 'Contas', icon: 'wallet' },
  { to: '/transactions', label: 'Operações', icon: 'transfer' },
  { to: '/profile', label: 'Perfil', icon: 'user' },
]

type BottomNavIconName = (typeof mobileBottomNavItems)[number]['icon']

function BottomNavIcon({ icon }: { icon: BottomNavIconName }) {
  if (icon === 'home') {
    return (
      <svg viewBox="0 0 24 24" className="mx-auto mb-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <title>Dashboard</title>
        <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 9.5V20h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (icon === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" className="mx-auto mb-1 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <title>Contas</title>
        <rect x="3" y="6" width="18" height="12" rx="3" />
        <path d="M15 12h6" strokeLinecap="round" />
        <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (icon === 'transfer') {
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

const NAME_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'

export function AppShell({ children }: { children: ReactNode }) {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const initializeTheme = useThemeStore((state) => state.initializeTheme)
  const accessToken = useAuthStore((state) => state.accessToken)
  const profilePhoto = useAuthStore((state) => state.profilePhoto)
  const userNameFromStore = useAuthStore((state) => state.userName)
  const setProfilePhoto = useAuthStore((state) => state.setProfilePhoto)
  const location = useLocation()
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    initializeTheme()
  }, [initializeTheme])

  const payload = decodeJwtPayload(accessToken)
  const userName = String(userNameFromStore ?? payload[NAME_CLAIM] ?? payload.name ?? 'Usuário FinanceHub')
  const hideShellMobileNav = ['/dashboard', '/accounts', '/transactions', '/budgets', '/reports', '/profile'].includes(location.pathname)

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

  return (
    <div className="relative flex h-[100svh] items-start overflow-hidden p-2 md:min-h-screen md:h-auto md:overflow-visible md:px-8 md:py-8">
      <div className="app-bg-orbs pointer-events-none absolute inset-0 opacity-70 lg:opacity-95" />

      <div className="relative mx-auto flex h-full w-full max-w-none gap-0 p-0 md:max-w-7xl md:gap-6 md:p-3 md:min-h-[calc(100vh-3.5rem)] md:h-auto">
        <aside className="app-sidebar hidden w-56 shrink-0 rounded-2xl border border-violet-300/25 bg-[#140d2a]/90 p-4 pt-5 text-slate-100 md:block">
          <div className="mb-8 flex items-start justify-between gap-2">
            <Link to="/dashboard" className="block">
              <p className="app-sidebar-brand text-accent-theme mono text-xs uppercase tracking-[0.2em]">FinanceHub</p>
              <h1 className="app-sidebar-title mt-2 text-xl font-semibold text-slate-100">Painel Financeiro</h1>
            </Link>

            <button
              type="button"
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              onClick={toggleTheme}
               className="app-theme-toggle text-accent-theme grid h-9 w-9 place-items-center rounded-full border border-violet-300/35 bg-violet-950/55 transition hover:border-violet-200/70"
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

          <div className="app-sidebar-profile mb-6">
            <div className="mb-3 flex justify-center">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="group relative h-16 w-16 overflow-hidden rounded-full border border-violet-300/35 bg-violet-950/55"
                title="Alterar foto"
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Foto do perfil" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-accent-theme grid h-full w-full place-items-center text-xs font-semibold">
                    FOTO
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-slate-950/65 py-0.5 text-[10px] text-slate-200 opacity-0 transition group-hover:opacity-100">
                  Editar
                </span>
              </button>
            </div>
            <p className="app-sidebar-welcome text-center text-sm font-semibold text-slate-100">Bem-vindo, {userName.trim().split(" ")[0]}!</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                      `app-sidebar-link block rounded-lg px-3 py-2 text-sm transition ${
                       isActive
                        ? 'app-sidebar-link-active bg-violet-300/20 text-violet-200 shadow-[0_0_16px_rgba(168,85,247,0.2)]'
                        : 'app-sidebar-link-idle text-slate-300 hover:bg-violet-300/10'
                    }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

        </aside>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="app-main relative h-full w-full overflow-hidden bg-[#030a18]/96 p-0 md:min-h-0 md:h-auto md:rounded-2xl md:bg-[#030a18]/80 md:backdrop-blur-sm md:p-6 md:pb-6"
        >
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />

          <div className="relative h-full pb-0 md:min-h-0 md:h-auto md:pb-0">
            <div className="h-full">{children}</div>

            {!hideShellMobileNav ? (
              <nav className="absolute inset-x-2 bottom-2 z-30 grid grid-cols-4 gap-1 rounded-2xl border border-violet-300/20 bg-[#1a1036]/95 px-2 py-1.5 shadow-[0_10px_36px_rgba(20,10,40,0.55)] backdrop-blur-sm md:hidden">
                {mobileBottomNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `rounded-xl px-2 py-1.5 text-center text-[11px] font-semibold leading-none transition ${
                        isActive
                          ? 'border border-violet-300/65 bg-violet-500/45 text-white shadow-[0_0_12px_rgba(139,92,246,0.38)]'
                          : 'text-slate-300/90'
                      }`
                    }
                  >
                    <BottomNavIcon icon={item.icon} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            ) : null}
          </div>
        </motion.main>
      </div>
    </div>
  )
}
