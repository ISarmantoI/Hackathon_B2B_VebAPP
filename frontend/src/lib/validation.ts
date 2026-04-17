export interface ClientForm {
  inn: string
  company_name: string
  phone: string
}

export interface ServiceForm {
  title: string
  description: string
  price: number
}

export interface UserForm {
  full_name: string
  login: string
  password: string
  role_name: 'Admin' | 'Manager'
}

export interface OrderForm {
  client_id: string
  service_id: string
}

export type FieldErrors<T extends string> = Partial<Record<T, string>>

export function sanitizeDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, '')
  return maxLength ? digits.slice(0, maxLength) : digits
}

export function sanitizePhone(value: string) {
  const digits = sanitizeDigits(value, 11)
  const normalized = digits.startsWith('8') ? `7${digits.slice(1)}` : digits

  if (!normalized) return ''

  const country = normalized[0] === '7' ? '+7' : `+${normalized[0]}`
  const local = normalized[0] === '7' ? normalized.slice(1) : normalized.slice(1)

  if (!local) return country
  if (local.length <= 3) return `${country} (${local}`
  if (local.length <= 6) return `${country} (${local.slice(0, 3)}) ${local.slice(3)}`
  if (local.length <= 8) {
    return `${country} (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
  }
  return `${country} (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6, 8)}-${local.slice(8, 10)}`
}

export function validateClientForm(form: ClientForm): FieldErrors<'inn' | 'company_name' | 'phone'> {
  const errors: FieldErrors<'inn' | 'company_name' | 'phone'> = {}
  const inn = sanitizeDigits(form.inn)
  const phoneDigits = sanitizeDigits(form.phone)

  if (!inn || ![10, 12].includes(inn.length)) {
    errors.inn = 'ИНН должен содержать 10 или 12 цифр'
  }
  if (!form.company_name.trim() || form.company_name.trim().length < 2) {
    errors.company_name = 'Укажите название компании'
  }
  if (![10, 11].includes(phoneDigits.length)) {
    errors.phone = 'Телефон должен содержать 10 или 11 цифр'
  }

  return errors
}

export function validateServiceForm(form: ServiceForm): FieldErrors<'title' | 'description' | 'price'> {
  const errors: FieldErrors<'title' | 'description' | 'price'> = {}
  if (!form.title.trim() || form.title.trim().length < 2) {
    errors.title = 'Введите название услуги'
  }
  if (!form.description.trim() || form.description.trim().length < 5) {
    errors.description = 'Описание должно быть не короче 5 символов'
  }
  if (!Number.isFinite(form.price) || form.price <= 0) {
    errors.price = 'Цена должна быть больше нуля'
  }
  return errors
}

export function validateUserForm(form: UserForm): FieldErrors<'full_name' | 'login' | 'password'> {
  const errors: FieldErrors<'full_name' | 'login' | 'password'> = {}
  if (!form.full_name.trim() || form.full_name.trim().length < 2) {
    errors.full_name = 'Введите ФИО'
  }
  if (!form.login.trim() || form.login.trim().length < 3) {
    errors.login = 'Логин должен быть не короче 3 символов'
  }
  if (!form.password || form.password.length < 6) {
    errors.password = 'Пароль должен быть не короче 6 символов'
  }
  return errors
}

export function validateOrderForm(form: OrderForm): FieldErrors<'client_id' | 'service_id'> {
  const errors: FieldErrors<'client_id' | 'service_id'> = {}
  if (!form.client_id) {
    errors.client_id = 'Выберите клиента'
  }
  if (!form.service_id) {
    errors.service_id = 'Выберите услугу'
  }
  return errors
}
