import type { RouteRecordRaw } from 'vue-router'

import AuthLayout from '@/layouts/AuthLayout.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import UsersView from '@/views/admin/UsersView.vue'
import ClientsView from '@/views/clients/ClientsView.vue'
import DashboardView from '@/views/DashboardView.vue'
import LoginView from '@/views/LoginView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import OrdersView from '@/views/orders/OrdersView.vue'
import ServicesView from '@/views/services/ServicesView.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'login',
        component: LoginView,
        meta: { title: 'Вход' },
      },
    ],
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: { name: 'dashboard' },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { requiresAuth: true, title: 'Дашборд' },
      },
      {
        path: 'orders',
        name: 'orders',
        component: OrdersView,
        meta: { requiresAuth: true, title: 'Заказы' },
      },
      {
        path: 'clients',
        name: 'clients',
        component: ClientsView,
        meta: { requiresAuth: true, title: 'Клиенты' },
      },
      {
        path: 'services',
        name: 'services',
        component: ServicesView,
        meta: { requiresAuth: true, title: 'Услуги' },
      },
      {
        path: 'admin/users',
        name: 'users',
        component: UsersView,
        meta: { requiresAuth: true, roles: ['Admin'], title: 'Пользователи' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
  },
]
