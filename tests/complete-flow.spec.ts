import { test, expect } from '@playwright/test';

test.describe('Cashé - Pruebas Completas de la Aplicación', () => {
  test('Flujo completo: Login y Dashboard', async ({ page }) => {
    // 1. Navegar a la página principal
    await page.goto('/');
    await expect(page).toHaveTitle(/Cashé/);
    
    // 2. Verificar elementos de la página de login
    await expect(page.locator('h1')).toContainText('Cashé');
    await expect(page.locator('text=Tu gestor financiero personal')).toBeVisible();
    await expect(page.locator('text=Bienvenido')).toBeVisible();
    
    // 3. Verificar que los campos de login tienen valores por defecto
    const emailField = page.locator('input[type="email"]');
    const passwordField = page.locator('input[type="password"]');
    
    await expect(emailField).toHaveValue('demo@cashe.app');
    await expect(passwordField).toHaveValue('demo123');
    
    // 4. Hacer login - usar un selector más específico
    const loginButton = page.getByRole('button', { name: 'Iniciar Sesión' }).last();
    await loginButton.click();
    
    // 5. Esperar a que aparezca el estado de "Iniciando sesión..."
    await expect(page.locator('button:has-text("Iniciando sesión...")')).toBeVisible();
    
    // 6. Esperar a que redirija al dashboard
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    
    // 7. Verificar elementos del dashboard
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=Resumen de tus finanzas personales')).toBeVisible();
    
    // 8. Verificar métricas principales
    await expect(page.locator('text=Ingresos Totales')).toBeVisible();
    await expect(page.locator('text=$ 45.000,00').first()).toBeVisible();
    await expect(page.locator('text=Gastos Totales')).toBeVisible();
    await expect(page.locator('text=$ 32.500,00').first()).toBeVisible();
    await expect(page.locator('text=Balance')).toBeVisible();
    await expect(page.locator('text=$ 12.500,00').first()).toBeVisible();
    
    // 9. Verificar botones de acciones rápidas
    await expect(page.locator('button:has-text("Ingreso")')).toBeVisible();
    await expect(page.locator('button:has-text("Gasto")')).toBeVisible();
    await expect(page.locator('button:has-text("Transferir")')).toBeVisible();
    await expect(page.locator('button:has-text("Cuenta")')).toBeVisible();
    
    // 10. Verificar últimos movimientos
    await expect(page.locator('text=Últimos Movimientos')).toBeVisible();
    await expect(page.locator('text=Supermercado Coto')).toBeVisible();
    await expect(page.locator('text=Sueldo Enero')).toBeVisible();
    await expect(page.locator('text=Netflix')).toBeVisible();
    
    // 11. Verificar gráficos y categorías
    await expect(page.locator('text=Evolución mensual de este año')).toBeVisible();
    await expect(page.locator('text=Gastos por Categoría')).toBeVisible();
    await expect(page.locator('text=Ingresos por Categoría')).toBeVisible();
    
    // 12. Verificar categorías específicas
    await expect(page.locator('text=Alimentación')).toBeVisible();
    await expect(page.locator('text=Transporte')).toBeVisible();
    await expect(page.locator('text=Entretenimiento')).toBeVisible();
    await expect(page.locator('text=Sueldo')).toBeVisible();
    await expect(page.locator('text=Freelance')).toBeVisible();
    
    // 13. Verificar botón para ver todos los movimientos
    await expect(page.locator('button:has-text("Ver todos los movimientos")')).toBeVisible();
    
    // 14. Verificar controles de interfaz
    await expect(page.locator('button:has-text("Toggle theme")')).toBeVisible();
    await expect(page.locator('button:has-text("Abrir sidebar")')).toBeVisible();
  });

  test('Responsividad del dashboard', async ({ page }) => {
    // Login primero
    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).last().click();
    await page.waitForURL('**/dashboard');
    
    // Probar en móvil
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=$ 45.000,00').first()).toBeVisible();

    // Probar en tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=$ 32.500,00').first()).toBeVisible();

    // Probar en desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('text=$ 12.500,00').first()).toBeVisible();
  });

  test('Verificar accesibilidad básica', async ({ page }) => {
    await page.goto('/');
    
    // Verificar que tiene título descriptivo
    await expect(page).toHaveTitle(/Cashé.*Gestión Financiera Personal/);
    
    // Verificar que los campos tienen labels
    await expect(page.locator('text=Correo electrónico')).toBeVisible();
    await expect(page.getByText('Contraseña', { exact: true }).first()).toBeVisible();

    // Verificar que los botones tienen texto descriptivo
    await expect(page.getByRole('button', { name: 'Iniciar Sesión' }).last()).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Registrarse' })).toBeVisible();
  });

  test('Navegación con teclado', async ({ page }) => {
    await page.goto('/');
    
    // Navegar con Tab hasta el botón de login
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verificar que se puede hacer login con Enter
    await page.keyboard.press('Enter');
    
    // Verificar redirección al dashboard en lugar del estado de "Iniciando sesión"
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
  });
});
