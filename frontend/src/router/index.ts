import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { pinia } from '@/stores'

import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia)
  await authStore.initializeSession()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  if (to.meta.roles?.length) {
    const currentRole = authStore.user?.role.role_name
    if (!currentRole || !to.meta.roles.includes(currentRole)) {
      return { name: 'dashboard' }
    }
  }

  return true
})

export default router
