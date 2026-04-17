<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ArrowRight, ClipboardList, Plus, UserPlus } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import { listClients } from '@/api/clients'
import { listOrders } from '@/api/orders'
import { listServices } from '@/api/services'
import { listUsers } from '@/api/users'
import StatusBadge from '@/components/app/StatusBadge.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import type { Client, Order, Service, User } from '@/types'

const authStore = useAuthStore()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const clients = ref<Client[]>([])
const services = ref<Service[]>([])
const orders = ref<Order[]>([])
const users = ref<User[]>([])

const stats = computed(() => [
  { label: 'Клиенты', value: clients.value.length, hint: 'в базе' },
  { label: 'Услуги', value: services.value.length, hint: 'в каталоге' },
  { label: 'Заказы', value: orders.value.length, hint: 'в системе' },
  { label: 'Сотрудники', value: users.value.length, hint: 'в команде' },
])

const recentOrders = computed(() => orders.value.slice(0, 5))
const recentClients = computed(() => clients.value.slice(0, 5))
const orderBreakdown = computed(() => [
  { label: 'Новые', value: orders.value.filter((order) => order.status === 'new').length },
  { label: 'В работе', value: orders.value.filter((order) => order.status === 'in_progress').length },
  { label: 'Выполненные', value: orders.value.filter((order) => order.status === 'completed').length },
  { label: 'Отмененные', value: orders.value.filter((order) => order.status === 'cancelled').length },
])
const totalPipelineValue = computed(() =>
  orders.value
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.service.price, 0),
)
const completionRate = computed(() => {
  if (!orders.value.length) return 0
  return Math.round((orders.value.filter((order) => order.status === 'completed').length / orders.value.length) * 100)
})
const activeOrders = computed(() => orders.value.filter((order) => order.status === 'in_progress').length)
const KPI_SETTINGS_KEY = 'dashboard_kpi_targets_v1'
const showKpiSettings = ref(false)
const kpiTargets = reactive({
  pipelineValue: 300000,
  activeOrders: 8,
  completionRate: 80,
})

const pipelineProgress = computed(() =>
  Math.min(
    100,
    kpiTargets.pipelineValue > 0
      ? Math.round((totalPipelineValue.value / kpiTargets.pipelineValue) * 100)
      : 0,
  ),
)

const activeOrdersProgress = computed(() =>
  Math.min(
    100,
    kpiTargets.activeOrders > 0
      ? Math.round((activeOrders.value / kpiTargets.activeOrders) * 100)
      : 0,
  ),
)

function loadKpiTargets() {
  const raw = window.localStorage.getItem(KPI_SETTINGS_KEY)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as Partial<typeof kpiTargets>
    kpiTargets.pipelineValue = Number(parsed.pipelineValue) || kpiTargets.pipelineValue
    kpiTargets.activeOrders = Number(parsed.activeOrders) || kpiTargets.activeOrders
    kpiTargets.completionRate = Number(parsed.completionRate) || kpiTargets.completionRate
  } catch {
    // ignore malformed localStorage values
  }
}

function saveKpiTargets() {
  if (kpiTargets.pipelineValue < 1 || kpiTargets.activeOrders < 1 || kpiTargets.completionRate < 1) {
    error.value = 'Целевые KPI должны быть больше нуля'
    return
  }

  if (kpiTargets.completionRate > 100) {
    error.value = 'Цель по проценту завершения не может быть больше 100%'
    return
  }

  window.localStorage.setItem(KPI_SETTINGS_KEY, JSON.stringify(kpiTargets))
  error.value = ''
  showKpiSettings.value = false
}

onMounted(async () => {
  loading.value = true
  error.value = ''
  loadKpiTargets()

  try {
    const [clientsData, servicesData, ordersData, usersData] = await Promise.all([
      listClients(),
      listServices(),
      listOrders(),
      authStore.isAdmin ? listUsers() : Promise.resolve([]),
    ])
    clients.value = clientsData
    services.value = servicesData
    orders.value = ordersData
    users.value = usersData
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось загрузить дашборд'
  } finally {
    loading.value = false
  }
})

function navigateTo(name: 'orders' | 'clients' | 'services' | 'users') {
  void router.push({ name })
}
</script>

