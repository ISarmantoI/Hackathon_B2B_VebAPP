<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { onKeyStroke } from '@vueuse/core'
import { toast } from 'vue-sonner'

import { listClients } from '@/api/clients'
import {
  createOrder,
  createOrderEvent,
  deleteOrder,
  listOrderEvents,
  listOrders,
  restoreOrder,
  updateOrder,
  updateOrderStatus,
} from '@/api/orders'
import { listServices } from '@/api/services'
import FeedbackAlert from '@/components/app/FeedbackAlert.vue'
import StatusBadge from '@/components/app/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime, formatMoney, orderEventLabel } from '@/lib/format'
import { validateOrderForm, type FieldErrors } from '@/lib/validation'
import type { Client, Order, OrderEvent, OrderStatus, Service } from '@/types'

const orderStatusLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  completed: 'Выполнен',
  cancelled: 'Отменён',
}

function allowedStatusValues(status: OrderStatus): OrderStatus[] {
  if (status === 'completed' || status === 'cancelled') {
    return [status]
  }
  if (status === 'new') {
    return ['new', 'in_progress', 'cancelled']
  }
  return ['in_progress', 'completed', 'cancelled']
}

const clients = ref<Client[]>([])
const services = ref<Service[]>([])
const orders = ref<Order[]>([])
const orderEvents = ref<OrderEvent[]>([])
const loading = ref(true)
const timelineLoading = ref(false)
const noteLoading = ref(false)
const actionOrderId = ref<number | null>(null)
const isOrderCardEditing = ref(false)
const orderEditSaving = ref(false)
const editForm = reactive({
  client_id: '',
  service_id: '',
  status: 'new' as OrderStatus,
})
const error = ref('')
const success = ref('')
const search = ref('')
const includeDeleted = ref(false)
const selectedOrderId = ref<number | null>(null)
const noteMessage = ref('')
const fieldErrors = ref<FieldErrors<'client_id' | 'service_id'>>({})

const form = reactive({
  client_id: '',
  service_id: '',
})

const filteredOrders = computed(() =>
  orders.value.filter((order) => {
    const query = search.value.toLowerCase()
    return (
      order.client.company_name.toLowerCase().includes(query) ||
      order.service.title.toLowerCase().includes(query) ||
      order.user.full_name.toLowerCase().includes(query)
    )
  }),
)

const selectedOrder = computed(() => orders.value.find((order) => order.id === selectedOrderId.value) ?? null)

const editStatusOptions = computed(() => allowedStatusValues(editForm.status))

const canEditOrderStatus = computed(() => {
  const o = selectedOrder.value
  return Boolean(o && !o.is_deleted && o.status !== 'completed' && o.status !== 'cancelled')
})

watch(selectedOrderId, () => {
  isOrderCardEditing.value = false
})

const orderStats = computed(() => [
  { label: 'Всего заказов', value: orders.value.length },
  { label: 'Новые', value: orders.value.filter((order) => order.status === 'new').length },
  { label: 'В работе', value: orders.value.filter((order) => order.status === 'in_progress').length },
  { label: 'Завершенные', value: orders.value.filter((order) => order.status === 'completed').length },
])

