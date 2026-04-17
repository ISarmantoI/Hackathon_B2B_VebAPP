import type {
  CreateOrderEventPayload,
  CreateOrderPayload,
  Order,
  OrderEvent,
  OrderStatus,
  UpdateOrderPayload,
  UpdateOrderStatusPayload,
} from '@/types'

import { apiRequest } from './http'

export function listOrders(includeDeleted = false) {
  return apiRequest<Order[]>(`/orders?include_deleted=${includeDeleted}`)
}

export function createOrder(payload: CreateOrderPayload) {
  return apiRequest<Order>('/orders', {
    method: 'POST',
    body: payload,
  })
}

export function updateOrderStatus(orderId: number, status: OrderStatus) {
  const payload: UpdateOrderStatusPayload = { status }
  return apiRequest<Order>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: payload,
  })
}

export function updateOrder(orderId: number, payload: UpdateOrderPayload) {
  return apiRequest<Order>(`/orders/${orderId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function deleteOrder(orderId: number) {
  return apiRequest<Order>(`/orders/${orderId}`, {
    method: 'DELETE',
  })
}

export function restoreOrder(orderId: number) {
  return apiRequest<Order>(`/orders/${orderId}/restore`, {
    method: 'POST',
  })
}

export function listOrderEvents(orderId: number) {
  return apiRequest<OrderEvent[]>(`/orders/${orderId}/events`)
}

export function createOrderEvent(orderId: number, payload: CreateOrderEventPayload) {
  return apiRequest<OrderEvent>(`/orders/${orderId}/events`, {
    method: 'POST',
    body: payload,
  })
}
