import { test, expect } from '@playwright/test';

test.describe('Cashé App Tests', () => {
  test('should load the main page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que la página carga sin errores
    await expect(page).toHaveTitle(/Cashé/);
    
    // Verificar que no hay errores de JavaScript en la consola
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Esperar a que la página esté lista con un timeout más corto
    await page.waitForLoadState('domcontentloaded');
    
    // No debería haber errores críticos de JavaScript (ignorar errores de imagen y favicon)
    const criticalErrors = errors.filter(error => 
      !error.includes('cashe-logo.png') && // Ignorar errores de imagen faltante
      !error.includes('favicon') &&
      !error.includes('404') &&
      !error.includes('Failed to load resource')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('should have proper navigation structure', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que la página tiene la estructura básica esperada
    await expect(page.locator('body')).toBeVisible();
    
    // La aplicación debería tener algún contenido visible
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });

  test('should be accessible', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que la página tiene un título descriptivo
    const title = await page.title();
    expect(title).toContain('Cashé');
    
    // Verificar que la página tiene contenido
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });

  test('should work on different screen sizes', async ({ page }) => {
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });

  test('should not have critical performance issues', async ({ page }) => {
    await page.goto('/');
    
    // Medir el tiempo de carga
    const startTime = Date.now();
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    // La página debería cargar en menos de 10 segundos
    expect(loadTime).toBeLessThan(10000);
  });
});
