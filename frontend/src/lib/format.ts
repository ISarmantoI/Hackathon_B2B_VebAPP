import type { OrderStatus } from '@/types'

export function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function orderStatusLabel(status: OrderStatus) {
  switch (status) {
    case 'new':
      return 'Новый'
    case 'in_progress':
      return 'В работе'
    case 'completed':
      return 'Выполнен'
    case 'cancelled':
      return 'Отменен'
    default:
      return status
  }
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function orderEventLabel(eventType: string) {
  switch (eventType) {
    case 'created':
      return 'Создание'
    case 'status_changed':
      return 'Смена статуса'
    case 'comment':
      return 'Комментарий'
    default:
      return eventType
  }
}
