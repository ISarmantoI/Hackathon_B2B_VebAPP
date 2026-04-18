import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/app/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { ServicesPage } from '@/pages/ServicesPage'
import { UsersPage } from '@/pages/UsersPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function AuthGuard() {
  const { user, initialized, init } = useAuthStore()
  const location = useLocation()

  useEffect(() => { init() }, [init])

  if (!initialized) return <div className="min-h-svh flex items-center justify-center text-muted-foreground text-sm">Загрузка...</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

function AdminGuard() {
  const { user } = useAuthStore()
  if (user?.role.role_name !== 'Admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route element={<AdminGuard />}>
              <Route path="/admin/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
