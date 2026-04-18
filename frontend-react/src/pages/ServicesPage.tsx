import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import * as api from '@/api'
import { formatMoney } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Field } from '@/components/ui/Field'
import type { Service } from '@/types'

type Form = { title: string; description: string; price: string }
type Errors = Partial<Record<keyof Form, string>>

function validate(f: Form): Errors {
  const e: Errors = {}
  if (f.title.trim().length < 2) e.title = 'Введите название'
  if (f.description.trim().length < 5) e.description = 'Минимум 5 символов'
  if (!Number(f.price) || Number(f.price) <= 0) e.price = 'Цена должна быть больше 0'
  return e
}

const empty: Form = { title: '', description: '', price: '' }

export function ServicesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Service | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', showArchived],
    queryFn: () => api.listServices(showArchived),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['services'] })
  const archiveMut = useMutation({ mutationFn: api.deleteService, onSuccess: () => { toast.success('Архивирована'); invalidate() }, onError: (e: Error) => toast.error(e.message) })
  const restoreMut = useMutation({ mutationFn: api.restoreService, onSuccess: () => { toast.success('Восстановлена'); invalidate() }, onError: (e: Error) => toast.error(e.message) })

  const filtered = services.filter(s => {
    const q = search.toLowerCase()
    return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
  })

  function setField(k: keyof Form, v: string) {
    setForm(f => ({ ...f, [k]: k === 'price' ? v.replace(/\D/g, '') : v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function openCreate() { setForm(empty); setErrors({}); setCreateOpen(true) }
  function openEdit(s: Service) { setForm({ title: s.title, description: s.description, price: String(s.price) }); setErrors({}); setEditTarget(s) }

  async function submit(isEdit: boolean) {
    const e = validate(form)
    if (Object.keys(e).length) { setErrors(e); return }
    setSubmitting(true)
    try {
      const payload = { title: form.title.trim(), description: form.description.trim(), price: Number(form.price) }
      if (isEdit && editTarget) { await api.updateService(editTarget.id, payload); toast.success('Обновлена') }
      else { await api.createService(payload); toast.success('Создана') }
      invalidate(); setCreateOpen(false); setEditTarget(null)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка') }
    finally { setSubmitting(false) }
  }

  const formFields = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Название" error={errors.title}>
          <Input value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Настройка серверов" />
        </Field>
        <Field label="Цена (руб.)" error={errors.price}>
          <Input value={form.price} onChange={e => setField('price', e.target.value)} placeholder="25000" inputMode="numeric" />
        </Field>
      </div>
      <Field label="Описание" error={errors.description}>
        <textarea
          value={form.description}
          onChange={e => setField('description', e.target.value)}
          rows={4}
          placeholder="Краткое описание услуги..."
          className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </Field>
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input className="w-64" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
          <Button variant="outline" size="sm" onClick={() => setShowArchived(v => !v)}>
            {showArchived ? 'Скрыть архив' : 'Архив'}
          </Button>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Создать</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 rounded-2xl border border-border bg-muted/20 animate-pulse" />)
          : filtered.length === 0
            ? <p className="text-sm text-muted-foreground py-8 col-span-3 text-center">Ничего не найдено</p>
            : filtered.map(s => (
              <Card key={s.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-snug">{s.title}</CardTitle>
                    <span className={`text-xs font-medium shrink-0 ${s.is_deleted ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400'}`}>
                      {s.is_deleted ? 'Архив' : 'Активна'}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{formatMoney(s.price)}</p>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{s.description}</p>
                  <div className="flex gap-1 mt-4">
                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" />Изменить</Button>
                    {s.is_deleted
                      ? <Button variant="outline" size="sm" onClick={() => restoreMut.mutate(s.id)}><RotateCcw className="h-3.5 w-3.5" />Восстановить</Button>
                      : <Button variant="outline" size="sm" onClick={() => archiveMut.mutate(s.id)}><Archive className="h-3.5 w-3.5" />Архив</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая услуга"
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button><Button onClick={() => submit(false)} disabled={submitting}>{submitting ? 'Сохраняем...' : 'Создать'}</Button></>}>
        {formFields}
      </Modal>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Редактировать услугу"
        footer={<><Button variant="outline" onClick={() => setEditTarget(null)}>Отмена</Button><Button onClick={() => submit(true)} disabled={submitting}>{submitting ? 'Сохраняем...' : 'Сохранить'}</Button></>}>
        {formFields}
      </Modal>
    </div>
  )
}
