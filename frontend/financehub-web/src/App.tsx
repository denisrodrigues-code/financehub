import type { ReactNode } from 'react'
import { Suspense, lazy } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/app-shell'
import { AnimatedPage } from './components/ui/animated-page'
import { PageLoader } from './components/ui/page-loader'
import { useAuthStore } from './store/auth-store'

const LoginPage = lazy(() => import('./pages/login-page').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/register-page').then((module) => ({ default: module.RegisterPage })))
const DashboardPage = lazy(() => import('./pages/dashboard-page').then((module) => ({ default: module.DashboardPage })))
const AccountsPage = lazy(() => import('./pages/accounts-page').then((module) => ({ default: module.AccountsPage })))
const TransactionsPage = lazy(() => import('./pages/transactions-page').then((module) => ({ default: module.TransactionsPage })))
const BudgetsPage = lazy(() => import('./pages/budgets-page').then((module) => ({ default: module.BudgetsPage })))
const ReportsPage = lazy(() => import('./pages/reports-page').then((module) => ({ default: module.ReportsPage })))
const ProfilePage = lazy(() => import('./pages/profile-page').then((module) => ({ default: module.ProfilePage })))

function PrivateLayout() {
  const token = useAuthStore((state) => state.accessToken)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function PublicRoute({ children }: { children: ReactNode }) {
  const token = useAuthStore((state) => state.accessToken)
  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader label="Preparando experiencia..." fullscreen />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        <Route element={<PrivateLayout />}>
          <Route
            path="/dashboard"
            element={
              <AnimatedPage>
                <DashboardPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/accounts"
            element={
              <AnimatedPage>
                <AccountsPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/transactions"
            element={
              <AnimatedPage>
                <TransactionsPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/budgets"
            element={
              <AnimatedPage>
                <BudgetsPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/reports"
            element={
              <AnimatedPage>
                <ReportsPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/profile"
            element={
              <AnimatedPage>
                <ProfilePage />
              </AnimatedPage>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
