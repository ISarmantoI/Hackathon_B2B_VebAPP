import type { AuthResponse, LoginPayload, MessageResponse } from '@/types'

import { apiRequest } from './http'

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  })
}

export function me() {
  return apiRequest<AuthResponse>('/auth/me')
}

export function refresh() {
  return apiRequest<AuthResponse>('/auth/refresh', {
    method: 'POST',
  })
}

export function logout() {
  return apiRequest<MessageResponse>('/auth/logout', {
    method: 'POST',
  })
}
