import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/app/Sidebar'

const titles: Record<string, string> = {
  '/dashboard': 'Дашборд',
  '/orders': 'Заказы',
  '/clients': 'Клиенты',
  '/services': 'Услуги',
  '/admin/users': 'Пользователи',
}

export function AppLayout() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'B2B Платформа'

  return (
    <div className="flex min-h-svh overflow-x-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur px-6 py-4">
          <h2 className="text-xl font-semibold">{title}</h2>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
