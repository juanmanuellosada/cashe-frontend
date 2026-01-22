# CLAUDE.md - Finanzas Personales Web App

## Descripción del Proyecto

Aplicación web para gestión de finanzas personales con soporte para ingresos, gastos (incluyendo cuotas automáticas de tarjeta de crédito), y transferencias. Se conecta a Google Sheets como backend a través de Google Apps Script.

**Objetivo**: Interfaz moderna, minimalista y mobile-first con dashboard, estadísticas, y gestión completa de movimientos financieros.

---

## Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| **React 18** + **Vite** | Frontend SPA |
| **Tailwind CSS** | Estilos |
| **React Router DOM** | Navegación |
| **Recharts** | Gráficos |
| **React Day Picker** + **date-fns** | Selector de fechas |
| **Google Apps Script** | API REST |
| **Google Sheets** | Base de datos |
| **GitHub Pages** | Hosting |
| **Vite PWA Plugin** | Progressive Web App |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (GitHub Pages)                      │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │  Home/   │ │  Nuevo   │ │ Gastos/  │ │  Stats   │ │Cuentas/││
│  │ Dashboard│ │Movimiento│ │Ingresos  │ │ Gráficos │ │Categor.││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘│
│       └────────────┴────────────┴────────────┴───────────┘     │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTPS (fetch)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│               GOOGLE APPS SCRIPT V3 (API REST)                   │
│                                                                  │
│  GET:  getAccounts, getCategories, getDashboard,                │
│        getAllMovements, getRecentMovements, getExchangeRate,    │
│        getInstallmentsByPurchase, getPendingInstallments        │
│                                                                  │
│  POST: addIncome, addExpense, addExpenseWithInstallments,       │
│        addTransfer, updateIncome/Expense/Transfer,              │
│        deleteIncome/Expense/Transfer, deleteInstallmentsByPurchase │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       GOOGLE SHEETS                              │
│                                                                  │
│  Hojas: Monedas, Cuentas, Categorías, Gastos, Ingresos,         │
│         Transferencias                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estructura del Proyecto

```
finanzas-personales/
├── .claude/
│   └── settings.local.json
├── .gitignore
├── APPSCRIPT_COMPLETO_V3.js      # ⭐ Código actual del Apps Script
├── CLAUDE.md                      # Este archivo
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
│   └── favicon.ico
├── dist/                          # Build de producción
└── src/
    ├── main.jsx                   # Entry point
    ├── App.jsx                    # Router principal
    ├── index.css                  # Estilos globales + Tailwind
    │
    ├── config/
    │   └── api.js                 # URL del Apps Script
    │
    ├── services/
    │   └── sheetsApi.js           # Funciones para llamar al API
    │
    ├── hooks/
    │   ├── useAccounts.js         # Hook para cuentas
    │   ├── useCategories.js       # Hook para categorías
    │   └── useDashboard.js        # Hook para datos del dashboard
    │
    ├── utils/
    │   └── format.js              # Formateo de números y fechas
    │
    ├── components/
    │   ├── Layout.jsx             # Layout con navegación
    │   ├── ThemeToggle.jsx        # Dark/Light mode
    │   ├── LoadingSpinner.jsx     # Spinner de carga
    │   ├── Toast.jsx              # Notificaciones
    │   ├── Combobox.jsx           # Select con búsqueda
    │   ├── DatePicker.jsx         # Selector de fecha individual
    │   ├── DateRangePicker.jsx    # Selector de rango de fechas
    │   ├── EditMovementModal.jsx  # Modal para editar movimientos
    │   ├── FilterBar.jsx          # Barra de filtros
    │   ├── MovementsList.jsx      # Lista de movimientos
    │   ├── SearchButton.jsx       # Botón de búsqueda
    │   ├── SearchModal.jsx        # Modal de búsqueda
    │   │
    │   ├── forms/
    │   │   ├── MovementForm.jsx   # Formulario principal (tabs)
    │   │   ├── IncomeForm.jsx     # Campos de ingreso
    │   │   ├── ExpenseForm.jsx    # Campos de gasto (con cuotas)
    │   │   └── TransferForm.jsx   # Campos de transferencia
    │   │
    │   ├── dashboard/
    │   │   ├── BalanceCard.jsx
    │   │   ├── RecentMovements.jsx
    │   │   └── QuickStats.jsx
    │   │
    │   └── charts/
    │       ├── BalanceLineChart.jsx     # Evolución del balance
    │       ├── ExpensePieChart.jsx      # Gastos por categoría
    │       └── IncomeExpenseBarChart.jsx # Comparativo mensual
    │
    └── pages/
        ├── Home.jsx               # Dashboard principal
        ├── NewMovement.jsx        # Formulario de carga
        ├── Expenses.jsx           # Listado de gastos
        ├── Income.jsx             # Listado de ingresos
        ├── Transfers.jsx          # Listado de transferencias
        ├── Statistics.jsx         # Página de estadísticas/gráficos
        ├── Accounts.jsx           # Gestión de cuentas
        └── Categories.jsx         # Gestión de categorías
```

