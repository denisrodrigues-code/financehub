import { expect, test } from '@playwright/test'

test('main app flow smoke test', async ({ page }) => {
  await page.goto('/login')
  await page.getByPlaceholder('johndoe@example.com').fill('demo@financehub.local')
  await page.getByPlaceholder('......').fill('FinanceHub@123')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Dashboard Financeiro' })).toBeVisible()

  await page.getByRole('link', { name: 'Contas' }).click()
  await expect(page.getByRole('heading', { name: 'Contas e Conexões' })).toBeVisible()

  await page.getByRole('link', { name: 'Transações' }).click()
  await expect(page.getByRole('heading', { name: 'Transações' })).toBeVisible()

  await page.getByRole('link', { name: 'Orçamentos' }).click()
  await expect(page.getByRole('heading', { name: 'Orçamentos' })).toBeVisible()

  await page.getByRole('link', { name: 'Relatórios' }).click()
  await expect(page.getByRole('heading', { name: 'Relatórios' })).toBeVisible()
})
