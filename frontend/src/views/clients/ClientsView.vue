<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import { createClient, deleteClient, listClients, restoreClient, updateClient } from '@/api/clients'
import FeedbackAlert from '@/components/app/FeedbackAlert.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { sanitizeDigits, sanitizePhone, validateClientForm, type FieldErrors } from '@/lib/validation'
import type { Client } from '@/types'

const clients = ref<Client[]>([])
const loading = ref(true)
const creating = ref(false)
const modalError = ref('')
const search = ref('')
const isCreateOpen = ref(false)
const isEditOpen = ref(false)
const includeDeleted = ref(false)
const editClientId = ref<number | null>(null)
const editError = ref('')
const editing = ref(false)
const fieldErrors = ref<FieldErrors<'inn' | 'company_name' | 'phone'>>({})
const form = reactive({
  inn: '',
  company_name: '',
  phone: '',
})
const editForm = reactive({
  inn: '',
  company_name: '',
  phone: '',
})

const filteredClients = computed(() =>
  clients.value.filter((client) => {
    const query = search.value.toLowerCase()
    return (
      client.company_name.toLowerCase().includes(query) ||
      client.inn.includes(search.value) ||
      client.phone.includes(search.value)
    )
  }),
)
const stats = computed(() => [
  { label: 'Всего клиентов', value: clients.value.length },
  { label: 'С ИНН 10 цифр', value: clients.value.filter((client) => client.inn.length === 10).length },
  { label: 'С ИНН 12 цифр', value: clients.value.filter((client) => client.inn.length === 12).length },
])

async function loadClients() {
  loading.value = true
  try {
    clients.value = await listClients(includeDeleted.value)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Не удалось загрузить клиентов')
  } finally {
    loading.value = false
  }
}

async function submitClient() {
  modalError.value = ''
  fieldErrors.value = validateClientForm(form)

  if (Object.keys(fieldErrors.value).length > 0) {
    modalError.value = 'Исправьте ошибки в форме перед сохранением'
    return
  }

  creating.value = true
  try {
    await createClient({
      inn: sanitizeDigits(form.inn, 12),
      company_name: form.company_name.trim(),
      phone: form.phone.trim(),
    })
    form.inn = ''
    form.company_name = ''
    form.phone = ''
    toast.success('Клиент успешно создан')
    closeCreateModal()
    await loadClients()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Не удалось создать клиента'
  } finally {
    creating.value = false
  }
}

async function submitClientUpdate() {
  if (!editClientId.value) return
  editError.value = ''
  fieldErrors.value = validateClientForm(editForm)
  if (Object.keys(fieldErrors.value).length > 0) {
    editError.value = 'Исправьте ошибки в форме перед сохранением'
    return
  }
  editing.value = true
  try {
    await updateClient(editClientId.value, {
      inn: sanitizeDigits(editForm.inn, 12),
      company_name: editForm.company_name.trim(),
      phone: editForm.phone.trim(),
    })
    toast.success('Клиент обновлен')
    closeEditModal()
    await loadClients()
  } catch (err) {
    editError.value = err instanceof Error ? err.message : 'Не удалось обновить клиента'
  } finally {
    editing.value = false
  }
}

async function archiveClient(clientId: number) {
  try {
    await deleteClient(clientId)
    toast.success('Клиент архивирован')
    await loadClients()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Не удалось архивировать клиента')
  }
}

async function unarchiveClient(clientId: number) {
  try {
    await restoreClient(clientId)
    toast.success('Клиент восстановлен')
    await loadClients()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Не удалось восстановить клиента')
  }
}

function handleInnInput(value: string | number) {
  form.inn = sanitizeDigits(String(value), 12)
  if (fieldErrors.value.inn) fieldErrors.value.inn = undefined
}

function handlePhoneInput(value: string | number) {
  form.phone = sanitizePhone(String(value))
  if (fieldErrors.value.phone) fieldErrors.value.phone = undefined
}

function handleCompanyInput(value: string | number) {
  form.company_name = String(value)
  if (fieldErrors.value.company_name) fieldErrors.value.company_name = undefined
}

onMounted(loadClients)

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

function openEditModal(client: Client) {
  editClientId.value = client.id
  editForm.inn = client.inn
  editForm.company_name = client.company_name
  editForm.phone = client.phone
  fieldErrors.value = {}
  editError.value = ''
  isEditOpen.value = true
}

