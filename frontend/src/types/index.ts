export type RoleName = "Admin" | "Manager"
export type OrderStatus = "new" | "in_progress" | "completed" | "cancelled"

export interface Role {
  id: number
  role_name: RoleName
}

export interface UserSummary {
  id: number
  full_name: string
  login: string
}

export interface User extends UserSummary {
  is_active: boolean
  is_deleted: boolean
  deleted_at: string | null
  role: Role
}

export interface Client {
  id: number
  inn: string
  company_name: string
  phone: string
  is_deleted: boolean
  deleted_at: string | null
}

export interface Service {
  id: number
  title: string
  description: string
  price: number
  is_deleted: boolean
  deleted_at: string | null
}

export interface Order {
  id: number
  status: OrderStatus
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  client: Client
  service: Service
  user: UserSummary
}

export interface OrderEvent {
  id: number
  event_type: string
  message: string
  created_at: string
  user: UserSummary
}

export interface MessageResponse {
  message: string
}

export interface AuthResponse extends MessageResponse {
  user: User
}

export interface LoginPayload {
  login: string
  password: string
}

export interface CreateClientPayload {
  inn: string
  company_name: string
  phone: string
}

export interface UpdateClientPayload {
  inn?: string
  company_name?: string
  phone?: string
}

export interface CreateServicePayload {
  title: string
  description: string
  price: number
}

export interface UpdateServicePayload {
  title?: string
  description?: string
  price?: number
}

export interface CreateOrderPayload {
  client_id: number
  service_id: number
}

export interface UpdateOrderPayload {
  client_id?: number
  service_id?: number
}

export interface UpdateOrderStatusPayload {
  status: OrderStatus
}

export interface CreateOrderEventPayload {
  message: string
}

export interface CreateUserPayload {
  full_name: string
  login: string
  password: string
  role_name: RoleName
}

export interface UpdateUserPayload {
  full_name?: string
  login?: string
  password?: string
  role_name?: RoleName
  is_active?: boolean
}
