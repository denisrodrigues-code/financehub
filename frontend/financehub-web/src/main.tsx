import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/ui/app-error-boundary'

const queryClient = new QueryClient()
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(8, 15, 42, 0.95)',
              color: '#e6eeff',
              border: '1px solid rgba(129, 140, 248, 0.28)',
            },
          }}
        />
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
