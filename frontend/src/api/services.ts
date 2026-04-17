import type { CreateServicePayload, Service, UpdateServicePayload } from '@/types'

import { apiRequest } from './http'

export function listServices(includeDeleted = false) {
  return apiRequest<Service[]>(`/services?include_deleted=${includeDeleted}`)
}

export function createService(payload: CreateServicePayload) {
  return apiRequest<Service>('/services', {
    method: 'POST',
    body: payload,
  })
}

export function updateService(serviceId: number, payload: UpdateServicePayload) {
  return apiRequest<Service>(`/services/${serviceId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function deleteService(serviceId: number) {
  return apiRequest<Service>(`/services/${serviceId}`, {
    method: 'DELETE',
  })
}

export function restoreService(serviceId: number) {
  return apiRequest<Service>(`/services/${serviceId}/restore`, {
    method: 'POST',
  })
}
