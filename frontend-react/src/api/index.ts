import { apiRequest } from './http'
import type {
  AuthResponse, Client, CreateClientPayload, CreateOrderEventPayload,
  CreateOrderPayload, CreateServicePayload, CreateUserPayload, Order,
  OrderEvent, OrderStatus, Service, UpdateClientPayload, UpdateOrderPayload,
  UpdateServicePayload, UpdateUserPayload, User,
} from '@/types'

// Auth
export const me = () => apiRequest<AuthResponse>('/auth/me')
export const login = (login: string, password: string) =>
  apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: { login, password } })
export const logout = () => apiRequest<{ message: string }>('/auth/logout', { method: 'POST' })
export const refresh = () => apiRequest<AuthResponse>('/auth/refresh', { method: 'POST' })

// Clients
export const listClients = (includeDeleted = false) =>
  apiRequest<Client[]>(`/clients?include_deleted=${includeDeleted}`)
export const createClient = (p: CreateClientPayload) =>
  apiRequest<Client>('/clients', { method: 'POST', body: p })
export const updateClient = (id: number, p: UpdateClientPayload) =>
  apiRequest<Client>(`/clients/${id}`, { method: 'PATCH', body: p })
export const deleteClient = (id: number) =>
  apiRequest<Client>(`/clients/${id}`, { method: 'DELETE' })
export const restoreClient = (id: number) =>
  apiRequest<Client>(`/clients/${id}/restore`, { method: 'POST' })

// Services
export const listServices = (includeDeleted = false) =>
  apiRequest<Service[]>(`/services?include_deleted=${includeDeleted}`)
export const createService = (p: CreateServicePayload) =>
  apiRequest<Service>('/services', { method: 'POST', body: p })
export const updateService = (id: number, p: UpdateServicePayload) =>
  apiRequest<Service>(`/services/${id}`, { method: 'PATCH', body: p })
export const deleteService = (id: number) =>
  apiRequest<Service>(`/services/${id}`, { method: 'DELETE' })
export const restoreService = (id: number) =>
  apiRequest<Service>(`/services/${id}/restore`, { method: 'POST' })

// Orders
export const listOrders = (includeDeleted = false) =>
  apiRequest<Order[]>(`/orders?include_deleted=${includeDeleted}`)
export const createOrder = (p: CreateOrderPayload) =>
  apiRequest<Order>('/orders', { method: 'POST', body: p })
export const updateOrder = (id: number, p: UpdateOrderPayload) =>
  apiRequest<Order>(`/orders/${id}`, { method: 'PATCH', body: p })
export const updateOrderStatus = (id: number, status: OrderStatus) =>
  apiRequest<Order>(`/orders/${id}/status`, { method: 'PATCH', body: { status } })
export const deleteOrder = (id: number) =>
  apiRequest<Order>(`/orders/${id}`, { method: 'DELETE' })
export const restoreOrder = (id: number) =>
  apiRequest<Order>(`/orders/${id}/restore`, { method: 'POST' })
export const listOrderEvents = (id: number) =>
  apiRequest<OrderEvent[]>(`/orders/${id}/events`)
export const createOrderEvent = (id: number, p: CreateOrderEventPayload) =>
  apiRequest<OrderEvent>(`/orders/${id}/events`, { method: 'POST', body: p })

// Users
export const listUsers = (includeDeleted = false) =>
  apiRequest<User[]>(`/users?include_deleted=${includeDeleted}`)
export const createUser = (p: CreateUserPayload) =>
  apiRequest<User>('/users', { method: 'POST', body: p })
export const updateUser = (id: number, p: UpdateUserPayload) =>
  apiRequest<User>(`/users/${id}`, { method: 'PATCH', body: p })
export const deleteUser = (id: number) =>
  apiRequest<User>(`/users/${id}`, { method: 'DELETE' })
export const restoreUser = (id: number) =>
  apiRequest<User>(`/users/${id}/restore`, { method: 'POST' })
