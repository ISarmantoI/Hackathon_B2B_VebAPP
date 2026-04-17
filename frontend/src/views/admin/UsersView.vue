<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

import { createUser, deleteUser, listUsers, restoreUser, updateUser } from '@/api/users'
import FeedbackAlert from '@/components/app/FeedbackAlert.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { validateUserForm, type FieldErrors } from '@/lib/validation'
import { useAuthStore } from '@/stores/auth'
import type { RoleName, User } from '@/types'

const authStore = useAuthStore()
const users = ref<User[]>([])
const loading = ref(true)
const isRefreshing = ref(false)
const creating = ref(false)
const modalError = ref('')
const isCreateOpen = ref(false)
const isEditOpen = ref(false)
const includeDeleted = ref(false)
const editUserId = ref<number | null>(null)
const editError = ref('')
const editing = ref(false)
const fieldErrors = ref<FieldErrors<'full_name' | 'login' | 'password'>>({})
const form = reactive({
  full_name: '',
  login: '',
  password: '',
  role_name: 'Manager' as RoleName,
})
const editForm = reactive({
  full_name: '',
  login: '',
  password: '',
  role_name: 'Manager' as RoleName,
  is_active: 'true',
})
const roleLabelMap: Record<RoleName, string> = {
  Admin: 'Администратор',
  Manager: 'Менеджер',
}
const stats = computed(() => [
  { label: 'Всего сотрудников', value: users.value.length },
  { label: 'Администраторы', value: users.value.filter((user) => user.role.role_name === 'Admin').length },
  { label: 'Менеджеры', value: users.value.filter((user) => user.role.role_name === 'Manager').length },
])

async function loadUsers() {
  if (users.value.length > 0) {
    isRefreshing.value = true
  } else {
    loading.value = true
  }
  try {
    users.value = await listUsers(includeDeleted.value)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Не удалось загрузить пользователей')
  } finally {
    loading.value = false
    isRefreshing.value = false
  }
}

async function submitUser() {
  modalError.value = ''
  fieldErrors.value = validateUserForm(form)

  if (Object.keys(fieldErrors.value).length > 0) {
    modalError.value = 'Исправьте ошибки в форме'
    return
  }

  creating.value = true
  try {
    await createUser({
      ...form,
      full_name: form.full_name.trim(),
      login: form.login.trim(),
    })
    form.full_name = ''
    form.login = ''
    form.password = ''
    form.role_name = 'Manager'
    toast.success('Пользователь успешно создан')
    closeCreateModal()
    await loadUsers()
  } catch (err) {
    modalError.value = err instanceof Error ? err.message : 'Не удалось создать пользователя'
  } finally {
    creating.value = false
  }
}

async function submitUserUpdate() {
  if (!editUserId.value) return
  editError.value = ''
  fieldErrors.value = validateUserForm({
    full_name: editForm.full_name,
    login: editForm.login,
    password: editForm.password || '******',
    role_name: editForm.role_name,
  })
  if (Object.keys(fieldErrors.value).length > 0) {
    editError.value = 'Исправьте ошибки в форме'
    return
  }
  editing.value = true
  try {
    await updateUser(editUserId.value, {
      full_name: editForm.full_name.trim(),
      login: editForm.login.trim(),
      role_name: editForm.role_name,
      is_active: editForm.is_active === 'true',
      ...(editForm.password ? { password: editForm.password } : {}),
    })
    toast.success('Пользователь обновлен')
    closeEditModal()
    await loadUsers()
  } catch (err) {
    editError.value = err instanceof Error ? err.message : 'Не удалось обновить пользователя'
  } finally {
    editing.value = false
  }
}

async function archiveUser(userId: number) {
  if (authStore.user?.id === userId) {
    toast.error('Нельзя архивировать текущего пользователя', { id: 'archive-current-user' })
    return
  }
  try {
    await deleteUser(userId)
    toast.success('Пользователь архивирован')
    await loadUsers()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Не удалось архивировать пользователя')
  }
}

async function unarchiveUser(userId: number) {
  try {
    await restoreUser(userId)
    toast.success('Пользователь восстановлен')
    await loadUsers()
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Не удалось восстановить пользователя')
  }
}

async function toggleIncludeDeleted() {
  includeDeleted.value = !includeDeleted.value
  await loadUsers()
}

function setField<K extends 'full_name' | 'login' | 'password'>(key: K, value: string | number) {
  form[key] = String(value) as never
  if (fieldErrors.value[key]) fieldErrors.value[key] = undefined
}

onMounted(loadUsers)

function openCreateModal() {
  modalError.value = ''
  fieldErrors.value = {}
  isCreateOpen.value = true
}

function closeCreateModal() {
  isCreateOpen.value = false
  modalError.value = ''
  fieldErrors.value = {}
}

function openEditModal(user: User) {
  editUserId.value = user.id
  editForm.full_name = user.full_name
  editForm.login = user.login
  editForm.password = ''
  editForm.role_name = user.role.role_name
  editForm.is_active = user.is_active ? 'true' : 'false'
  fieldErrors.value = {}
  editError.value = ''
  isEditOpen.value = true
}

