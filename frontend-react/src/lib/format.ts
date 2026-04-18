import type { OrderStatus } from '@/types'

export const formatMoney = (v: number) =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(v)

export const formatDateTime = (v: string) =>
  new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v))

export const statusLabel: Record<string, string> = {
  new: 'Новый', in_progress: 'В работе', completed: 'Выполнен', cancelled: 'Отменён',
}

export const statusColor: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export const eventLabel: Record<string, string> = {
  created: 'Создание', status_changed: 'Смена статуса', comment: 'Комментарий',
}

export function sanitizeDigits(v: string, max?: number) {
  const d = v.replace(/\D/g, '')
  return max ? d.slice(0, max) : d
}

export function sanitizePhone(v: string) {
  const d = sanitizeDigits(v, 11)
  const n = d.startsWith('8') ? `7${d.slice(1)}` : d
  if (!n) return ''
  const c = n[0] === '7' ? '+7' : `+${n[0]}`
  const l = n.slice(1)
  if (!l) return c
  if (l.length <= 3) return `${c} (${l}`
  if (l.length <= 6) return `${c} (${l.slice(0, 3)}) ${l.slice(3)}`
  if (l.length <= 8) return `${c} (${l.slice(0, 3)}) ${l.slice(3, 6)}-${l.slice(6)}`
  return `${c} (${l.slice(0, 3)}) ${l.slice(3, 6)}-${l.slice(6, 8)}-${l.slice(8, 10)}`
}
