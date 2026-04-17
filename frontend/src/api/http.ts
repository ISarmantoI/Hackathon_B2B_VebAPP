export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

function extractDetailMessage(detail: unknown): string {
  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (item && typeof item === 'object') {
          const maybeMessage = Reflect.get(item, 'msg')
          const maybeLocation = Reflect.get(item, 'loc')
          if (typeof maybeMessage === 'string' && Array.isArray(maybeLocation)) {
            const field = maybeLocation[maybeLocation.length - 1]
            return `${String(field)}: ${maybeMessage}`
          }
          if (typeof maybeMessage === 'string') {
            return maybeMessage
          }
        }

        return JSON.stringify(item)
      })
      .join('; ')
  }

  if (detail && typeof detail === 'object') {
    return JSON.stringify(detail)
  }

  return 'Запрос завершился с ошибкой'
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  let body: BodyInit | undefined

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    body,
    headers,
    credentials: 'include',
  })

  const raw = await response.text()
  let data: unknown = null
  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch {
      data = raw
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null
        ? extractDetailMessage(Reflect.get(data, 'detail') ?? Reflect.get(data, 'message'))
        : String(data || 'Запрос завершился с ошибкой')
    throw new ApiError(message, response.status)
  }

  return data as T
}
