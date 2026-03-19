import { expect, test } from '@playwright/test'

function parseBrl(text) {
  const normalized = text.replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : 0
}

async function getCategoryAmount(page, categoryName) {
  const row = page.locator('div.table-line').filter({ hasText: categoryName }).first()
  const exists = await row.count()
  if (!exists) {
    return 0
  }

  const amountText = await row.locator('p').last().innerText()
  return parseBrl(amountText)
}

test('create expense and reflect on reports', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('johndoe@example.com').fill('demo@financehub.local')
  await page.getByPlaceholder('......').fill('FinanceHub@123')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard Financeiro' })).toBeVisible()

  const currentMonth = (() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })()

  await page.getByRole('link', { name: 'Relatórios' }).click()
  await expect(page.getByRole('heading', { name: 'Relatórios' })).toBeVisible()

  const reportsFilters = page.locator('section.app-panel').first()
  const reportsSelects = reportsFilters.locator('select')
  await reportsSelects.nth(0).selectOption({ value: currentMonth }).catch(() => Promise.resolve())
  const accountValue = await reportsSelects.nth(1).inputValue()

  const beforeAmount = await getCategoryAmount(page, 'Moradia')

  await page.getByRole('link', { name: 'Transações' }).click()
  await expect(page.getByRole('heading', { name: 'Transações' })).toBeVisible()

  const newTransactionSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Nova transação' }) })
  const createSelects = newTransactionSection.locator('select')
  const createInputs = newTransactionSection.locator('input')

  if (accountValue && accountValue !== 'all') {
    await createSelects.nth(0).selectOption({ value: accountValue })
  }

  await createSelects.nth(1).selectOption('1')

  const uniqueDescription = `Despesa E2E ${Date.now()}`
  await createInputs.nth(0).fill(uniqueDescription)
  await createInputs.nth(1).fill('Teste Playwright')
  await createInputs.nth(2).fill('123.45')
  await createSelects.nth(2).selectOption({ label: 'Moradia' })

  await newTransactionSection.getByRole('button', { name: 'Salvar transação' }).click()
  await expect(page.locator('section').filter({ hasText: uniqueDescription }).first()).toBeVisible()

  await page.getByRole('link', { name: 'Relatórios' }).click()
  await expect(page.getByRole('heading', { name: 'Relatórios' })).toBeVisible()

  const reportsFiltersAfter = page.locator('section.app-panel').first()
  const reportsSelectsAfter = reportsFiltersAfter.locator('select')
  await reportsSelectsAfter.nth(0).selectOption({ value: currentMonth }).catch(() => Promise.resolve())
  if (accountValue && accountValue !== 'all') {
    await reportsSelectsAfter.nth(1).selectOption({ value: accountValue })
  }

  const afterAmount = await getCategoryAmount(page, 'Moradia')
  expect(afterAmount).toBeGreaterThanOrEqual(beforeAmount + 123.45)
})
