# CLAUDE.md - Cashé - Finanzas Personales

## Descripción del Proyecto

**Cashé** es una aplicación web para gestión de finanzas personales con soporte para ingresos, gastos (incluyendo cuotas automáticas de tarjeta de crédito), y transferencias. Utiliza Supabase para autenticación y como base de datos.

**URL de producción**: https://juanmanuellosada.github.io/cashe-frontend/

---

## Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| **React 18** + **Vite** | Frontend SPA |
| **Tailwind CSS** | Estilos |
| **React Router DOM** | Navegación |
| **Supabase** | Autenticación (Google OAuth) + Base de datos PostgreSQL |
| **Recharts** | Gráficos |
| **Lucide React** | Iconos |
| **React Day Picker** + **date-fns** | Selector de fechas |
| **GitHub Pages** | Hosting |
| **Vite PWA Plugin** | Progressive Web App |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (GitHub Pages)                      │
│                                                                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────────┐ │
│  │ Landing │ │ Login/  │ │  Home/  │ │ Análisis│ │Configurac.│ │
│  │         │ │Register │ │Dashboard│ │         │ │           │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────┬─────┘ │
│       └───────────┴───────────┴───────────┴─────────────┘       │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │           SUPABASE             │
              │  ┌──────────┐  ┌────────────┐  │
              │  │   Auth   │  │ PostgreSQL │  │
              │  │  (OAuth) │  │    (DB)    │  │
              │  └──────────┘  └────────────┘  │
              └────────────────────────────────┘
```

---

## Estructura del Proyecto

```
cashe-frontend/
├── .gitignore
├── CLAUDE.md                      # Este archivo
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── manifest.json
├── dist/                          # Build de producción
└── src/
    ├── main.jsx                   # Entry point
    ├── App.jsx                    # Router principal + rutas protegidas
    ├── index.css                  # Estilos globales + Tailwind
    │
    ├── config/
    │   └── supabase.js            # Cliente Supabase
    │
    ├── contexts/
    │   ├── AuthContext.jsx        # Contexto de autenticación
    │   └── ErrorContext.jsx       # Manejo global de errores
    │
    ├── services/
    │   └── supabaseApi.js         # Funciones de autenticación y datos
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
    │   ├── Layout.jsx             # Layout con sidebar
    │   ├── ProtectedRoute.jsx     # HOC para rutas protegidas
    │   ├── Avatar.jsx             # Avatar de usuario
    │   ├── ThemeToggle.jsx        # Dark/Light mode
    │   ├── LoadingSpinner.jsx     # Spinner de carga
    │   ├── Toast.jsx              # Notificaciones
    │   ├── Combobox.jsx           # Select con búsqueda
    │   ├── ConfirmModal.jsx       # Modal de confirmación
    │   ├── ErrorModal.jsx         # Modal de errores
    │   ├── DatePicker.jsx         # Selector de fecha
    │   ├── DateRangePicker.jsx    # Selector de rango de fechas
    │   ├── FilterBar.jsx          # Barra de filtros
    │   ├── MovementsList.jsx      # Lista de movimientos
    │   ├── EditMovementModal.jsx  # Modal para editar
    │   ├── NewMovementModal.jsx   # Modal para nuevo movimiento
    │   ├── CreateCategoryModal.jsx # Modal para crear categoría
    │   ├── SearchButton.jsx       # Botón de búsqueda (Alt+K)
    │   ├── SearchModal.jsx        # Modal de búsqueda
    │   │
    │   ├── forms/
    │   │   ├── MovementForm.jsx   # Formulario principal (tabs)
    │   │   ├── IncomeForm.jsx     # Campos de ingreso
    │   │   ├── ExpenseForm.jsx    # Campos de gasto (con cuotas)
    │   │   └── TransferForm.jsx   # Campos de transferencia
    │   │
    │   ├── dashboard/
    │   │   ├── BalanceCard.jsx        # Card de balance total
    │   │   ├── AccountBalances.jsx    # Lista de balances por cuenta
    │   │   ├── QuickStats.jsx         # Estadísticas rápidas
    │   │   ├── RecentMovements.jsx    # Últimos movimientos
    │   │   └── WeeklySummary.jsx      # Resumen semanal
    │   │
    │   └── charts/
    │       ├── BalanceLineChart.jsx     # Evolución del balance
    │       ├── ExpensePieChart.jsx      # Gastos por categoría
    │       └── IncomeExpenseBarChart.jsx # Comparativo mensual
    │
    └── pages/
        ├── Landing.jsx            # Página de bienvenida (pública)
        ├── Login.jsx              # Inicio de sesión
        ├── Register.jsx           # Registro
        ├── ResetPassword.jsx      # Recuperar contraseña
        ├── Home.jsx               # Dashboard principal
        ├── NewMovement.jsx        # Página de nuevo movimiento
        ├── Expenses.jsx           # Listado de gastos
        ├── Income.jsx             # Listado de ingresos
        ├── Transfers.jsx          # Listado de transferencias
        ├── Statistics.jsx         # Estadísticas y gráficos
        ├── Comparador.jsx         # Comparador de períodos
        ├── CategorySummary.jsx    # Resumen por categoría
        ├── CreditCards.jsx        # Gestión de tarjetas de crédito
        ├── Accounts.jsx           # Gestión de cuentas
        └── Categories.jsx         # Gestión de categorías
