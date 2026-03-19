import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import backgroundLoginImage from '../assets/background-login-image.jpg'
import { api } from '../lib/api'
import { decodeJwtPayload } from '../lib/jwt'
import { useAuthStore } from '../store/auth-store'

const schema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
})

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUserProfile = useAuthStore((state) => state.setUserProfile)

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (payload: FormData) => api.register(payload),
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
      toast.success('Conta criada com sucesso.')
      navigate('/dashboard')
    },
    onError: () => toast.error('Não foi possível criar a conta.'),
  })

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8"
      style={{
        backgroundImage: `url(${backgroundLoginImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[#030717]/78" />
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{
        backgroundImage:
          'radial-gradient(circle at 18% 18%, rgba(56,189,248,0.22) 0%, transparent 35%), radial-gradient(circle at 80% 40%, rgba(99,102,241,0.2) 0%, transparent 38%)',
      }} />
      <div className="pointer-events-none absolute inset-0 opacity-25" style={{
        backgroundImage:
          'linear-gradient(rgba(66,81,139,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(66,81,139,0.2) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-[500px] rounded-[28px] bg-indigo-950/35 px-6 py-9 text-slate-100 shadow-[0_0_10px_rgba(34,211,238,0.14)] backdrop-blur-sm sm:max-w-[530px] sm:px-8 sm:py-10 lg:max-w-[560px] lg:px-10 lg:py-11 lg:shadow-[0_0_20px_rgba(34,211,238,0.2),0_0_24px_rgba(124,58,237,0.12)]"
      >
        <p className="mono text-xs uppercase tracking-[0.2em] text-cyan-300">FinanceHub</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">Criar conta</h1>
        <p className="mt-1 text-sm text-slate-300/80">Conecte bancos e centralize sua vida financeira.</p>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="mt-6 space-y-4">
          <div>
            <label htmlFor="register-name" className="mb-1 block text-sm font-medium text-slate-200">
              Nome
            </label>
            <input id="register-name" {...register('name')} className="app-input" />
            {formState.errors.name ? (
              <p className="mt-1 text-xs text-rose-300">{formState.errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1 block text-sm font-medium text-slate-200">
              E-mail
            </label>
            <input id="register-email" {...register('email')} className="app-input" />
            {formState.errors.email ? (
              <p className="mt-1 text-xs text-rose-300">{formState.errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1 block text-sm font-medium text-slate-200">
              Senha
            </label>
            <input id="register-password" {...register('password')} type="password" className="app-input" />
            {formState.errors.password ? (
              <p className="mt-1 text-xs text-rose-300">{formState.errors.password.message}</p>
            ) : null}
          </div>

          {mutation.isError ? (
            <p className="text-sm text-rose-300">Não foi possível criar a conta. Verifique o e-mail.</p>
          ) : null}

          <button type="submit" disabled={mutation.isPending} className="app-button w-full px-4 py-2.5 disabled:opacity-60">
            {mutation.isPending ? 'Criando...' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-300/85">
          Já possui conta?{' '}
          <Link to="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