async function loadOrderTimeline(orderId: number) {
  timelineLoading.value = true

  try {
    orderEvents.value = await listOrderEvents(orderId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось загрузить историю заказа'
    orderEvents.value = []
  } finally {
    timelineLoading.value = false
  }
}

async function loadPageData() {
  loading.value = true
  error.value = ''

  try {
    const [clientsData, servicesData, ordersData] = await Promise.all([
      listClients(),
      listServices(),
      listOrders(includeDeleted.value),
    ])

    clients.value = clientsData
    services.value = servicesData
    orders.value = ordersData

    if (ordersData.length === 0) {
      selectedOrderId.value = null
      orderEvents.value = []
      return
    }

    const activeOrderExists = selectedOrderId.value != null && ordersData.some((order) => order.id === selectedOrderId.value)
    selectedOrderId.value = activeOrderExists ? selectedOrderId.value : ordersData[0].id

    if (selectedOrderId.value != null) {
      await loadOrderTimeline(selectedOrderId.value)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось загрузить заказы'
  } finally {
    loading.value = false
  }
}

async function submitOrder() {
  error.value = ''
  success.value = ''
  fieldErrors.value = validateOrderForm(form)

  if (Object.keys(fieldErrors.value).length > 0) {
    error.value = 'Выберите клиента и услугу'
    return
  }

  try {
    const createdOrder = await createOrder({
      client_id: Number(form.client_id),
      service_id: Number(form.service_id),
    })
    form.client_id = ''
    form.service_id = ''
    success.value = 'Заказ успешно создан'
    selectedOrderId.value = createdOrder.id
    await loadPageData()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось создать заказ'
  }
}

async function archiveOrder(orderId: number) {
  if (actionOrderId.value === orderId) return
  actionOrderId.value = orderId
  error.value = ''
  success.value = ''
  try {
    await deleteOrder(orderId)
    toast.success('Заказ отправлен в архив')
    await loadPageData()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось архивировать заказ'
    error.value = message
    toast.error(message, { id: `order-archive-${orderId}` })
  } finally {
    actionOrderId.value = null
  }
}

async function unarchiveOrder(orderId: number) {
  if (actionOrderId.value === orderId) return
  actionOrderId.value = orderId
  error.value = ''
  success.value = ''
  try {
    await restoreOrder(orderId)
    toast.success('Заказ восстановлен')
    await loadPageData()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось восстановить заказ'
    error.value = message
    toast.error(message, { id: `order-restore-${orderId}` })
  } finally {
    actionOrderId.value = null
  }
}

async function submitNote() {
  if (!selectedOrder.value) {
    return
  }

  const message = noteMessage.value.trim()
  if (message.length < 2) {
    error.value = 'Комментарий должен содержать минимум 2 символа'
    return
  }

  error.value = ''
  success.value = ''
  noteLoading.value = true

  try {
    await createOrderEvent(selectedOrder.value.id, { message })
    noteMessage.value = ''
    success.value = 'Комментарий сохранен'
    await loadOrderTimeline(selectedOrder.value.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось сохранить комментарий'
  } finally {
    noteLoading.value = false
  }
}

function selectOrder(orderId: number) {
  if (selectedOrderId.value === orderId) {
    return
  }

  selectedOrderId.value = orderId
  noteMessage.value = ''
  void loadOrderTimeline(orderId)
}

function startOrderCardEdit() {
  const order = selectedOrder.value
  if (!order) {
    return
  }
  editForm.client_id = order.client.id.toString()
  editForm.service_id = order.service.id.toString()
  editForm.status = order.status
  isOrderCardEditing.value = true
}

function cancelOrderCardEdit() {
  isOrderCardEditing.value = false
}

onKeyStroke('Escape', () => {
  if (isOrderCardEditing.value) {
    cancelOrderCardEdit()
  }
})

async function saveOrderCardEdit() {
  const order = selectedOrder.value
  if (!order || orderEditSaving.value || order.is_deleted) {
    return
  }

  const clientIdNum = Number(editForm.client_id)
  const serviceIdNum = Number(editForm.service_id)
  if (!clientIdNum || !serviceIdNum) {
    toast.error('Выберите клиента и услугу')
    return
  }

  orderEditSaving.value = true
  error.value = ''
  success.value = ''

  try {
    let changed = false
    if (clientIdNum !== order.client.id || serviceIdNum !== order.service.id) {
      await updateOrder(order.id, { client_id: clientIdNum, service_id: serviceIdNum })
      changed = true
    }
    if (canEditOrderStatus.value && editForm.status !== order.status) {
      await updateOrderStatus(order.id, editForm.status)
      changed = true
    }
    if (!changed) {
      toast.info('Изменений нет')
      cancelOrderCardEdit()
      return
    }
    toast.success('Заказ обновлён')
    await loadPageData()
    cancelOrderCardEdit()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось сохранить заказ'
    error.value = message
    toast.error(message, { id: `order-save-${order.id}` })
  } finally {
    orderEditSaving.value = false
  }
}

async function archiveFromCard() {
  const id = selectedOrder.value?.id
  if (id == null) {
    return
  }
  await archiveOrder(id)
  if (!error.value) {
    cancelOrderCardEdit()
  }
}

async function restoreFromCard() {
  const id = selectedOrder.value?.id
  if (id == null) {
    return
  }
  await unarchiveOrder(id)
  if (!error.value) {
    cancelOrderCardEdit()
  }
}

function setEditClientId(value: unknown) {
  editForm.client_id = value == null ? '' : String(value)
}

function setEditServiceId(value: unknown) {
  editForm.service_id = value == null ? '' : String(value)
}

function setEditStatus(value: unknown) {
  if (value == null || typeof value !== 'string') {
    return
  }
  editForm.status = value as OrderStatus
}

function setClientId(value: unknown) {
  form.client_id = value == null ? '' : String(value)
  if (fieldErrors.value.client_id) fieldErrors.value.client_id = undefined
}

function setServiceId(value: unknown) {
  form.service_id = value == null ? '' : String(value)
  if (fieldErrors.value.service_id) fieldErrors.value.service_id = undefined
}

onMounted(loadPageData)
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card v-for="item in orderStats" :key="item.label" class="border-border/80 bg-card shadow-none">
        <CardHeader class="pb-2">
          <CardDescription class="text-xs uppercase tracking-[0.16em]">{{ item.label }}</CardDescription>
          <CardTitle class="text-3xl font-semibold">{{ item.value }}</CardTitle>
        </CardHeader>
      </Card>
    </div>

    <div class="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card class="min-w-0 border-border/80 bg-card shadow-none">
          <CardDescription>
            Менеджер выбирает клиента и услугу, после чего заказ автоматически создается в статусе «Новый».
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Клиент</label>
            <Select :model-value="form.client_id" @update:model-value="setClientId">
              <SelectTrigger>
                <SelectValue placeholder="Выберите клиента" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem v-for="client in clients" :key="client.id" :value="client.id.toString()">
                    {{ client.company_name }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p v-if="fieldErrors.client_id" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.client_id }}</p>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Услуга</label>
            <Select :model-value="form.service_id" @update:model-value="setServiceId">
              <SelectTrigger>
                <SelectValue placeholder="Выберите услугу" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="service in services"
                    :key="service.id"
                    :value="service.id.toString()"
                  >
                    {{ service.title }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p v-if="fieldErrors.service_id" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.service_id }}</p>
          </div>

          <FeedbackAlert v-if="error" type="error" :message="error" />
          <FeedbackAlert v-if="success" type="success" :message="success" />
        </CardContent>
        <CardFooter class="border-t border-border/70 bg-muted/10 pt-4">
          <Button class="w-full rounded-xl" @click="submitOrder">Создать заказ</Button>
        </CardFooter>
      </Card>

      <div class="space-y-6">
        <Card class="border-border/80 bg-card shadow-none">
          <CardHeader class="flex flex-col gap-4 border-b border-border/70 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Журнал заказов</CardTitle>
              <CardDescription>
                Выберите заказ в таблице — ниже откроется карточка с историей; правки — по кнопке «Редактировать».
              </CardDescription>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <Button variant="outline" class="rounded-xl" @click="includeDeleted = !includeDeleted; loadPageData()">
                {{ includeDeleted ? 'Скрыть архив' : 'Показать архив' }}
              </Button>
              <Input v-model="search" class="md:w-80" placeholder="Поиск по клиенту, услуге или менеджеру" />
            </div>
          </CardHeader>
          <CardContent class="pt-6">
            <p v-if="loading" class="text-sm text-muted-foreground">Загружаем заказы...</p>
            <div v-else-if="!filteredOrders.length" class="rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
              Заказы не найдены. Попробуйте изменить поисковый запрос или создайте новый заказ.
            </div>
            <Table v-else>
              <TableHeader>
                <TableRow>
                  <TableHead>№</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Услуга</TableHead>
                  <TableHead>Ответственный</TableHead>
                  <TableHead>Стоимость</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Архив</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="order in filteredOrders"
                  :key="order.id"
                  class="cursor-pointer transition-colors hover:bg-muted/40"
                  :class="{ 'bg-muted/40': selectedOrderId === order.id }"
                  @click="selectOrder(order.id)"
                >
                  <TableCell>#{{ order.id }}</TableCell>
                  <TableCell>{{ order.client.company_name }}</TableCell>
                  <TableCell>{{ order.service.title }}</TableCell>
                  <TableCell>{{ order.user.full_name }}</TableCell>
                  <TableCell>{{ formatMoney(order.service.price) }}</TableCell>
                  <TableCell><StatusBadge :status="order.status" /></TableCell>
                  <TableCell>{{ order.is_deleted ? 'В архиве' : 'Активен' }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card class="border-border/80 bg-card shadow-none">
          <CardHeader class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Карточка заказа</CardTitle>
              <CardDescription>
                Просмотр и история; клиент, услуга, статус и архив — в режиме редактирования.
              </CardDescription>
            </div>
            <div v-if="selectedOrder" class="flex shrink-0 flex-wrap gap-2">
              <Button
                v-if="!isOrderCardEditing"
                variant="outline"
                class="rounded-xl"
                @click="startOrderCardEdit"
              >
                Редактировать
              </Button>
              <Button v-else variant="outline" class="rounded-xl" @click="cancelOrderCardEdit">
                Отменить
              </Button>
            </div>
          </CardHeader>
          <CardContent v-if="selectedOrder" class="space-y-6">
            <div
              v-if="isOrderCardEditing"
              class="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4"
            >
              <p class="text-xs text-muted-foreground">Ответственный: {{ selectedOrder.user.full_name }}</p>

              <p
                v-if="selectedOrder.is_deleted"
                class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground"
              >
                Заказ в архиве: сначала восстановите, чтобы менять клиента, услугу и статус.
              </p>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Клиент</label>
                <Select
                  :model-value="editForm.client_id"
                  :disabled="selectedOrder.is_deleted"
                  @update:model-value="setEditClientId"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Клиент" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem v-for="c in clients" :key="c.id" :value="c.id.toString()">
                        {{ c.company_name }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-foreground">Услуга</label>
                <Select
                  :model-value="editForm.service_id"
                  :disabled="selectedOrder.is_deleted"
                  @update:model-value="setEditServiceId"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Услуга" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem v-for="s in services" :key="s.id" :value="s.id.toString()">
                        {{ s.title }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div v-if="canEditOrderStatus" class="space-y-2">
                <label class="text-sm font-medium text-foreground">Статус</label>
                <Select
                  :model-value="editForm.status"
                  :disabled="selectedOrder.is_deleted"
                  @update:model-value="setEditStatus"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem v-for="st in editStatusOptions" :key="st" :value="st">
                        {{ orderStatusLabels[st] }}
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div v-else-if="!selectedOrder.is_deleted" class="space-y-2">
                <label class="text-sm font-medium text-foreground">Статус</label>
                <div class="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <StatusBadge :status="selectedOrder.status" />
                    <p class="text-sm text-muted-foreground">
                      Для завершённых и отменённых заказов статус не меняется (так задан процесс). Доступны правки клиента
                      и услуги.
                    </p>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap justify-end gap-2 pt-1">
                <Button
                  v-if="!selectedOrder.is_deleted"
                  variant="secondary"
                  class="rounded-xl"
                  :disabled="actionOrderId === selectedOrder.id || orderEditSaving"
                  @click="archiveFromCard"
                >
                  В архив
                </Button>
                <Button
                  v-else
                  variant="secondary"
                  class="rounded-xl"
                  :disabled="actionOrderId === selectedOrder.id || orderEditSaving"
                  @click="restoreFromCard"
                >
                  Восстановить
                </Button>
                <Button
                  class="rounded-xl"
                  :disabled="selectedOrder.is_deleted || orderEditSaving || actionOrderId === selectedOrder.id"
                  @click="saveOrderCardEdit"
                >
                  {{ orderEditSaving ? 'Сохранение...' : 'Сохранить' }}
                </Button>
              </div>
            </div>

            <div v-else class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-2xl border border-border/60 bg-muted/10 p-4">
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Клиент</p>
                <p class="mt-2 text-sm font-medium text-foreground">{{ selectedOrder.client.company_name }}</p>
              </div>
              <div class="rounded-2xl border border-border/60 bg-muted/10 p-4">
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Услуга</p>
                <p class="mt-2 text-sm font-medium text-foreground">{{ selectedOrder.service.title }}</p>
              </div>
              <div class="rounded-2xl border border-border/60 bg-muted/10 p-4">
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Создан</p>
                <p class="mt-2 text-sm font-medium text-foreground">{{ formatDateTime(selectedOrder.created_at) }}</p>
              </div>
              <div class="rounded-2xl border border-border/60 bg-muted/10 p-4">
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Статус</p>
                <div class="mt-2">
                  <StatusBadge :status="selectedOrder.status" />
                </div>
              </div>
            </div>

            <div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-foreground">История действий</h3>
                  <span class="text-xs text-muted-foreground">№ заказа: #{{ selectedOrder.id }}</span>
                </div>
                <p v-if="timelineLoading" class="text-sm text-muted-foreground">Загружаем историю...</p>
                <div v-else-if="!orderEvents.length" class="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                  Для этого заказа пока нет событий.
                </div>
                <div v-else class="space-y-3">
                  <div
                    v-for="event in orderEvents"
                    :key="event.id"
                    class="rounded-xl border border-border/60 bg-muted/10 p-4"
                  >
                    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p class="text-sm font-medium text-foreground">{{ orderEventLabel(event.event_type) }}</p>
                        <p class="mt-1 text-sm text-muted-foreground">{{ event.message }}</p>
                      </div>
                      <div class="text-xs text-muted-foreground sm:text-right">
                        <p>{{ event.user.full_name }}</p>
                        <p>{{ formatDateTime(event.created_at) }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-4">
                <div>
                  <h3 class="text-sm font-semibold text-foreground">Комментарий менеджера</h3>
                  <p class="mt-1 text-sm text-muted-foreground">
                    Удобно для передачи контекста и объяснения действий в ходе обработки заказа.
                  </p>
                </div>
                <textarea
                  v-model="noteMessage"
                  rows="6"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Например: клиент подтвердил бюджет, ожидаем договор до пятницы."
                />
                <Button class="w-full" :disabled="noteLoading" @click="submitNote">
                  {{ noteLoading ? 'Сохраняем...' : 'Добавить комментарий' }}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardContent v-else>
            <div class="rounded-lg border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
              Выберите заказ в таблице выше, чтобы открыть карточку и историю действий.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
