import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Archive, RotateCcw, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import * as api from '@/api'
import { formatMoney, formatDateTime, statusLabel, eventLabel } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Field } from '@/components/ui/Field'
import { StatusBadge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/auth'
import type { Order, OrderStatus } from '@/types'

const statusOptions = (current: OrderStatus) => {
  const all: OrderStatus[] = ['new', 'in_progress', 'completed', 'cancelled']
  if (current === 'completed' || current === 'cancelled') return [current]
  if (current === 'new') return ['new', 'in_progress', 'cancelled']
  return ['in_progress', 'completed', 'cancelled']
}

export function OrdersPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [clientId, setClientId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [editStatus, setEditStatus] = useState<OrderStatus | ''>('')

  const { data: orders = [], isLoading } = useQuery({ queryKey: ['orders', showArchived], queryFn: () => api.listOrders(showArchived) })
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => api.listClients() })
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => api.listServices() })
  const { data: events = [] } = useQuery({ queryKey: ['events', selectedId], queryFn: () => api.listOrderEvents(selectedId!), enabled: selectedId != null })

  const invalidateOrders = () => qc.invalidateQueries({ queryKey: ['orders'] })
  const invalidateEvents = () => qc.invalidateQueries({ queryKey: ['events', selectedId] })

  const archiveMut = useMutation({ mutationFn: api.deleteOrder, onSuccess: () => { toast.success('Архивирован'); invalidateOrders() }, onError: (e: Error) => toast.error(e.message) })
  const restoreMut = useMutation({ mutationFn: api.restoreOrder, onSuccess: () => { toast.success('Восстановлен'); invalidateOrders() }, onError: (e: Error) => toast.error(e.message) })

  const selected = orders.find(o => o.id === selectedId) ?? null

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    return o.client.company_name.toLowerCase().includes(q) || o.service.title.toLowerCase().includes(q) || o.user.full_name.toLowerCase().includes(q)
  })

  async function submitCreate() {
    const e: Record<string, string> = {}
    if (!clientId) e.client = 'Выберите клиента'
    if (!serviceId) e.service = 'Выберите услугу'
    if (Object.keys(e).length) { setCreateErrors(e); return }
    setSubmitting(true)
    try {
      const o = await api.createOrder({ client_id: Number(clientId), service_id: Number(serviceId) })
      toast.success('Заказ создан'); invalidateOrders(); setCreateOpen(false); setSelectedId(o.id)
      setClientId(''); setServiceId('')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка') }
    finally { setSubmitting(false) }
  }

  async function saveStatus() {
    if (!selected || !editStatus || editStatus === selected.status) return
    try {
      await api.updateOrderStatus(selected.id, editStatus)
      toast.success('Статус обновлён'); invalidateOrders(); invalidateEvents(); setEditStatus('')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка') }
  }

  async function submitNote() {
    if (!selected || note.trim().length < 2) { toast.error('Минимум 2 символа'); return }
    setNoteLoading(true)
    try { await api.createOrderEvent(selected.id, { message: note.trim() }); setNote(''); invalidateEvents(); toast.success('Комментарий добавлен') }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка') }
    finally { setNoteLoading(false) }
  }

  function selectOrder(id: number) { setSelectedId(id); setEditStatus('') }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input className="w-64" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
          <Button variant="outline" size="sm" onClick={() => setShowArchived(v => !v)}>
            {showArchived ? 'Скрыть архив' : 'Архив'}
          </Button>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Новый заказ</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Журнал заказов</CardTitle>
            <CardDescription>{filtered.length} записей</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading
              ? <p className="text-sm text-muted-foreground py-4">Загрузка...</p>
              : filtered.length === 0
                ? <p className="text-sm text-muted-foreground py-8 text-center">Заказов нет</p>
                : (
                  <div className="space-y-1.5">
                    {filtered.map(o => (
                      <div
                        key={o.id}
                        onClick={() => selectOrder(o.id)}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-colors ${selectedId === o.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/40 border border-transparent'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">#{o.id}</span>
                            <span className="text-sm font-medium truncate">{o.client.company_name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{o.service.title} · {o.user.full_name}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-medium">{formatMoney(o.service.price)}</span>
                          <StatusBadge status={o.status} />
                          <div className="flex gap-1">
                            {o.is_deleted
                              ? <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); restoreMut.mutate(o.id) }}><RotateCcw className="h-3.5 w-3.5" /></Button>
                              : <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); archiveMut.mutate(o.id) }}><Archive className="h-3.5 w-3.5" /></Button>}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Заказ #{selected.id}</CardTitle>
                  <CardDescription>{formatDateTime(selected.created_at)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Клиент</p><p className="font-medium mt-0.5">{selected.client.company_name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Услуга</p><p className="font-medium mt-0.5">{selected.service.title}</p></div>
                    <div><p className="text-xs text-muted-foreground">Стоимость</p><p className="font-medium mt-0.5">{formatMoney(selected.service.price)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Менеджер</p><p className="font-medium mt-0.5">{selected.user.full_name}</p></div>
                  </div>
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground mb-1.5">Статус</p>
                    {!selected.is_deleted && selected.status !== 'completed' && selected.status !== 'cancelled' ? (
                      <div className="flex gap-2">
                        <Select
                          className="flex-1"
                          value={editStatus || selected.status}
                          onChange={e => setEditStatus(e.target.value as OrderStatus)}
                          options={statusOptions(selected.status).map(s => ({ value: s, label: statusLabel[s] }))}
                        />
                        <Button size="sm" onClick={saveStatus} disabled={!editStatus || editStatus === selected.status}>Сохранить</Button>
                      </div>
                    ) : <StatusBadge status={selected.status} />}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Комментарий</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={3}
                    placeholder="Добавить комментарий..."
                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                  <Button size="sm" className="w-full" onClick={submitNote} disabled={noteLoading}>
                    {noteLoading ? 'Сохраняем...' : 'Добавить'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">История</CardTitle></CardHeader>
                <CardContent>
                  {events.length === 0
                    ? <p className="text-xs text-muted-foreground">Событий нет</p>
                    : <div className="space-y-3">
                      {events.map(ev => (
                        <div key={ev.id} className="border-l-2 border-border pl-3">
                          <p className="text-xs font-medium">{eventLabel[ev.event_type as keyof typeof eventLabel] ?? ev.event_type}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{ev.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{ev.user.full_name} · {formatDateTime(ev.created_at)}</p>
                        </div>
                      ))}
                    </div>}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">Выберите заказ из списка</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый заказ"
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button><Button onClick={submitCreate} disabled={submitting}>{submitting ? 'Создаём...' : 'Создать'}</Button></>}>
        <div className="space-y-4">
          <Field label="Клиент" error={createErrors.client}>
            <Select value={clientId} onChange={e => { setClientId(e.target.value); setCreateErrors(v => ({ ...v, client: '' })) }}
              placeholder="Выберите клиента"
              options={clients.filter(c => !c.is_deleted).map(c => ({ value: String(c.id), label: c.company_name }))} />
          </Field>
          <Field label="Услуга" error={createErrors.service}>
            <Select value={serviceId} onChange={e => { setServiceId(e.target.value); setCreateErrors(v => ({ ...v, service: '' })) }}
              placeholder="Выберите услугу"
              options={services.filter(s => !s.is_deleted).map(s => ({ value: String(s.id), label: `${s.title} — ${formatMoney(s.price)}` }))} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
