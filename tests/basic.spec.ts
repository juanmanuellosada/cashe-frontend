import { test, expect } from '@playwright/test';

test('homepage', async ({ page }) => {
  await page.goto('/');
  
  // Verificar que la página carga correctamente
  await expect(page).toHaveTitle(/Cashé/);
  
  // Verificar que el contenido principal está presente
  await expect(page.locator('body')).toBeVisible();
});

test('navigation', async ({ page }) => {
  await page.goto('/');
  
  // Verificar que podemos navegar por las diferentes secciones
  // (ajustar según la estructura real de la aplicación)
  
  // Verificar que no hay errores 404 o 500
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);
});

test('responsive design', async ({ page }) => {
  // Probar en móvil
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  
  // Probar en tablet
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  
  // Probar en desktop
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
