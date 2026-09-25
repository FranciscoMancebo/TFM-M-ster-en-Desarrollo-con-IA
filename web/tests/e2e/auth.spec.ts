import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('shows the sign-in form', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Entrar en Haltero|Sign in to Haltero/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Correo electrónico|Email/ })).toBeVisible();
  await expect(page.getByLabel(/Contraseña|Password/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Entrar|Sign in/, exact: true })).toBeVisible();
});

test('can switch between sign-in and account creation', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /Crear una cuenta|Create an account/ }).click();
  await expect(page.getByRole('heading', { name: /Crear una cuenta|Create an account/ })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Nombre|Name/ })).toBeVisible();

  await page.getByRole('button', { name: /Ya tengo una cuenta|I already have an account/ }).click();
  await expect(page.getByRole('heading', { name: /Entrar en Haltero|Sign in to Haltero/ })).toBeVisible();
});
