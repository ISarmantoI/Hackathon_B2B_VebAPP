import type { Client, CreateClientPayload, UpdateClientPayload } from '@/types'

import { apiRequest } from './http'

export function listClients(includeDeleted = false) {
  return apiRequest<Client[]>(`/clients?include_deleted=${includeDeleted}`)
}

export function createClient(payload: CreateClientPayload) {
  return apiRequest<Client>('/clients', {
    method: 'POST',
    body: payload,
  })
}

export function updateClient(clientId: number, payload: UpdateClientPayload) {
  return apiRequest<Client>(`/clients/${clientId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function deleteClient(clientId: number) {
  return apiRequest<Client>(`/clients/${clientId}`, {
    method: 'DELETE',
  })
}

export function restoreClient(clientId: number) {
  return apiRequest<Client>(`/clients/${clientId}/restore`, {
    method: 'POST',
  })
}
