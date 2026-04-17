<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Edit, X } from 'lucide-vue-next'

import { createService, deleteService, listServices, restoreService, updateService } from '@/api/services'
import FeedbackAlert from '@/components/app/FeedbackAlert.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatMoney } from '@/lib/format'
import { validateServiceForm, type FieldErrors } from '@/lib/validation'
import type { Service } from '@/types'

const services = ref<Service[]>([])
const loading = ref(true)
const creating = ref(false)
const error = ref('')
const success = ref('')
const modalError = ref('')
const search = ref('')
const isCreateOpen = ref(false)
const isEditOpen = ref(false)
const includeDeleted = ref(false)
const editServiceId = ref<number | null>(null)
const editError = ref('')
const editing = ref(false)
const fieldErrors = ref<FieldErrors<'title' | 'description' | 'price'>>({})
const form = reactive({
  title: '',
  description: '',
  price: 0,
})
const editForm = reactive({
  title: '',
  description: '',
  price: 0,
})

const filteredServices = computed(() =>
  services.value.filter((service) => {
    const query = search.value.toLowerCase()
    return (
      service.title.toLowerCase().includes(query) ||
      service.description.toLowerCase().includes(query)
    )
  }),
)
const stats = computed(() => [
  { label: 'Услуг в каталоге', value: services.value.length },
  { label: 'Средний чек', value: services.value.length ? formatMoney(Math.round(services.value.reduce((sum, item) => sum + item.price, 0) / services.value.length)) : formatMoney(0) },
])

async function loadServices() {
  loading.value = true
  error.value = ''
  try {
    services.value = await listServices(includeDeleted.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось загрузить услуги'
  } finally {
    loading.value = false
  }
}

async function submitService() {
  modalError.value = ''
  fieldErrors.value = validateServiceForm(form)

  if (Object.keys(fieldErrors.value).length > 0) {
    modalError.value = 'Проверьте обязательные поля'
    return
  }

  creating.value = true
  try {
    await createService({
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
    })
    form.title = ''
    form.description = ''
    form.price = 0
    success.value = 'Услуга успешно добавлена'
    closeCreateModal()
    await loadServices()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Не удалось добавить услугу'
  } finally {
    creating.value = false
  }
}

async function submitServiceUpdate() {
  if (!editServiceId.value) return
  editError.value = ''
  fieldErrors.value = validateServiceForm(editForm)
  if (Object.keys(fieldErrors.value).length > 0) {
    editError.value = 'Проверьте обязательные поля'
    return
  }
  editing.value = true
  try {
    await updateService(editServiceId.value, {
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      price: Number(editForm.price),
    })
    success.value = 'Услуга обновлена'
    closeEditModal()
    await loadServices()
  } catch (err) {
    editError.value = err instanceof Error ? err.message : 'Не удалось обновить услугу'
  } finally {
    editing.value = false
  }
}

async function archiveService(serviceId: number) {
  error.value = ''
  try {
    await deleteService(serviceId)
    success.value = 'Услуга архивирована'
    await loadServices()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось архивировать услугу'
  }
}

async function unarchiveService(serviceId: number) {
  error.value = ''
  try {
    await restoreService(serviceId)
    success.value = 'Услуга восстановлена'
    await loadServices()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось восстановить услугу'
  }
}

function handleTitleInput(value: string | number) {
  form.title = String(value)
  if (fieldErrors.value.title) fieldErrors.value.title = undefined
}

function handleDescriptionInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  form.description = target.value
  if (fieldErrors.value.description) fieldErrors.value.description = undefined
}

function handlePriceInput(value: string | number) {
  const digits = String(value).replace(/[^\d]/g, '')
  form.price = digits ? Number(digits) : 0
  if (fieldErrors.value.price) fieldErrors.value.price = undefined
}

onMounted(loadServices)

function openCreateModal() {
  fieldErrors.value = {}
  modalError.value = ''
  isCreateOpen.value = true
}

function closeCreateModal() {
  isCreateOpen.value = false
  modalError.value = ''
  fieldErrors.value = {}
}

function openEditModal(service: Service) {
  editServiceId.value = service.id
  editForm.title = service.title
  editForm.description = service.description
  editForm.price = service.price
  fieldErrors.value = {}
  editError.value = ''
  isEditOpen.value = true
}