---

## Google Sheets - Estructura de Datos

### ID del Spreadsheet
```
1ZKoPArVyfG45J23g0AH9skvlYRhIyXZROcMRmgOUML0
```

### Hoja: Monedas
| Col | Nombre | Tipo | Notas |
|-----|--------|------|-------|
| A | Nombre | string | Ej: "Peso", "Dólar estadounidense" |
| B | Símbolo | string | Ej: "$", "US$" |
| C | Es moneda base | boolean | |
| D | Tipo de cambio | number | **D3 = Dólar oficial** (se actualiza automáticamente) |

### Hoja: Cuentas
| Col | Nombre | Tipo | Origen |
|-----|--------|------|--------|
| A | Nombre de la cuenta | string | Manual |
| B | Balance inicial | number | Manual |
| C | Moneda | string | Manual |
| D | Número de cuenta | string | Manual (opcional) |
| E | Tipo de cuenta | string | Manual: "Caja de ahorro", "Cuenta corriente", **"Tarjeta de crédito"** |
| F | Día de cierre | number | Manual (1-31, **solo para tarjetas**) |
| G | Total ingresos | number | Fórmula |
| H | Total gastos | number | Fórmula |
| I | Total transf. entrantes | number | Fórmula |
| J | Total transf. salientes | number | Fórmula |
| K | Balance actual | number | Fórmula |
| L | Balance en pesos | string | Fórmula |
| M | Balance en dólares | string | Fórmula |

### Hoja: Categorías
| Col | Nombre | Tipo |
|-----|--------|------|
| A | Nombre de la categoría | string |
| B | Tipo | "Ingreso" o "Gasto" |

### Hoja: Gastos ⭐ (con soporte para cuotas)
| Col | Nombre | Tipo | Origen |
|-----|--------|------|--------|
| A | Fecha | date | API |
| B | Monto | number | API |
| C | Cuenta | string | API |
| D | Categoría | string | API |
| E | Monto en pesos | number | **Fórmula (NO TOCAR)** |
| F | Monto en dólares | number | **Fórmula (NO TOCAR)** |
| G | Nota | string | API |
| H | ID Compra | string | API (para agrupar cuotas) |
| I | Cuota | string | API (ej: "1/12", "2/12") |

### Hoja: Ingresos
| Col | Nombre | Tipo | Origen |
|-----|--------|------|--------|
| A | Fecha | date | API |
| B | Monto | number | API |
| C | Cuenta | string | API |
| D | Categoría | string | API |
| E | Monto en pesos | number | **Fórmula (NO TOCAR)** |
| F | Monto en dólares | number | **Fórmula (NO TOCAR)** |
| G | Nota | string | API |

### Hoja: Transferencias
| Col | Nombre | Tipo | Origen |
|-----|--------|------|--------|
| A | Fecha | date | API |
| B | Cuenta saliente | string | API |
| C | Cuenta entrante | string | API |
| D | Monto saliente | number | API |
| E | Monto entrante | number | API |
| F | Nota | string | API |

---

## API REST - Endpoints

### Archivo: `APPSCRIPT_COMPLETO_V3.js`

