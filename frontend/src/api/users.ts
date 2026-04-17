import type { CreateUserPayload, UpdateUserPayload, User } from '@/types'

import { apiRequest } from './http'

export function listUsers(includeDeleted = false) {
  return apiRequest<User[]>(`/users?include_deleted=${includeDeleted}`)
}

export function createUser(payload: CreateUserPayload) {
  return apiRequest<User>('/users', {
    method: 'POST',
    body: payload,
  })
}

export function updateUser(userId: number, payload: UpdateUserPayload) {
  return apiRequest<User>(`/users/${userId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function deleteUser(userId: number) {
  return apiRequest<User>(`/users/${userId}`, {
    method: 'DELETE',
  })
}

export function restoreUser(userId: number) {
  return apiRequest<User>(`/users/${userId}/restore`, {
    method: 'POST',
  })
}
