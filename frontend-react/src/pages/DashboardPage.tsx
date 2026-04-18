import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import * as api from '@/api'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { formatMoney, formatDateTime } from '@/lib/format'

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-widest">{label}</CardDescription>
        <CardTitle className="text-3xl font-bold">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role.role_name === 'Admin'

  const { data: orders = [] } = useQuery({ queryKey: ['orders'], queryFn: () => api.listOrders() })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => api.listClients() })
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => api.listServices() })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.listUsers(), enabled: isAdmin })

  const recent = orders.slice(0, 6)
  const pipeline = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.service.price, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Клиенты" value={clients.length} />
        <StatCard label="Услуги" value={services.length} />
        <StatCard label="Заказы" value={orders.length} />
        {isAdmin && <StatCard label="Сотрудники" value={users.length} />}
        {!isAdmin && <StatCard label="Пайплайн" value={formatMoney(pipeline)} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Последние заказы</CardTitle>
                <CardDescription>Активный операционный поток</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
                Все заказы <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {recent.length === 0
                ? <p className="text-sm text-muted-foreground py-4 text-center">Заказов пока нет</p>
                : (
                  <div className="space-y-2">
                    {recent.map(o => (
                      <div key={o.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => navigate('/orders')}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">#{o.id} — {o.client.company_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{o.service.title} · {formatDateTime(o.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-sm font-medium">{formatMoney(o.service.price)}</span>
                          <StatusBadge status={o.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Статусы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(['new', 'in_progress', 'completed', 'cancelled'] as const).map(s => (
                <div key={s} className="flex items-center justify-between">
                  <StatusBadge status={s} />
                  <span className="text-sm font-semibold">{orders.filter(o => o.status === s).length}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Быстрые действия</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Новый заказ', to: '/orders' },
                { label: 'Добавить клиента', to: '/clients' },
                { label: 'Каталог услуг', to: '/services' },
              ].map(({ label, to }) => (
                <Button key={to} variant="outline" className="w-full justify-between" onClick={() => navigate(to)}>
                  {label} <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