El archivo completo está en la raíz del proyecto. **Copiar todo su contenido** al Apps Script de Google Sheets.

### Endpoints GET

```javascript
// Obtener todas las cuentas (incluye info de tarjetas de crédito)
GET ?action=getAccounts

// Obtener categorías agrupadas por tipo
GET ?action=getCategories

// Obtener tipo de cambio actual
GET ?action=getExchangeRate

// Obtener datos del dashboard
GET ?action=getDashboard

// Obtener últimos N movimientos
GET ?action=getRecentMovements&limit=10

// Obtener TODOS los movimientos
GET ?action=getAllMovements

// Obtener cuotas de una compra específica
GET ?action=getInstallmentsByPurchase&idCompra=C1234567890

// Obtener todas las compras con cuotas pendientes
GET ?action=getPendingInstallments
```

### Endpoints POST

```javascript
// Agregar ingreso
POST { action: 'addIncome', fecha, monto, cuenta, categoria, nota }

// Agregar gasto simple
POST { action: 'addExpense', fecha, monto, cuenta, categoria, nota }

// ⭐ Agregar gasto en cuotas (genera todas las cuotas automáticamente)
POST { 
  action: 'addExpenseWithInstallments',
  fechaCompra: '2026-01-20',
  montoTotal: 120000,
  cuenta: 'Tarjeta VISA',
  categoria: 'Tecnología',
  nota: 'Notebook',
  cantidadCuotas: 12
}

// Agregar transferencia
POST { action: 'addTransfer', fecha, cuentaSaliente, cuentaEntrante, montoSaliente, montoEntrante, nota }

// Actualizar movimientos (requiere rowIndex)
POST { action: 'updateIncome', rowIndex, fecha, monto, cuenta, categoria, nota }
POST { action: 'updateExpense', rowIndex, fecha, monto, cuenta, categoria, nota }
POST { action: 'updateTransfer', rowIndex, fecha, cuentaSaliente, cuentaEntrante, montoSaliente, montoEntrante, nota }

// Eliminar movimientos (requiere rowIndex)
POST { action: 'deleteIncome', rowIndex }
POST { action: 'deleteExpense', rowIndex }
POST { action: 'deleteTransfer', rowIndex }

// Eliminar todas las cuotas de una compra
POST { action: 'deleteInstallmentsByPurchase', idCompra: 'C1234567890' }
```

### Configuración del Apps Script

1. Ir a `Extensiones > Apps Script` en Google Sheets
2. Reemplazar todo el código con el contenido de `APPSCRIPT_COMPLETO_V3.js`
3. Guardar (Ctrl+S)
4. Hacer clic en `Implementar > Nueva implementación`
5. Seleccionar tipo: `Aplicación web`
6. Configurar:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
7. Copiar la URL de la implementación

**⚠️ IMPORTANTE**: Cada vez que modifiques el código, debes crear una **NUEVA implementación** para que los cambios se reflejen.

---

## Diseño UI/UX

### Paleta de Colores

```css
/* Dark Mode (default) */
--bg-primary: #0f0f0f;
--bg-secondary: #1a1a1a;
--bg-tertiary: #252525;
--text-primary: #ffffff;
--text-secondary: #a0a0a0;
--accent-green: #22c55e;    /* Ingresos */
--accent-red: #ef4444;      /* Gastos */
--accent-blue: #3b82f6;     /* Transferencias */
--accent-purple: #8b5cf6;   /* Acciones primarias */

/* Light Mode */
--bg-primary: #ffffff;
--bg-secondary: #f5f5f5;
--bg-tertiary: #e5e5e5;
--text-primary: #0f0f0f;
--text-secondary: #6b7280;
```

### Principios de Diseño
- **Mobile-first**: Diseñar primero para móvil
- **Minimalista**: Sin elementos innecesarios
- **Dark mode por defecto**: Con toggle para light mode
- **Feedback inmediato**: Loaders, toasts, animaciones sutiles

---

## Funcionalidades

### ✅ Implementadas

