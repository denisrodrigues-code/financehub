import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import backgroundLoginImage from '../assets/background-login-image.jpg'
import { api } from '../lib/api'
import { decodeJwtPayload } from '../lib/jwt'
import { useAuthStore } from '../store/auth-store'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUserProfile = useAuthStore((state) => state.setUserProfile)
  const [remember, setRemember] = useState(true)

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (payload: FormData) => api.login(payload),
    onSuccess: (response) => {
      setTokens(response.data.accessToken, response.data.refreshToken)
      const payload = decodeJwtPayload(response.data.accessToken)
      const name = String(payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ?? payload.name ?? '')
      const email = String(payload.email ?? '')
      if (name || email) {
        setUserProfile(name || 'Usuário FinanceHub', email)
      } else {
        setUserProfile('Usuário FinanceHub', '')
      }
      toast.success('Login realizado com sucesso.')
      navigate('/dashboard')
    },
    onError: () => toast.error('Não foi possível entrar. Verifique suas credenciais.'),
  })

  return (
    <div
      className="login-page relative min-h-screen overflow-hidden bg-[#05081a] px-4 text-slate-100 sm:px-8"
      style={{
        backgroundImage: `url(${backgroundLoginImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="auth-backdrop pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 50%, transparent 58%, rgba(2,6,23,0.5) 100%)',
        }}
      />
      <div className="auth-orbs pointer-events-none absolute inset-0 opacity-62 lg:opacity-88" />
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-25" />

      <div className="pointer-events-none absolute left-6 right-6 top-1/2 hidden h-[650px] -translate-y-1/2 rounded-[28px] bg-[#060d2a]/55 shadow-[0_0_18px_rgba(34,211,238,0.08)] backdrop-blur-sm lg:block lg:left-28 lg:right-28 lg:shadow-[0_0_34px_rgba(34,211,238,0.18),0_0_56px_rgba(124,58,237,0.14)] xl:left-36 xl:right-36" />

      <motion.section
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
        className="login-hero-panel pointer-events-none absolute left-6 top-1/2 hidden w-full max-w-[500px] -translate-y-1/2 lg:left-28 lg:top-[calc(50%-265px)] lg:block lg:max-w-[560px] lg:translate-y-0 xl:left-36"
      >
        <div className="rounded-[28px] px-6 py-9 sm:max-w-[530px] sm:px-8 sm:py-10 lg:flex lg:h-[650px] lg:max-w-[560px] lg:flex-col lg:justify-between lg:overflow-hidden lg:rounded-r-none lg:px-10 lg:py-9">
          <div className="mx-auto w-full max-w-[420px]">
              <div className="mb-6 flex items-center gap-3">
                <div className="login-brand-badge grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-indigo-500 shadow-[0_0_24px_rgba(56,189,248,0.55)]">
                  <div className="h-5 w-5 rounded bg-white/85" />
                </div>
                <p className="text-5xl font-medium tracking-tight">
                  <span className="text-primary-theme">Finance</span>
                  <span className="text-secondary-theme">Hub</span>
                </p>
              </div>

            <h2 className="text-primary-theme text-[32px] font-medium leading-[1.15] tracking-tight">
              Gerencie suas contas
              <br />
              <span className="whitespace-nowrap">Acompanhe seus gastos</span>
              <br />
              Alcance suas metas
            </h2>

            <p className="text-secondary-theme mt-4 max-w-[390px] text-[15px] leading-[1.45]">
              Plataforma completa para conectar suas contas, monitorar seu fluxo de caixa e otimizar suas finanças.
            </p>
          </div>

          <div className="mt-4 lg:mt-3 lg:translate-x-[42px] lg:-translate-y-[100px]">
              <div className="text-secondary-theme flex items-center gap-4 text-[15px]">
                <span className="flex items-center gap-3">
                  <svg viewBox="0 0 24 24" className="text-accent-theme h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M3 20h18" />
                  <path d="M5 20V9h3v11" />
                  <path d="M10.5 20V9h3v11" />
                  <path d="M16 20V9h3v11" />
                  <path d="M2 9l10-5 10 5" />
                </svg>
                <span className="text-accent-theme">Contas</span>
              </span>
              <span className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="text-accent-theme h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3" y="6" width="18" height="12" rx="2.5" />
                  <path d="M3 10h18" />
                  <path d="M7 14h5" />
                </svg>
                <span>Orçamentos</span>
              </span>
              <span className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="text-accent-theme h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="4" y="4" width="16" height="16" rx="2.5" />
                  <path d="M8 9h8" />
                  <path d="M8 13h8" />
                  <path d="M8 17h5" />
                </svg>
                <span>Relatórios</span>
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="relative mx-auto flex min-h-screen w-full items-center justify-center py-8 lg:justify-end lg:pr-28 xl:pr-36">
        <motion.section
          initial={{ opacity: 0, x: 20, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.38, ease: 'easeOut', delay: 0.12 }}
          className="auth-card login-form-card relative w-full max-w-[500px] rounded-[28px] px-6 py-9 sm:max-w-[530px] sm:px-8 sm:py-10 lg:flex lg:h-[650px] lg:max-w-[560px] lg:items-center lg:rounded-l-none lg:px-10 lg:py-11"
        >
          <div className="mx-auto w-full max-w-[420px]">
            <h1 className="text-primary-theme text-center text-4xl font-semibold tracking-tight">Bem-vindo de volta</h1>
            <p className="text-secondary-theme mt-2 text-center text-xl">Entre na sua conta</p>

            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="mt-8 space-y-3.5">
              <div>
                <label htmlFor="login-email" className="sr-only">
                  Email
                </label>
                <input
                  id="login-email"
                  placeholder="johndoe@example.com"
                  {...register('email')}
                  className="app-input w-full rounded-2xl px-4 py-3 text-base"
                />
                {formState.errors.email ? (
                  <p className="mt-2 text-sm text-rose-300">{formState.errors.email.message}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="login-password" className="sr-only">
                  Senha
                </label>
                <input
                  id="login-password"
                  placeholder="......"
                  {...register('password')}
                  type="password"
                  className="app-input w-full rounded-2xl px-4 py-3 text-base"
                />
                {formState.errors.password ? (
                  <p className="mt-2 text-sm text-rose-300">{formState.errors.password.message}</p>
                ) : null}
              </div>

              <div className="text-secondary-theme flex items-center justify-between pt-1 text-sm">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="h-4 w-4 rounded border border-indigo-200/40 bg-transparent accent-cyan-400"
                  />
                  Lembrar de mim
                </label>
                <button type="button" className="text-secondary-theme hover:text-accent-theme">
                  Esqueceu a senha?
                </button>
              </div>

              {mutation.isError ? <p className="text-base text-rose-300">Credenciais inválidas.</p> : null}

              <button
                type="submit"
                disabled={mutation.isPending}
                className="login-submit-btn w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-indigo-500 to-violet-600 px-5 py-3 text-2xl font-medium text-slate-100 shadow-[0_0_16px_rgba(34,211,238,0.2)] transition duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 lg:shadow-[0_0_30px_rgba(34,211,238,0.35),0_0_36px_rgba(124,58,237,0.22)]"
              >
                {mutation.isPending ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="text-secondary-theme my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-indigo-300/25" />
              <p className="text-sm">OU</p>
              <div className="h-px flex-1 bg-indigo-300/25" />
            </div>

            <p className="text-secondary-theme text-center text-lg">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-accent-theme font-semibold">
                Cadastre-se
              </Link>
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
