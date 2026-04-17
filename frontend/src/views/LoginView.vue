<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import FeedbackAlert from '@/components/app/FeedbackAlert.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  login: 'manager',
  password: 'manager123',
})
const error = ref('')

async function handleSubmit() {
  error.value = ''
  if (!form.login.trim() || !form.password.trim()) {
    error.value = 'Введите логин и пароль'
    return
  }
  try {
    await authStore.login(form.login, form.password)
    await router.push({ name: 'dashboard' })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Не удалось войти'
  }
}
</script>

<template>
  <Card class="w-full max-w-md border-border/70 bg-card/95 shadow-xl backdrop-blur">
    <CardHeader>
      <CardTitle>Вход в систему</CardTitle>
      <CardDescription>
        Авторизуйтесь как сотрудник компании, чтобы управлять клиентами, услугами и жизненным циклом заказов.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <label class="text-sm font-medium text-foreground">Логин</label>
        <Input v-model="form.login" placeholder="manager" />
      </div>
      <div class="space-y-2">
        <label class="text-sm font-medium text-foreground">Пароль</label>
        <Input v-model="form.password" type="password" placeholder="manager123" />
      </div>
      <FeedbackAlert v-if="error" type="error" :message="error" />
      <div class="rounded-md border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground">
        Демо менеджер: <code>manager / manager123</code><br />
        Демо администратор: <code>admin / admin123</code>
      </div>
    </CardContent>
    <CardFooter>
      <Button class="w-full" :disabled="authStore.loading" @click="handleSubmit">
        {{ authStore.loading ? 'Входим...' : 'Войти' }}
      </Button>
    </CardFooter>
  </Card>
</template>