- [x] Formulario de carga con 3 tipos de movimiento
- [x] Listas dinámicas de cuentas y categorías
- [x] Dashboard con balance y últimos movimientos
- [x] Dark/Light mode con toggle
- [x] Responsive (mobile-first)
- [x] Feedback visual (loading, success, error)
- [x] **Gastos en cuotas automáticas** (tarjeta de crédito)
- [x] **Edición de movimientos**
- [x] **Eliminación de movimientos**
- [x] **Gráficos estadísticos** (Recharts)
- [x] **Filtros por fecha y categoría**
- [x] **Búsqueda de movimientos**
- [x] **Listados separados** (Gastos, Ingresos, Transferencias)
- [x] **PWA** (instalable)

### 📋 Pendientes / Nice to have

- [ ] Autenticación con Google (solo email autorizado)
- [ ] Notificaciones push para cuotas próximas
- [ ] Exportar a CSV/Excel
- [ ] Presupuestos mensuales por categoría
- [ ] Metas de ahorro
- [ ] Modo offline con sincronización

---

## Configuración del Frontend

### `src/config/api.js`

```javascript
// URL del Apps Script deployment
export const API_URL = 'https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec';

// Email autorizado (opcional, para futura autenticación)
export const AUTHORIZED_EMAIL = 'juanmalosada11@gmail.com';
```

### Variables de Entorno (opcional)

Para no exponer la URL del API en el código, puedes usar variables de entorno:

```bash
# .env.local
VITE_API_URL=https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec
```

```javascript
// src/config/api.js
export const API_URL = import.meta.env.VITE_API_URL;
```

---

## Comandos

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Deploy a GitHub Pages
npm run deploy
```

---

## Testing del API

```javascript
const API = 'TU_URL_APPS_SCRIPT';

// GET - Dashboard
fetch(`${API}?action=getDashboard`)
  .then(r => r.json())
  .then(console.log);

// POST - Gasto simple
fetch(API, {
  method: 'POST',
  body: JSON.stringify({
    action: 'addExpense',
    fecha: '2026-01-21',
    monto: 5000,
    cuenta: 'Caja de ahorro Pesos',
    categoria: 'Supermercado',
    nota: 'Compras semanales'
  })
}).then(r => r.json()).then(console.log);

// POST - Gasto en 12 cuotas
fetch(API, {
  method: 'POST',
  body: JSON.stringify({
    action: 'addExpenseWithInstallments',
    fechaCompra: '2026-01-21',
    montoTotal: 120000,
    cuenta: 'VISA Galicia',
    categoria: 'Tecnología',
    nota: 'Monitor nuevo',
    cantidadCuotas: 12
  })
}).then(r => r.json()).then(console.log);
```

---

## Notas Importantes

### ⚠️ Reglas Críticas

1. **No sobrescribir columnas E y F** en Gastos e Ingresos (contienen fórmulas de conversión)
2. **Formato de fecha**: El API recibe ISO (`yyyy-mm-dd`) y lo convierte a Date de JS
3. **Montos**: Enviar como número, NO como string con símbolos
4. **Cuotas**: El sistema calcula automáticamente la fecha de cada cuota basándose en el día de cierre de la tarjeta
5. **rowIndex**: Para editar/eliminar, usar el `rowIndex` devuelto por `getAllMovements` o `getRecentMovements`

### Límites de Google Apps Script

- Tiempo de ejecución: 6 minutos máximo
- Llamadas/día: ~20,000 (cuentas gratuitas)
- Considerar cachear datos frecuentes en localStorage

### Sistema de Cuotas

Cuando se registra un gasto en cuotas:
1. Se genera un `idCompra` único
2. Se calcula la fecha de la primera cuota según el día de cierre de la tarjeta
3. Se crean N filas en la hoja Gastos, una por cada cuota
4. Cada fila tiene el mismo `idCompra` para agruparlas
5. La columna I indica "1/12", "2/12", etc.

Para eliminar una compra en cuotas completa, usar `deleteInstallmentsByPurchase` con el `idCompra`.

---

## Historial de Versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| V1 | - | API básica (GET/POST simples) |
| V2 | - | Agregado CRUD completo |
| V3 | Actual | **Sistema de cuotas automáticas**, soporte tarjetas de crédito |