function closeEditModal() {
  isEditOpen.value = false
  editServiceId.value = null
  fieldErrors.value = {}
  editError.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <FeedbackAlert v-if="error" type="error" :message="error" />
    <FeedbackAlert v-if="success" type="success" :message="success" />

    <div class="grid gap-4 md:grid-cols-2">
      <Card v-for="stat in stats" :key="stat.label" class="border-border/80 bg-card shadow-none">
        <CardHeader class="pb-3">
          <CardDescription class="text-xs uppercase tracking-[0.16em]">{{ stat.label }}</CardDescription>
          <CardTitle class="text-3xl font-semibold">{{ stat.value }}</CardTitle>
        </CardHeader>
      </Card>
    </div>

    <div class="flex items-center justify-end gap-2">
      <Button variant="outline" class="rounded-xl" @click="includeDeleted = !includeDeleted; loadServices()">
        {{ includeDeleted ? 'Скрыть архив' : 'Показать архив' }}
      </Button>
      <Button class="rounded-xl px-5" @click="openCreateModal">Создать услугу</Button>
    </div>

    <Card class="border-border/80 bg-card shadow-none">
      <CardHeader class="flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Каталог услуг</CardTitle>
          <CardDescription>Услуги, доступные менеджерам при оформлении заказов.</CardDescription>
        </div>
        <Input v-model="search" class="md:w-80" placeholder="Поиск по названию или описанию" />
      </CardHeader>
      <CardContent class="pt-6">
        <p v-if="loading" class="text-sm text-muted-foreground">Загружаем услуги...</p>
        <p v-else-if="!filteredServices.length" class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Нет услуг, подходящих под текущий фильтр.
        </p>
        <div v-else class="space-y-3">
          <div
            v-for="service in filteredServices"
            :key="service.id"
            class="rounded-2xl border border-border/70 bg-muted/10 p-4 transition-colors hover:bg-muted/20"
          >
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div class="min-w-0">
                <p class="text-base font-semibold text-foreground">{{ service.title }}</p>
                <p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {{ service.description }}
                </p>
                <p class="mt-2 text-xs text-muted-foreground">
                  {{ service.is_deleted ? 'Статус: в архиве' : 'Статус: активна' }}
                </p>
              </div>
              <div class="shrink-0 rounded-xl border border-border/70 bg-background px-4 py-3 md:min-w-[180px] md:text-right">
                <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">Стоимость</p>
                <p class="mt-1 text-lg font-semibold text-foreground">{{ formatMoney(service.price) }}</p>
                <div class="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="outline" @click="openEditModal(service)">
                    <Edit class="h-4 w-4" />
                    Изменить
                  </Button>
                  <Button
                    v-if="!service.is_deleted"
                    size="sm"
                    variant="secondary"
                    @click="archiveService(service.id)"
                  >
                    Архив
                  </Button>
                  <Button
                    v-else
                    size="sm"
                    @click="unarchiveService(service.id)"
                  >
                    Восстановить
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <div
      v-if="isCreateOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      @click.self="closeCreateModal"
    >
      <Card class="w-full max-w-3xl border-border/80 bg-background shadow-2xl">
        <CardHeader class="flex flex-row items-start justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <CardTitle>Создать услугу</CardTitle>
            <CardDescription>Новая позиция каталога для менеджеров и заказов.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" class="rounded-xl" @click="closeCreateModal">
            <X class="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent class="grid gap-5 pt-6 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Название</label>
            <Input :model-value="form.title" placeholder="Настройка серверов" @update:model-value="handleTitleInput" />
            <p v-if="fieldErrors.title" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.title }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Цена (руб.)</label>
            <Input
              :model-value="String(form.price || '')"
              type="text"
              inputmode="numeric"
              placeholder="25000"
              @update:model-value="handlePriceInput"
            />
            <p class="text-xs text-muted-foreground">1 = 1 рубль.</p>
            <p v-if="fieldErrors.price" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.price }}</p>
          </div>
          <div class="space-y-2 md:col-span-2">
            <label class="text-sm font-medium text-foreground">Описание</label>
            <textarea
              :value="form.description"
              rows="5"
              class="flex min-h-[136px] w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Кратко опишите ценность услуги для клиента"
              @input="handleDescriptionInput"
            />
            <p v-if="fieldErrors.description" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.description }}</p>
          </div>
          <div class="md:col-span-2">
            <FeedbackAlert v-if="modalError" type="error" :message="modalError" />
          </div>
        </CardContent>
        <CardFooter class="border-t border-border/70 bg-muted/10 pt-4 flex items-center justify-end gap-3">
          <Button variant="outline" class="rounded-xl" @click="closeCreateModal">Отмена</Button>
          <Button class="rounded-xl px-5" :disabled="creating" @click="submitService">
            {{ creating ? 'Сохраняем...' : 'Создать услугу' }}
          </Button>
        </CardFooter>
      </Card>
    </div>

    <div
      v-if="isEditOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      @click.self="closeEditModal"
    >
      <Card class="w-full max-w-3xl border-border/80 bg-background shadow-2xl">
        <CardHeader class="flex flex-row items-start justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <CardTitle>Изменить услугу</CardTitle>
            <CardDescription>Обновите данные позиции каталога.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" class="rounded-xl" @click="closeEditModal">
            <X class="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent class="grid gap-5 pt-6 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Название</label>
            <Input :model-value="editForm.title" placeholder="Настройка серверов" @update:model-value="editForm.title = String($event)" />
            <p v-if="fieldErrors.title" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.title }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Цена (руб.)</label>
            <Input
              :model-value="String(editForm.price || '')"
              type="text"
              inputmode="numeric"
              placeholder="25000"
              @update:model-value="editForm.price = Number(String($event).replace(/[^\\d]/g, '') || 0)"
            />
            <p v-if="fieldErrors.price" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.price }}</p>
          </div>
          <div class="space-y-2 md:col-span-2">
            <label class="text-sm font-medium text-foreground">Описание</label>
            <textarea
              :value="editForm.description"
              rows="5"
              class="flex min-h-[136px] w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Кратко опишите ценность услуги для клиента"
              @input="editForm.description = ($event.target as HTMLTextAreaElement).value"
            />
            <p v-if="fieldErrors.description" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.description }}</p>
          </div>
          <div class="md:col-span-2">
            <FeedbackAlert v-if="editError" type="error" :message="editError" />
          </div>
        </CardContent>
        <CardFooter class="border-t border-border/70 bg-muted/10 pt-4 flex items-center justify-end gap-3">
          <Button variant="outline" class="rounded-xl" @click="closeEditModal">Отмена</Button>
          <Button class="rounded-xl px-5" :disabled="editing" @click="submitServiceUpdate">
            {{ editing ? 'Сохраняем...' : 'Сохранить' }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
