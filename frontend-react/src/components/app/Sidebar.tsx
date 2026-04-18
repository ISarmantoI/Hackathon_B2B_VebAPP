import { NavLink, useNavigate } from 'react-router-dom'
import { Building2, LayoutDashboard, LogOut, Moon, Package, ShoppingCart, Sun, Users } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const roleLabel: Record<string, string> = { Admin: 'Администратор', Manager: 'Менеджер' }

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const { dark, toggle } = useThemeStore()
  const navigate = useNavigate()

  const nav = [
    { to: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { to: '/orders', label: 'Заказы', icon: ShoppingCart },
    { to: '/clients', label: 'Клиенты', icon: Building2 },
    { to: '/services', label: 'Услуги', icon: Package },
    ...(user?.role.role_name === 'Admin' ? [{ to: '/admin/users', label: 'Пользователи', icon: Users }] : []),
  ]

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="sticky top-0 flex h-svh w-60 shrink-0 flex-col border-r border-border bg-card">
      <div className="px-5 py-5 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">B2B Платформа</p>
        <h1 className="mt-1 text-sm font-semibold">Управление заказами</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="truncate text-sm font-medium">{user?.full_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{roleLabel[user?.role.role_name ?? '']}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={toggle}>
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="outline" size="sm" className="flex-1 justify-start h-8" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />Выйти
            </Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
