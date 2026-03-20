import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('FinanceHub render error', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center px-4">
          <div className="app-panel max-w-lg p-6 text-center">
            <p className="text-accent-theme mono text-xs uppercase tracking-[0.2em]">FinanceHub</p>
            <h1 className="text-primary-theme mt-2 text-2xl font-semibold">Ocorreu um problema inesperado</h1>
            <p className="text-secondary-theme mt-2 text-sm">
              Recarregue a página para continuar. Se o erro persistir, tente novamente em alguns instantes.
            </p>
            <button type="button" onClick={this.handleReload} className="app-button mt-5 px-4 py-2 text-sm">
              Recarregar aplicação
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
