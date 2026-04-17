<script setup lang="ts">
import { computed } from 'vue'
import { Building2, LayoutDashboard, LogOut, Moon, Package, ShoppingCart, Sun, Users } from 'lucide-vue-next'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const roleLabelMap: Record<string, string> = {
  Admin: 'Администратор',
  Manager: 'Менеджер',
}

const items = computed(() => {
  const baseItems = [
    { label: 'Дашборд', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Заказы', to: '/orders', icon: ShoppingCart },
    { label: 'Клиенты', to: '/clients', icon: Building2 },
    { label: 'Услуги', to: '/services', icon: Package },
  ]

  if (authStore.isAdmin) {
    baseItems.push({ label: 'Пользователи', to: '/admin/users', icon: Users })
  }

  return baseItems
})

function isActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`)
}

async function handleLogout() {
  await authStore.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <aside class="sticky top-0 flex h-svh w-64 shrink-0 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
    <div class="border-b border-[hsl(var(--sidebar-border))] px-6 py-6">
      <p class="text-xs uppercase tracking-[0.18em] text-[hsl(var(--sidebar-foreground))]/65">B2B Платформа</p>
      <h1 class="mt-2 text-lg font-semibold text-[hsl(var(--sidebar-foreground))]">Управление заказами</h1>
      <p class="mt-1 text-xs text-[hsl(var(--sidebar-foreground))]/60">MVP для автоматизации B2B-процесса</p>
    </div>
    <nav class="flex-1 space-y-1.5 overflow-y-auto p-4">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
        :class="isActive(item.to) ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'text-[hsl(var(--sidebar-foreground))]/75 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]'"
      >
        <component :is="item.icon" class="h-4 w-4" />
        {{ item.label }}
      </RouterLink>
    </nav>
    <div class="mt-auto border-t border-[hsl(var(--sidebar-border))] p-4">
      <div class="rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent))]/35 p-3">
        <p class="truncate text-sm font-medium text-[hsl(var(--sidebar-foreground))]">{{ authStore.user?.full_name }}</p>
        <p class="mt-0.5 text-xs uppercase tracking-wide text-[hsl(var(--sidebar-foreground))]/65">
          {{ roleLabelMap[authStore.user?.role.role_name ?? ''] ?? authStore.user?.role.role_name }}
        </p>
        <div class="mt-3 flex items-center gap-2">
          <Button variant="outline" size="icon" class="h-9 w-9 rounded-lg border-[hsl(var(--sidebar-border))] bg-transparent hover:bg-[hsl(var(--sidebar-accent))]" @click="themeStore.toggleTheme">
            <Sun v-if="themeStore.isDark" class="h-4 w-4" />
            <Moon v-else class="h-4 w-4" />
          </Button>
          <Button variant="outline" class="h-9 flex-1 rounded-lg justify-start border-[hsl(var(--sidebar-border))] bg-transparent hover:bg-[hsl(var(--sidebar-accent))]" @click="handleLogout">
            <LogOut class="h-4 w-4" />
            Выйти
          </Button>
        </div>
      </div>
    </div>
  </aside>
</template>