<template>
  <div class="space-y-6">
    <Card class="border-border/80 bg-card shadow-none animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
      <CardHeader class="pb-4">
        <CardTitle>Операционный обзор</CardTitle>
        <CardDescription>
          Единая сводка по клиентам, услугам и текущему состоянию заказов.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_320px]">
        <div v-if="loading" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div v-for="item in 4" :key="item" class="h-36 rounded-2xl border border-border/70 bg-muted/10 animate-pulse" />
        </div>
        <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card
            v-for="stat in stats"
            :key="stat.label"
            class="border-border/70 bg-muted/10 shadow-none animate-in fade-in-0 slide-in-from-bottom-1 duration-500"
          >
            <CardHeader class="pb-2">
              <CardDescription class="text-xs uppercase tracking-[0.16em]">{{ stat.label }}</CardDescription>
              <CardTitle class="text-3xl font-semibold">{{ stat.value }}</CardTitle>
            </CardHeader>
            <CardContent class="pt-0 text-xs text-muted-foreground">
              {{ stat.hint }}
            </CardContent>
          </Card>
        </div>
        <div class="rounded-2xl border border-border/70 bg-muted/10 p-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
          <p class="text-sm font-medium text-foreground">Статусы заказов</p>
          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div
              v-for="item in orderBreakdown"
              :key="item.label"
              class="rounded-xl border border-border/60 bg-muted/10 px-3 py-3"
            >
              <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ item.label }}</p>
              <p class="mt-1 text-2xl font-semibold text-foreground">{{ item.value }}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card v-if="error">
      <CardContent class="pt-6">
        <p class="text-sm text-red-700">{{ error }}</p>
      </CardContent>
    </Card>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card class="min-w-0 border-border/80 bg-card shadow-none animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
        <CardHeader>
          <CardTitle>Последние заказы</CardTitle>
          <CardDescription>Быстрый обзор активного операционного потока</CardDescription>
        </CardHeader>
        <CardContent>
          <p v-if="loading" class="text-sm text-muted-foreground">Загружаем данные...</p>
          <p v-else-if="!recentOrders.length" class="text-sm text-muted-foreground">
            Пока нет заказов. Создайте первый заказ в разделе «Заказы».
          </p>
          <template v-else>
            <!-- Мобильный вид: карточки -->
            <div class="flex flex-col gap-2 sm:hidden">
              <div
                v-for="order in recentOrders"
                :key="order.id"
                class="rounded-xl border border-border/60 bg-muted/10 px-3 py-2 text-sm"
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium">#{{ order.id }} {{ order.client.company_name }}</span>
                  <StatusBadge :status="order.status" />
                </div>
                <div class="mt-1 text-xs text-muted-foreground">{{ order.service.title }} — {{ formatMoney(order.service.price) }}</div>
              </div>
            </div>
            <!-- Десктопный вид: таблица -->
            <div class="hidden sm:block max-w-full overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Услуга</TableHead>
                <TableHead>Стоимость</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="order in recentOrders" :key="order.id">
                <TableCell>#{{ order.id }}</TableCell>
                <TableCell>{{ order.client.company_name }}</TableCell>
                <TableCell>{{ order.service.title }}</TableCell>
                <TableCell>{{ formatMoney(order.service.price) }}</TableCell>
                <TableCell><StatusBadge :status="order.status" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
            </div>
          </template>
        </CardContent>
      </Card>

      <div class="space-y-6">
        <Card class="border-border/80 bg-card shadow-none animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
            <CardDescription>Частые операции для ежедневной работы.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Button class="w-full justify-between rounded-xl" @click="navigateTo('orders')">
              Новый заказ
              <ArrowRight class="h-4 w-4" />
            </Button>
            <Button variant="outline" class="w-full justify-between rounded-xl" @click="navigateTo('clients')">
              Добавить клиента
              <UserPlus class="h-4 w-4" />
            </Button>
            <Button variant="outline" class="w-full justify-between rounded-xl" @click="navigateTo('services')">
              Каталог услуг
              <Plus class="h-4 w-4" />
            </Button>
            <Button
              v-if="authStore.isAdmin"
              variant="outline"
              class="w-full justify-between rounded-xl"
              @click="navigateTo('users')"
            >
              Управление пользователями
              <ClipboardList class="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card class="border-border/80 bg-card shadow-none animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
          <CardHeader class="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Ключевые KPI</CardTitle>
              <CardDescription>Текущая нагрузка, качество выполнения и целевые значения.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="rounded-lg"
              @click="showKpiSettings = !showKpiSettings"
            >
              {{ showKpiSettings ? 'Закрыть' : 'Настроить KPI' }}
            </Button>
          </CardHeader>
          <CardContent class="space-y-4">
            <div
              v-if="showKpiSettings"
              class="grid min-w-0 gap-3 rounded-xl border border-border/70 bg-muted/10 p-3 md:grid-cols-3"
            >
              <div class="min-w-0 space-y-1.5">
                <p class="text-xs text-muted-foreground">Цель по пайплайну (руб.)</p>
                <Input
                  v-model.number="kpiTargets.pipelineValue"
                  type="number"
                  min="1"
                  class="min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div class="min-w-0 space-y-1.5">
                <p class="text-xs text-muted-foreground">Цель по активным заказам</p>
                <Input
                  v-model.number="kpiTargets.activeOrders"
                  type="number"
                  min="1"
                  class="min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div class="min-w-0 space-y-1.5">
                <p class="text-xs text-muted-foreground">Цель по завершению (%)</p>
                <Input
                  v-model.number="kpiTargets.completionRate"
                  type="number"
                  min="1"
                  max="100"
                  class="min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div class="md:col-span-3 flex justify-end">
                <Button size="sm" class="rounded-lg" @click="saveKpiTargets">Сохранить цели</Button>
              </div>
            </div>
            <div class="rounded-xl border border-border/60 bg-muted/10 p-3">
              <div class="flex items-center justify-between">
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Сумма активного пайплайна</p>
                <p class="text-xs text-muted-foreground">Цель: {{ formatMoney(kpiTargets.pipelineValue) }}</p>
              </div>
              <p class="mt-1 text-lg font-semibold text-foreground">{{ formatMoney(totalPipelineValue) }}</p>
              <div class="mt-2 h-2 rounded-full bg-muted">
                <div class="h-2 rounded-full bg-primary transition-all duration-500" :style="{ width: `${pipelineProgress}%` }" />
              </div>
            </div>
            <div class="rounded-xl border border-border/60 bg-muted/10 p-3">
              <div class="flex items-center justify-between">
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Активные заказы</p>
                <p class="text-xs text-muted-foreground">Цель: {{ kpiTargets.activeOrders }}</p>
              </div>
              <p class="mt-1 text-lg font-semibold text-foreground">{{ activeOrders }}</p>
              <div class="mt-2 h-2 rounded-full bg-muted">
                <div class="h-2 rounded-full bg-primary transition-all duration-500" :style="{ width: `${activeOrdersProgress}%` }" />
              </div>
            </div>
            <div class="rounded-xl border border-border/60 bg-muted/10 p-3">
              <div class="flex items-center justify-between">
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Процент завершения</p>
                <p class="text-sm font-semibold text-foreground">{{ completionRate }}% / {{ kpiTargets.completionRate }}%</p>
              </div>
              <div class="mt-2 h-2 rounded-full bg-muted">
                <div
                  class="h-2 rounded-full bg-primary transition-all duration-500"
                  :style="{ width: `${Math.min(100, kpiTargets.completionRate > 0 ? Math.round((completionRate / kpiTargets.completionRate) * 100) : 0)}%` }"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="border-border/80 bg-card shadow-none animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
          <CardHeader>
            <CardTitle>Последние клиенты</CardTitle>
            <CardDescription>Недавно добавленные компании в базе.</CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="loading" class="space-y-2">
              <div v-for="item in 4" :key="item" class="h-10 rounded-xl bg-muted/30 animate-pulse" />
            </div>
            <div v-else-if="!recentClients.length" class="text-sm text-muted-foreground">
              Клиенты пока не добавлены.
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="client in recentClients"
                :key="client.id"
                class="rounded-xl border border-border/60 bg-muted/10 px-3 py-2"
              >
                <p class="text-sm font-medium text-foreground">{{ client.company_name }}</p>
                <p class="text-xs text-muted-foreground">ИНН: {{ client.inn }}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>