```

---

## Rutas de la Aplicación

### Rutas Públicas
| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | Landing | Página de bienvenida |
| `/login` | Login | Inicio de sesión |
| `/register` | Register | Registro de usuario |
| `/reset-password` | ResetPassword | Recuperar contraseña |

### Rutas Protegidas (requieren autenticación)
| Ruta | Página | Descripción |
|------|--------|-------------|
| `/home` | Home | Dashboard principal |
| `/nuevo` | NewMovement | Formulario de nuevo movimiento |
| `/gastos` | Expenses | Listado de gastos |
| `/ingresos` | Income | Listado de ingresos |
| `/transferencias` | Transfers | Listado de transferencias |
| `/estadisticas` | Statistics | Gráficos y estadísticas |
| `/comparador` | Comparador | Comparador de períodos |
| `/resumen-categorias` | CategorySummary | Resumen por categoría |
| `/tarjetas` | CreditCards | Gestión de tarjetas |
| `/cuentas` | Accounts | Gestión de cuentas |
| `/categorias` | Categories | Gestión de categorías |

---

## Autenticación (Supabase)

### Configuración
```javascript
// src/config/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Variables de Entorno
```bash
# .env.local
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### Métodos de Autenticación
- Google OAuth (principal)
- Email/Password (alternativo)

---

## Sidebar - Estructura de Navegación

```
📊 ANÁLISIS
   ├── Estadísticas      /estadisticas
   ├── Comparador        /comparador
   └── Por categoría     /resumen-categorias

💰 MOVIMIENTOS
   ├── Gastos            /gastos
   ├── Ingresos          /ingresos
   └── Transferencias    /transferencias

⚙️ CONFIGURACIÓN
   ├── Tarjetas          /tarjetas
   ├── Cuentas           /cuentas
   └── Categorías        /categorias
```

---

## Funcionalidades Implementadas

### ✅ Core
- [x] Autenticación con Google (Supabase)
- [x] Landing page pública
- [x] Dashboard con resumen financiero
- [x] Registro de ingresos, gastos y transferencias
- [x] Sistema de cuotas automáticas para tarjetas
- [x] Multi-moneda (ARS/USD) con tipo de cambio en tiempo real
- [x] Dark/Light mode

### ✅ Análisis
- [x] Estadísticas con gráficos (Recharts)
- [x] Comparador de períodos
- [x] Resumen por categoría
- [x] Filtros por fecha, cuenta y categoría

### ✅ Gestión
- [x] CRUD de movimientos
- [x] Gestión de cuentas
- [x] Gestión de categorías
- [x] Gestión de tarjetas de crédito
- [x] Búsqueda global (Alt+K)
- [x] Atajos de teclado

### ✅ UX
- [x] PWA instalable
- [x] Responsive (mobile-first)
- [x] Feedback visual (toasts, loaders)
- [x] Empty states

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

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Alt + K` | Abrir búsqueda |
| `?` | Ver atajos disponibles |
| `N` | Nuevo movimiento |

---

## Paleta de Colores

```css
/* Colores principales */
--accent-primary: #14b8a6;  /* Acciones primarias (teal) */
--accent-green: #22c55e;    /* Ingresos, éxito */
--accent-red: #ef4444;      /* Gastos, error */
--accent-blue: #3b82f6;     /* Transferencias, info */

/* Dark Mode */
--bg-primary: #0a0a0a;
--bg-secondary: #141414;
--bg-card: #1a1a1a;
--border: #262626;
--text-primary: #fafafa;
--text-secondary: #a1a1aa;

/* Light Mode */
--bg-primary: #ffffff;
--bg-secondary: #f4f4f5;
--bg-card: #ffffff;
--border: #e4e4e7;
--text-primary: #09090b;
--text-secondary: #71717a;
```

---

## Notas para Desarrollo

### ⚠️ Reglas Críticas
1. **Formato de fecha**: ISO `yyyy-mm-dd`
2. **Montos**: Enviar como número, sin símbolos
3. Las consultas a Supabase requieren que el usuario esté autenticado (RLS habilitado)

### Sistema de Cuotas
1. Se genera `idCompra` único
2. Se calcula fecha según día de cierre de tarjeta
3. Se crean N filas con el mismo `idCompra`
4. Eliminar con `deleteInstallmentsByPurchase`