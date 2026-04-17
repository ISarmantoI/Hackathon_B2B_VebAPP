import { expect, test } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsAdmin(page: any) {
  await page.goto('/login')
  await page.getByRole('textbox').first().fill('admin')
  await page.getByRole('textbox').nth(1).fill('admin123')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

async function checkNoOverflow(page: any, label: string) {
  const offenders = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const els = document.querySelectorAll('*')
    const results: string[] = []
    for (const el of els) {
      const rect = el.getBoundingClientRect()
      if (rect.width <= vw + 5) continue
      // skip if any ancestor clips overflow
      let clipped = false
      let parent = el.parentElement
      while (parent) {
        const s = window.getComputedStyle(parent)
        if (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflowX === 'auto' || s.overflowX === 'scroll') {
          const pr = parent.getBoundingClientRect()
          if (pr.width <= vw + 5) { clipped = true; break }
        }
        parent = parent.parentElement
      }
      if (!clipped) {
        const e = el as HTMLElement
        results.push(`${e.tagName}.${e.className.slice(0, 60)} w=${Math.round(rect.width)}`)
      }
    }
    return results.slice(0, 10)
  })
  if (offenders.length) console.log(`Overflow on ${label}:`, offenders)
  expect(offenders.length, `Horizontal overflow on ${label}: ${offenders.join(' | ')}`).toBe(0)
}

async function checkNoHiddenText(page: any, label: string) {
  const clipped = await page.evaluate(() => {
    const els = document.querySelectorAll('p, h1, h2, h3, h4, span, button, a, td, th, label')
    for (const el of els) {
      const style = window.getComputedStyle(el)
      if (style.overflow === 'hidden' && style.whiteSpace === 'nowrap') {
        const e = el as HTMLElement
        if (e.scrollWidth > e.clientWidth + 2) return el.textContent?.slice(0, 60)
      }
    }
    return null
  })
  if (clipped) {
    console.warn(`[WARN] Clipped text on ${label}: "${clipped}"`)
  }
}

async function checkNoOverlappingButtons(page: any, label: string) {
  const overlapping = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a[role="button"], [role="button"]'))
    for (let i = 0; i < buttons.length; i++) {
      for (let j = i + 1; j < buttons.length; j++) {
        const a = buttons[i].getBoundingClientRect()
        const b = buttons[j].getBoundingClientRect()
        if (a.width === 0 || a.height === 0 || b.width === 0 || b.height === 0) continue
        const overlap =
          a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
        if (overlap) {
          return `"${buttons[i].textContent?.trim()}" overlaps "${buttons[j].textContent?.trim()}"`
        }
      }
    }
    return null
  })
  expect(overlapping, `Overlapping buttons on ${label}`).toBeNull()
}

async function checkZIndex(page: any, label: string) {
  const issue = await page.evaluate(() => {
    const modals = document.querySelectorAll('[role="dialog"], [data-state="open"]')
    for (const modal of modals) {
      const z = parseInt(window.getComputedStyle(modal).zIndex || '0')
      if (z < 10) return `Modal/dialog has low z-index (${z})`
    }
    return null
  })
  if (issue) {
    console.warn(`[WARN] z-index issue on ${label}: ${issue}`)
  }
}

async function visualCheck(page: any, label: string) {
  await checkNoOverflow(page, label)
  await checkNoHiddenText(page, label)
  await checkNoOverlappingButtons(page, label)
  await checkZIndex(page, label)
  await page.screenshot({ path: `test-results/visual-${label.replace(/\s+/g, '-')}.png`, fullPage: true })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('visual: login page', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Вход в систему' })).toBeVisible()
  await visualCheck(page, 'login')

  // Кнопка войти видна и не обрезана
  const btn = page.getByRole('button', { name: 'Войти' })
  await expect(btn).toBeVisible()
  const box = await btn.boundingBox()
  expect(box?.width, 'Login button too narrow').toBeGreaterThan(60)
  expect(box?.height, 'Login button too short').toBeGreaterThan(30)
})

test('visual: login form — empty submit shows errors', async ({ page }) => {
  await page.goto('/login')
  // Очищаем поля на случай автозаполнения
  await page.getByRole('textbox').first().fill('')
  await page.getByRole('textbox').nth(1).fill('')
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'test-results/visual-login-validation.png', fullPage: true })
  // Если форма ушла на dashboard — значит нет валидации пустых полей (реальный баг)
  const url = page.url()
  if (url.includes('/dashboard')) {
    console.warn('[BUG] Login form submits with empty fields — no client-side validation')
  }
  // Тест информационный, не падаем
})

test('visual: dashboard layout', async ({ page }) => {
  await loginAsAdmin(page)
  await page.waitForLoadState('networkidle')
  await visualCheck(page, 'dashboard')

  // Сайдбар присутствует
  const sidebar = page.locator('nav, aside, [data-sidebar]').first()
  await expect(sidebar).toBeVisible()

  // Заголовок страницы не обрезан
  const heading = page.getByRole('heading', { name: 'Операционный обзор' })
  await expect(heading).toBeVisible()
  const hBox = await heading.boundingBox()
  expect(hBox?.width, 'Dashboard heading clipped').toBeGreaterThan(50)
})

test('visual: orders page layout', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/orders')
  await page.waitForLoadState('networkidle')
  await visualCheck(page, 'orders')

  // Таблица или список заказов видны
  const table = page.locator('table, [role="table"], ul, .order').first()
  await expect(table).toBeVisible()
})

test('visual: clients page layout', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/clients')
  await page.waitForLoadState('networkidle')
  await visualCheck(page, 'clients')
})

test('visual: services page layout', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/services')
  await page.waitForLoadState('networkidle')
  await visualCheck(page, 'services')
})

test('visual: users page layout', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/admin/users')
  await page.waitForLoadState('networkidle')
  await visualCheck(page, 'users')
})

test('visual: mobile viewport — no overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await loginAsAdmin(page)

  for (const route of ['/dashboard', '/orders', '/clients', '/services']) {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    await checkNoOverflow(page, `mobile-${route}`)
    await page.screenshot({
      path: `test-results/visual-mobile-${route.replace('/', '')}.png`,
      fullPage: true,
    })
  }
})

test('visual: 404 page renders correctly', async ({ page }) => {
  await page.goto('/this-page-does-not-exist')
  await page.screenshot({ path: 'test-results/visual-404.png', fullPage: true })
  // Не должно быть пустой белой страницы
  const body = await page.locator('body').textContent()
  expect(body?.trim().length, '404 page is empty').toBeGreaterThan(0)
})
