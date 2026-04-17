import { expect, test } from '@playwright/test'

test('login and critical CRUD smoke', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Вход в систему' })).toBeVisible()

  await page.getByRole('textbox').first().fill('admin')
  await page.getByRole('textbox').nth(1).fill('admin123')
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole('heading', { name: 'Операционный обзор' })).toBeVisible()

  const suffix = Date.now()
  const clientCreate = await page.request.post('/api/v1/clients', {
    data: {
      inn: `7700${String(suffix).slice(-6)}`,
      company_name: `E2E Клиент ${suffix}`,
      phone: '+79990000000',
    },
  })
  expect(clientCreate.ok()).toBeTruthy()
  const client = await clientCreate.json()

  const clientPatch = await page.request.patch(`/api/v1/clients/${client.id}`, {
    data: { company_name: `E2E Клиент Updated ${suffix}` },
  })
  expect(clientPatch.ok()).toBeTruthy()
  expect((await clientPatch.json()).company_name).toContain('Updated')

  expect((await page.request.delete(`/api/v1/clients/${client.id}`)).ok()).toBeTruthy()
  expect((await page.request.post(`/api/v1/clients/${client.id}/restore`)).ok()).toBeTruthy()

  const serviceCreate = await page.request.post('/api/v1/services', {
    data: {
      title: `E2E Service ${suffix}`,
      description: 'Smoke scenario service',
      price: 12345,
    },
  })
  expect(serviceCreate.ok()).toBeTruthy()
  const service = await serviceCreate.json()

  expect(
    (
      await page.request.patch(`/api/v1/services/${service.id}`, {
        data: { price: 23456 },
      })
    ).ok(),
  ).toBeTruthy()
  expect((await page.request.delete(`/api/v1/services/${service.id}`)).ok()).toBeTruthy()
  expect((await page.request.post(`/api/v1/services/${service.id}/restore`)).ok()).toBeTruthy()

  const orderCreate = await page.request.post('/api/v1/orders', {
    data: {
      client_id: client.id,
      service_id: service.id,
    },
  })
  expect(orderCreate.ok()).toBeTruthy()
  const order = await orderCreate.json()

  expect(
    (
      await page.request.patch(`/api/v1/orders/${order.id}/status`, {
        data: { status: 'in_progress' },
      })
    ).ok(),
  ).toBeTruthy()
  expect(
    (
      await page.request.post(`/api/v1/orders/${order.id}/events`, {
        data: { message: 'E2E comment' },
      })
    ).ok(),
  ).toBeTruthy()
})
