import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import * as api from '@/api'
import { sanitizeDigits, sanitizePhone } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Field } from '@/components/ui/Field'
import type { Client } from '@/types'

type Form = { inn: string; company_name: string; phone: string }
type Errors = Partial<Record<keyof Form, string>>

function validate(f: Form): Errors {
  const e: Errors = {}
  const inn = sanitizeDigits(f.inn)
  if (![10, 12].includes(inn.length)) e.inn = 'ИНН — 10 или 12 цифр'
  if (f.company_name.trim().length < 2) e.company_name = 'Укажите название'
  if (![10, 11].includes(sanitizeDigits(f.phone).length)) e.phone = 'Телефон — 10 или 11 цифр'
  return e
}

const empty: Form = { inn: '', company_name: '', phone: '' }

export function ClientsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Client | null>(null)
  const [form, setForm] = useState<Form>(empty)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', showArchived],
    queryFn: () => api.listClients(showArchived),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['clients'] })

  const archiveMut = useMutation({ mutationFn: api.deleteClient, onSuccess: () => { toast.success('Архивирован'); invalidate() }, onError: (e: Error) => toast.error(e.message) })
  const restoreMut = useMutation({ mutationFn: api.restoreClient, onSuccess: () => { toast.success('Восстановлен'); invalidate() }, onError: (e: Error) => toast.error(e.message) })

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return c.company_name.toLowerCase().includes(q) || c.inn.includes(q) || c.phone.includes(q)
  })

  function openCreate() { setForm(empty); setErrors({}); setCreateOpen(true) }
  function openEdit(c: Client) { setForm({ inn: c.inn, company_name: c.company_name, phone: c.phone }); setErrors({}); setEditTarget(c) }

  function setField(k: keyof Form, v: string) {
    setForm(f => ({ ...f, [k]: k === 'inn' ? sanitizeDigits(v, 12) : k === 'phone' ? sanitizePhone(v) : v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  async function submit(isEdit: boolean) {
    const e = validate(form)
    if (Object.keys(e).length) { setErrors(e); return }
    setSubmitting(true)
    try {
      const payload = { inn: sanitizeDigits(form.inn, 12), company_name: form.company_name.trim(), phone: form.phone.trim() }
      if (isEdit && editTarget) { await api.updateClient(editTarget.id, payload); toast.success('Обновлён') }
      else { await api.createClient(payload); toast.success('Создан') }
      invalidate(); setCreateOpen(false); setEditTarget(null)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка') }
    finally { setSubmitting(false) }
  }

  const formFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="ИНН" error={errors.inn} hint="10 или 12 цифр">
        <Input value={form.inn} onChange={e => setField('inn', e.target.value)} placeholder="7707083893" inputMode="numeric" />
      </Field>
      <Field label="Телефон" error={errors.phone}>
        <Input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+7 (999) 123-45-67" inputMode="tel" />
      </Field>
      <Field label="Компания" error={errors.company_name} className="sm:col-span-2">
        <Input value={form.company_name} onChange={e => setField('company_name', e.target.value)} placeholder="ООО Ромашка" />
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

      <Card>
        <CardHeader>
          <CardTitle>Клиенты</CardTitle>
          <CardDescription>{filtered.length} записей</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading
            ? <p className="text-sm text-muted-foreground py-4">Загрузка...</p>
            : filtered.length === 0
              ? <p className="text-sm text-muted-foreground py-8 text-center">Ничего не найдено</p>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Компания</th>
                        <th className="pb-3 pr-4 font-medium">ИНН</th>
                        <th className="pb-3 pr-4 font-medium">Телефон</th>
                        <th className="pb-3 pr-4 font-medium">Статус</th>
                        <th className="pb-3 font-medium text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map(c => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 pr-4 font-medium">{c.company_name}</td>
                          <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">{c.inn}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{c.phone}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-xs font-medium ${c.is_deleted ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400'}`}>
                              {c.is_deleted ? 'Архив' : 'Активен'}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                              {c.is_deleted
                                ? <Button variant="ghost" size="icon" onClick={() => restoreMut.mutate(c.id)}><RotateCcw className="h-3.5 w-3.5" /></Button>
                                : <Button variant="ghost" size="icon" onClick={() => archiveMut.mutate(c.id)}><Archive className="h-3.5 w-3.5" /></Button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </CardContent>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый клиент"
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button><Button onClick={() => submit(false)} disabled={submitting}>{submitting ? 'Сохраняем...' : 'Создать'}</Button></>}>
        {formFields}
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Редактировать клиента"
        footer={<><Button variant="outline" onClick={() => setEditTarget(null)}>Отмена</Button><Button onClick={() => submit(true)} disabled={submitting}>{submitting ? 'Сохраняем...' : 'Сохранить'}</Button></>}>
        {formFields}
      </Modal>
    </div>
  )
}
