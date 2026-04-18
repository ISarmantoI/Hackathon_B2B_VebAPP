export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message); this.name = 'ApiError'
  }
}

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

function extractDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail))
    return detail.map(i => (i && typeof i === 'object' && 'msg' in i) ? String((i as any).msg) : JSON.stringify(i)).join('; ')
  return 'Ошибка запроса'
}

export async function apiRequest<T>(path: string, options: Omit<RequestInit, 'body'> & { body?: unknown } = {}): Promise<T> {
  const headers = new Headers(options.headers)
  let body: BodyInit | undefined
  if (options.body !== undefined) { headers.set('Content-Type', 'application/json'); body = JSON.stringify(options.body) }
  const res = await fetch(`${BASE}${path}`, { ...options, body, headers, credentials: 'include' })
  const raw = await res.text()
  let data: unknown = null
  if (raw) { try { data = JSON.parse(raw) } catch { data = raw } }
  if (!res.ok) {
    const msg = data && typeof data === 'object'
      ? extractDetail((data as any).detail ?? (data as any).message)
      : String(data || 'Ошибка запроса')
    throw new ApiError(msg, res.status)
  }
  return data as T
}