function closeEditModal() {
  isEditOpen.value = false
  editUserId.value = null
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

    <div class="flex items-center justify-end gap-2">
      <Button variant="outline" class="rounded-xl transition-colors duration-200" @click="toggleIncludeDeleted">
        {{ includeDeleted ? 'Скрыть архив' : 'Показать архив' }}
      </Button>
      <Button class="rounded-xl px-5" @click="openCreateModal">
        <Plus class="h-4 w-4" />
        Создать пользователя
      </Button>
    </div>

    <Card class="border-border/80 bg-card shadow-none">
      <CardHeader class="border-b border-border/70 pb-5">
        <CardTitle>Сотрудники</CardTitle>
        <CardDescription>Текущий состав команды и назначенные роли доступа.</CardDescription>
      </CardHeader>
      <CardContent class="pt-6 transition-opacity duration-200" :class="isRefreshing ? 'opacity-60' : 'opacity-100'">
        <p v-if="loading" class="text-sm text-muted-foreground">Загружаем список сотрудников...</p>
        <div v-else-if="!users.length" class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Пока нет сотрудников, добавьте первого пользователя.
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>ФИО</TableHead>
              <TableHead>Логин</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Архив</TableHead>
              <TableHead class="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="user in users" :key="user.id">
              <TableCell class="font-medium">{{ user.full_name }}</TableCell>
              <TableCell>{{ user.login }}</TableCell>
              <TableCell>{{ roleLabelMap[user.role.role_name] }}</TableCell>
              <TableCell>{{ user.is_active ? 'Активен' : 'Отключен' }}</TableCell>
              <TableCell>{{ user.is_deleted ? 'В архиве' : 'Активен' }}</TableCell>
              <TableCell class="space-x-2 text-right">
                <Button size="sm" variant="outline" @click="openEditModal(user)">Изменить</Button>
                <Button
                  v-if="!user.is_deleted"
                  size="sm"
                  variant="secondary"
                  @click="archiveUser(user.id)"
                >
                  Архив
                </Button>
                <Button
                  v-else
                  size="sm"
                  @click="unarchiveUser(user.id)"
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
            <CardTitle>Создать пользователя</CardTitle>
            <CardDescription>Администратор может создать менеджера или администратора.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" class="rounded-xl" @click="closeCreateModal">
            <X class="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent class="grid gap-5 pt-6 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">ФИО</label>
            <Input :model-value="form.full_name" placeholder="Анна Петрова" @update:model-value="setField('full_name', $event)" />
            <p v-if="fieldErrors.full_name" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.full_name }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Логин</label>
            <Input :model-value="form.login" placeholder="anna" @update:model-value="setField('login', $event)" />
            <p v-if="fieldErrors.login" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.login }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Пароль</label>
            <Input :model-value="form.password" type="password" placeholder="не менее 6 символов" @update:model-value="setField('password', $event)" />
            <p v-if="fieldErrors.password" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.password }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Роль</label>
            <Select v-model="form.role_name">
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Admin">Администратор</SelectItem>
                  <SelectItem value="Manager">Менеджер</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="md:col-span-2">
            <FeedbackAlert v-if="modalError" type="error" :message="modalError" />
          </div>
        </CardContent>
        <CardFooter class="border-t border-border/70 bg-muted/10 pt-4 flex items-center justify-end gap-3">
          <Button variant="outline" class="rounded-xl" @click="closeCreateModal">Отмена</Button>
          <Button class="rounded-xl px-5" :disabled="creating" @click="submitUser">
            {{ creating ? 'Сохраняем...' : 'Создать пользователя' }}
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
            <CardTitle>Изменить пользователя</CardTitle>
            <CardDescription>Редактирование роли, статуса и базовых данных пользователя.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" class="rounded-xl" @click="closeEditModal">
            <X class="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent class="grid gap-5 pt-6 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">ФИО</label>
            <Input :model-value="editForm.full_name" placeholder="Анна Петрова" @update:model-value="editForm.full_name = String($event)" />
            <p v-if="fieldErrors.full_name" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.full_name }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Логин</label>
            <Input :model-value="editForm.login" placeholder="anna" @update:model-value="editForm.login = String($event)" />
            <p v-if="fieldErrors.login" class="text-xs text-red-600 dark:text-red-300">{{ fieldErrors.login }}</p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Новый пароль (опционально)</label>
            <Input :model-value="editForm.password" type="password" placeholder="оставьте пустым, чтобы не менять" @update:model-value="editForm.password = String($event)" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium text-foreground">Роль</label>
            <Select v-model="editForm.role_name">
              <SelectTrigger>
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Admin">Администратор</SelectItem>
                  <SelectItem value="Manager">Менеджер</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2 md:col-span-2">
            <label class="text-sm font-medium text-foreground">Статус доступа</label>
            <Select v-model="editForm.is_active">
              <SelectTrigger>
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="true">Активен</SelectItem>
                  <SelectItem value="false">Отключен</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div class="md:col-span-2">
            <FeedbackAlert v-if="editError" type="error" :message="editError" />
          </div>
        </CardContent>
        <CardFooter class="border-t border-border/70 bg-muted/10 pt-4 flex items-center justify-end gap-3">
          <Button variant="outline" class="rounded-xl" @click="closeEditModal">Отмена</Button>
          <Button class="rounded-xl px-5" :disabled="editing" @click="submitUserUpdate">
            {{ editing ? 'Сохраняем...' : 'Сохранить' }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
