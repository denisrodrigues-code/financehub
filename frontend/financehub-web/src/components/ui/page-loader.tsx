import { motion } from 'framer-motion'

type PageLoaderProps = {
  label?: string
  compact?: boolean
  fullscreen?: boolean
}

export function PageLoader({ label = 'Carregando dados...', compact = false, fullscreen = false }: PageLoaderProps) {
  const minHeightClass = fullscreen ? 'min-h-screen' : compact ? 'min-h-[44vh]' : 'min-h-[calc(100vh-9rem)]'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative grid w-full place-items-center ${minHeightClass}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <motion.div
        className="pointer-events-none absolute h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl"
        animate={{ opacity: [0.25, 0.5, 0.25], scale: [0.94, 1.04, 0.94] }}
        transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="relative h-16 w-16">
          <motion.div
            className="absolute inset-0 rounded-full border border-cyan-300/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-indigo-300/35"
            animate={{ rotate: -360, scale: [1, 1.06, 1] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
          <motion.span
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300"
            animate={{ opacity: [0.55, 1, 0.55], boxShadow: ['0 0 0 rgba(34,211,238,0.0)', '0 0 16px rgba(34,211,238,0.75)', '0 0 0 rgba(34,211,238,0.0)'] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          />
        </div>

        <motion.p
          className="text-sm text-slate-300/85"
          animate={{ opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        >
          {label}
        </motion.p>

        <motion.div
          className="mono grid h-6 w-6 place-items-center rounded-full border border-cyan-300/45 bg-cyan-300/10 text-[10px] font-semibold text-cyan-200"
          animate={{ opacity: [0.55, 0.95, 0.55], scale: [0.96, 1.04, 0.96], boxShadow: ['0 0 0 rgba(34,211,238,0)', '0 0 14px rgba(34,211,238,0.45)', '0 0 0 rgba(34,211,238,0)'] }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          FH
        </motion.div>
      </div>
    </motion.div>
  )
}
