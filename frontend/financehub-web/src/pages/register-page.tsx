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
      <div className="auth-backdrop pointer-events-none absolute inset-0" />
      <div className="auth-orbs pointer-events-none absolute inset-0 opacity-60" />
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-25" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="auth-card relative w-full max-w-[500px] rounded-[28px] px-6 py-9 text-slate-100 sm:max-w-[530px] sm:px-8 sm:py-10 lg:max-w-[560px] lg:px-10 lg:py-11"
      >
        <p className="text-accent-theme mono text-xs uppercase tracking-[0.2em]">FinanceHub</p>
        <h1 className="text-primary-theme mt-2 text-2xl font-bold">Criar conta</h1>
        <p className="text-secondary-theme mt-1 text-sm">Conecte bancos e centralize sua vida financeira.</p>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="mt-6 space-y-4">
          <div>
            <label htmlFor="register-name" className="text-secondary-theme mb-1 block text-sm font-medium">
              Nome
            </label>
            <input id="register-name" {...register('name')} className="app-input" />
            {formState.errors.name ? (
              <p className="mt-1 text-xs text-rose-300">{formState.errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="register-email" className="text-secondary-theme mb-1 block text-sm font-medium">
              E-mail
            </label>
            <input id="register-email" {...register('email')} className="app-input" />
            {formState.errors.email ? (
              <p className="mt-1 text-xs text-rose-300">{formState.errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="register-password" className="text-secondary-theme mb-1 block text-sm font-medium">
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

        <p className="text-secondary-theme mt-4 text-sm">
          Já possui conta?{' '}
          <Link to="/login" className="text-accent-theme font-semibold">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