function closeEditModal() {
  isEditOpen.value = false
  editClientId.value = null
  fieldErrors.value = {}
  editError.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-3">
      <Card v-for="stat in stats" :key="stat.label" class="border-border/80 bg-card shadow-none">
        <CardHeader class="pb-3">
          <CardDescription class="text-xs uppercase tracking-[0.16em]">{{ stat.label }}</CardDescription>
          <CardTitle class="text-3xl font-semibold">{{ stat.value }}</CardTitle>
        </CardHeader>
      </Card>
    </div>

    <div class="flex items-center justify-end gap-3">
      <Button variant="outline" class="rounded-xl" @click="includeDeleted = !includeDeleted; loadClients()">
        {{ includeDeleted ? 'Скрыть архив' : 'Показать архив' }}
      </Button>
      <Button class="rounded-xl px-5" @click="openCreateModal">
        <Plus class="h-4 w-4" />
        Создать клиента
      </Button>
    </div>

    <Card class="border-border/80 bg-card shadow-none">
      <CardHeader class="flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Реестр клиентов</CardTitle>
          <CardDescription>Поиск и быстрый просмотр карточек клиентов.</CardDescription>
        </div>
        <Input v-model="search" class="md:w-80" placeholder="Поиск по компании, ИНН или телефону" />
      </CardHeader>
      <CardContent class="pt-6">
        <p v-if="loading" class="text-sm text-muted-foreground">Загружаем клиентов...</p>
        <p v-else-if="!filteredClients.length" class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Нет клиентов, подходящих под текущий поиск.
        </p>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Компания</TableHead>
              <TableHead>ИНН</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead class="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="client in filteredClients" :key="client.id">
              <TableCell class="font-medium">{{ client.company_name }}</TableCell>
              <TableCell>{{ client.inn }}</TableCell>
              <TableCell>{{ client.phone }}</TableCell>
              <TableCell>{{ client.is_deleted ? 'В архиве' : 'Активен' }}</TableCell>
              <TableCell class="space-x-2 text-right">
                <Button size="sm" variant="outline" @click="openEditModal(client)">Изменить</Button>
                <Button
                  v-if="!client.is_deleted"
                  size="sm"
                  variant="secondary"
                  @click="archiveClient(client.id)"
                >
                  Архив
                </Button>
                <Button
                  v-else
                  size="sm"
                  @click="unarchiveClient(client.id)"
                >
                  Восстановить
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
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
            <CardTitle>Создать клиента</CardTitle>
            <CardDescription>Добавьте юридическое лицо в реестр, ИНН и телефон проверяются автоматически.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" class="rounded-xl" @click="closeCreateModal">
            <X class="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent class="grid gap-5 pt-6 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">ИНН</label>
            <Input :model-value="form.inn" placeholder="7707083893" maxlength="12" inputmode="numeric" @update:model-value="handleInnInput" />
            <p class="text-xs text-muted-foreground">Только цифры, длина 10 или 12 символов.</p>
            <p v-if="fieldErrors.inn" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.inn }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Телефон</label>
            <Input :model-value="form.phone" placeholder="+7 (999) 123-45-67" inputmode="tel" @update:model-value="handlePhoneInput" />
            <p class="text-xs text-muted-foreground">Форматируется автоматически.</p>
            <p v-if="fieldErrors.phone" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.phone }}</p>
          </div>
          <div class="space-y-2 md:col-span-2">
            <label class="text-sm font-medium text-foreground">Компания</label>
            <Input :model-value="form.company_name" placeholder="ООО Ромашка" @update:model-value="handleCompanyInput" />
            <p v-if="fieldErrors.company_name" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.company_name }}</p>
          </div>
          <div class="md:col-span-2">
            <FeedbackAlert v-if="modalError" type="error" :message="modalError" />
          </div>
        </CardContent>
        <CardFooter class="border-t border-border/70 bg-muted/10 pt-4 flex items-center justify-end gap-3">
          <Button variant="outline" class="rounded-xl" @click="closeCreateModal">Отмена</Button>
          <Button class="rounded-xl px-5" :disabled="creating" @click="submitClient">
            {{ creating ? 'Сохраняем...' : 'Создать клиента' }}
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
            <CardTitle>Изменить клиента</CardTitle>
            <CardDescription>Обновите данные карточки клиента.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" class="rounded-xl" @click="closeEditModal">
            <X class="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent class="grid gap-5 pt-6 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">ИНН</label>
            <Input :model-value="editForm.inn" placeholder="7707083893" maxlength="12" inputmode="numeric" @update:model-value="editForm.inn = sanitizeDigits(String($event), 12)" />
            <p v-if="fieldErrors.inn" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.inn }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Телефон</label>
            <Input :model-value="editForm.phone" placeholder="+7 (999) 123-45-67" inputmode="tel" @update:model-value="editForm.phone = sanitizePhone(String($event))" />
            <p v-if="fieldErrors.phone" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.phone }}</p>
          </div>
          <div class="space-y-2 md:col-span-2">
            <label class="text-sm font-medium text-foreground">Компания</label>
            <Input :model-value="editForm.company_name" placeholder="ООО Ромашка" @update:model-value="editForm.company_name = String($event)" />
            <p v-if="fieldErrors.company_name" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.company_name }}</p>
          </div>
          <div class="md:col-span-2">
            <FeedbackAlert v-if="editError" type="error" :message="editError" />
          </div>
        </CardContent>
        <CardFooter class="border-t border-border/70 bg-muted/10 pt-4 flex items-center justify-end gap-3">
          <Button variant="outline" class="rounded-xl" @click="closeEditModal">Отмена</Button>
          <Button class="rounded-xl px-5" :disabled="editing" @click="submitClientUpdate">
            {{ editing ? 'Сохраняем...' : 'Сохранить' }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
