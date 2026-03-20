import type { ChangeEvent, ReactNode } from 'react'
import { useRef } from 'react'
import toast from 'react-hot-toast'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/auth-store'
import { useThemeStore } from '../../store/theme-store'

function MobileNavIcon({ type }: { type: 'home' | 'wallet' | 'transfer' | 'user' }) {
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
        <title>Operacoes</title>
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

export function MobileAppFrame({ title, children }: { title: string; children: ReactNode }) {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const profilePhoto = useAuthStore((state) => state.profilePhoto)
  const userName = useAuthStore((state) => state.userName)
  const setProfilePhoto = useAuthStore((state) => state.setProfilePhoto)
  const firstName = (userName ?? 'U').trim().charAt(0).toUpperCase()
  const photoInputRef = useRef<HTMLInputElement | null>(null)

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

  const isDarkTheme = theme === 'dark'

  return (
    <section className="mobile-app-frame flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-violet-300/25 bg-[#150d2f]/90 p-4 md:hidden">
      <header className="mb-3">
        <div className="relative mb-3 flex items-center">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="h-14 w-14 overflow-hidden rounded-full border border-violet-300/35 bg-violet-950/55"
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt="Foto do perfil" className="h-full w-full object-cover" />
            ) : (
              <span className="text-accent-theme grid h-full w-full place-items-center text-sm font-semibold">{firstName}</span>
            )}
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          <p className="text-accent-theme absolute left-1/2 -translate-x-1/2 mono text-xs font-semibold tracking-[0.2em]">FINANCEHUB</p>
          <button
            type="button"
            aria-label={isDarkTheme ? 'Ativar tema claro' : 'Ativar tema escuro'}
            onClick={toggleTheme}
            className="text-accent-theme absolute right-0 grid h-9 w-9 place-items-center rounded-full border border-violet-300/35 bg-violet-950/55 transition hover:border-violet-200/70"
          >
            {isDarkTheme ? (
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
        <h2 className="text-[1.45rem] font-bold leading-tight text-slate-100">{title}</h2>
        </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">{children}</div>

      <nav className="mt-3 grid grid-cols-4 gap-1 rounded-2xl border border-violet-300/20 bg-[#1a1036]/95 px-2 py-1.5 shadow-[0_10px_36px_rgba(20,10,40,0.55)]">
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
          <MobileNavIcon type="home" />
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
          <MobileNavIcon type="wallet" />
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
          <MobileNavIcon type="transfer" />
          <span>Operacoes</span>
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
          <MobileNavIcon type="user" />
          <span>Perfil</span>
        </NavLink>
      </nav>
    </section>
  )
}
