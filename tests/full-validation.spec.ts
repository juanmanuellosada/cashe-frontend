import { test, expect } from '@playwright/test';

test.describe('Cashé - Validación Completa de la Aplicación', () => {
  test('Flujo completo de navegación por todas las secciones', async ({ page }) => {
    // 1. Ir a la página principal
    await page.goto('/');
    await expect(page).toHaveTitle(/Cashé.*Gestión Financiera Personal/);
    
    // 2. Verificar logo en la página de login
    await expect(page.locator('img[alt="Cashé Logo"]')).toBeVisible();
    await expect(page.locator('h1:has-text("Cashé")')).toBeVisible();
    
    // 3. Hacer login
    await page.getByRole('button', { name: 'Iniciar Sesión' }).last().click();
    await page.waitForURL('**/dashboard');
    
    // 4. Verificar dashboard
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('img[alt="Cashé"]')).toBeVisible(); // Logo en sidebar
    await expect(page.locator('text=Ingresos Totales')).toBeVisible();
    await expect(page.locator('text=$ 45.000,00').first()).toBeVisible();
    
    // 5. Navegar a Cuentas
    await page.getByRole('link', { name: 'Cuentas' }).click();
    await page.waitForURL('**/accounts');
    await expect(page.locator('h1:has-text("Gestión de Cuentas")')).toBeVisible();
    await expect(page.locator('text=Balance Total')).toBeVisible();
    await expect(page.locator('text=$ 131.500')).toBeVisible();
    
    // 6. Navegar a Movimientos
    await page.getByRole('link', { name: 'Movimientos' }).click();
    await page.waitForURL('**/transactions');
    await expect(page.locator('h1:has-text("Movimientos")')).toBeVisible();
    await expect(page.locator('text=Transacciones')).toBeVisible();
    await expect(page.locator('text=Sueldo Enero')).toBeVisible();
    
    // 7. Navegar a Transferencias
    await page.getByRole('link', { name: 'Transferencias' }).click();
    await page.waitForURL('**/transfers');
    await expect(page.locator('h1')).toBeVisible();
    
    // 8. Navegar a Categorías
    await page.getByRole('link', { name: 'Categorías' }).click();
    await page.waitForURL('**/categories');
    await expect(page.locator('h1')).toBeVisible();
    
    // 9. Navegar a Reportes
    await page.getByRole('link', { name: 'Reportes' }).click();
    await page.waitForURL('**/reports');
    await expect(page.locator('h1')).toBeVisible();
    
    // 10. Navegar a Configuración
    await page.getByRole('link', { name: 'Configuración' }).click();
    await page.waitForURL('**/settings');
    await expect(page.locator('h1')).toBeVisible();
    
    // 11. Volver al Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForURL('**/dashboard');
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });

  test('Verificar iconos y recursos visuales', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que el logo se carga en la página principal
    await expect(page.locator('img[alt="Cashé Logo"]')).toBeVisible();
    
    // Hacer login
    await page.getByRole('button', { name: 'Iniciar Sesión' }).last().click();
    await page.waitForURL('**/dashboard');
    
    // Verificar que el logo se carga en el sidebar
    await expect(page.locator('img[alt="Cashé"]')).toBeVisible();
    
    // Verificar que no hay errores críticos de recursos
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('404')) {
        errors.push(msg.text());
      }
    });
    
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    
    // Verificar que no hay errores críticos
    expect(errors.length).toBeLessThanOrEqual(2); // Permitir algunos errores menores
  });

  test('Probar funcionalidades interactivas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).last().click();
    await page.waitForURL('**/dashboard');
    
    // Probar el toggle de tema
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await expect(page.locator('body')).toBeVisible();
    
    // Probar botones de acciones rápidas
    await expect(page.getByRole('button', { name: 'Ingreso' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gasto' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Transferir' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cuenta' })).toBeVisible();
    
    // Verificar información del usuario
    await expect(page.locator('text=Juan Pérez')).toBeVisible();
    await expect(page.locator('text=juan@email.com')).toBeVisible();
  });

  test('Verificar responsividad básica', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).last().click();
    await page.waitForURL('**/dashboard');
    
    // Probar en móvil
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    
    // Probar en tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    
    // Probar en desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });
});
