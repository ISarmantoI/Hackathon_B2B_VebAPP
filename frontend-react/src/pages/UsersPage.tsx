import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import * as api from '@/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Field } from '@/components/ui/Field'
import { useAuthStore } from '@/store/auth'
import type { RoleName, User } from '@/types'

type CreateForm = { full_name: string; login: string; password: string; role_name: RoleName }
type EditForm = CreateForm & { is_active: string }
type Errors = Partial<Record<string, string>>

const roleOptions = [{ value: 'Manager', label: 'Менеджер' }, { value: 'Admin', label: 'Администратор' }]
const activeOptions = [{ value: 'true', label: 'Активен' }, { value: 'false', label: 'Отключён' }]
const roleLabel: Record<RoleName, string> = { Admin: 'Администратор', Manager: 'Менеджер' }

function validateCreate(f: CreateForm): Errors {
  const e: Errors = {}
  if (f.full_name.trim().length < 2) e.full_name = 'Введите ФИО'
  if (f.login.trim().length < 3) e.login = 'Минимум 3 символа'
  if (f.password.length < 6) e.password = 'Минимум 6 символов'
  return e
}

export function UsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAuthStore()
  const [showArchived, setShowArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [createForm, setCreateForm] = useState<CreateForm>({ full_name: '', login: '', password: '', role_name: 'Manager' })
  const [editForm, setEditForm] = useState<EditForm>({ full_name: '', login: '', password: '', role_name: 'Manager', is_active: 'true' })
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', showArchived],
    queryFn: () => api.listUsers(showArchived),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })
  const archiveMut = useMutation({ mutationFn: api.deleteUser, onSuccess: () => { toast.success('Архивирован'); invalidate() }, onError: (e: Error) => toast.error(e.message) })
  const restoreMut = useMutation({ mutationFn: api.restoreUser, onSuccess: () => { toast.success('Восстановлен'); invalidate() }, onError: (e: Error) => toast.error(e.message) })

  function openCreate() { setCreateForm({ full_name: '', login: '', password: '', role_name: 'Manager' }); setErrors({}); setCreateOpen(true) }
  function openEdit(u: User) { setEditForm({ full_name: u.full_name, login: u.login, password: '', role_name: u.role.role_name, is_active: u.is_active ? 'true' : 'false' }); setErrors({}); setEditTarget(u) }

  async function submitCreate() {
    const e = validateCreate(createForm)
    if (Object.keys(e).length) { setErrors(e); return }
    setSubmitting(true)
    try { await api.createUser(createForm); toast.success('Создан'); invalidate(); setCreateOpen(false) }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка') }
    finally { setSubmitting(false) }
  }

  async function submitEdit() {
    if (!editTarget) return
    setSubmitting(true)
    try {
      await api.updateUser(editTarget.id, {
        full_name: editForm.full_name.trim(), login: editForm.login.trim(),
        role_name: editForm.role_name, is_active: editForm.is_active === 'true',
        ...(editForm.password ? { password: editForm.password } : {}),
      })
      toast.success('Обновлён'); invalidate(); setEditTarget(null)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Ошибка') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => setShowArchived(v => !v)}>
          {showArchived ? 'Скрыть архив' : 'Архив'}
        </Button>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Создать</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Сотрудники</CardTitle>
          <CardDescription>{users.length} записей</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading
            ? <p className="text-sm text-muted-foreground py-4">Загрузка...</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">ФИО</th>
                      <th className="pb-3 pr-4 font-medium">Логин</th>
                      <th className="pb-3 pr-4 font-medium">Роль</th>
                      <th className="pb-3 pr-4 font-medium">Статус</th>
                      <th className="pb-3 font-medium text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4 font-medium">{u.full_name}</td>
                        <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">{u.login}</td>
                        <td className="py-3 pr-4">{roleLabel[u.role.role_name]}</td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs font-medium ${u.is_active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            {u.is_active ? 'Активен' : 'Отключён'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                            {u.is_deleted
                              ? <Button variant="ghost" size="icon" onClick={() => restoreMut.mutate(u.id)}><RotateCcw className="h-3.5 w-3.5" /></Button>
                              : <Button variant="ghost" size="icon" disabled={u.id === me?.id} onClick={() => archiveMut.mutate(u.id)}><Archive className="h-3.5 w-3.5" /></Button>}
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый пользователь"
        footer={<><Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button><Button onClick={submitCreate} disabled={submitting}>{submitting ? 'Сохраняем...' : 'Создать'}</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ФИО" error={errors.full_name}><Input value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Анна Петрова" /></Field>
          <Field label="Логин" error={errors.login}><Input value={createForm.login} onChange={e => setCreateForm(f => ({ ...f, login: e.target.value }))} placeholder="anna" /></Field>
          <Field label="Пароль" error={errors.password}><Input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••" /></Field>
          <Field label="Роль"><Select value={createForm.role_name} onChange={e => setCreateForm(f => ({ ...f, role_name: e.target.value as RoleName }))} options={roleOptions} /></Field>
        </div>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Редактировать пользователя"
        footer={<><Button variant="outline" onClick={() => setEditTarget(null)}>Отмена</Button><Button onClick={submitEdit} disabled={submitting}>{submitting ? 'Сохраняем...' : 'Сохранить'}</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ФИО"><Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Логин"><Input value={editForm.login} onChange={e => setEditForm(f => ({ ...f, login: e.target.value }))} /></Field>
          <Field label="Новый пароль (опц.)"><Input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="оставьте пустым" /></Field>
          <Field label="Роль"><Select value={editForm.role_name} onChange={e => setEditForm(f => ({ ...f, role_name: e.target.value as RoleName }))} options={roleOptions} /></Field>
          <Field label="Статус" className="sm:col-span-2"><Select value={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.value }))} options={activeOptions} /></Field>
        </div>
      </Modal>
    </div>
  )
}
