# CLAUDE.md - Cashé - Finanzas Personales

## Descripción del Proyecto

**Cashé** es una aplicación web para gestión de finanzas personales con soporte para ingresos, gastos (incluyendo cuotas automáticas de tarjeta de crédito), y transferencias. Utiliza Supabase para autenticación y como base de datos.

**URL de producción**: https://cashe.ar/

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
              ┌────────────────────────────────────┐
              │           SUPABASE                 │
              │  ┌──────────┐  ┌────────────┐      │
              │  │   Auth   │  │ PostgreSQL │      │
              │  │  (OAuth) │  │    (DB)    │      │
              │  └──────────┘  └────────────┘      │
              └────────────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────────┐
              │         DOLAR API                  │
              │   https://dolarapi.com/v1/dolares  │
              │   (Tipo de cambio en tiempo real)  │
              └────────────────────────────────────┘
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
├── database/
│   └── schema.sql                 # Schema de Supabase
├── email-templates/               # Templates de email de Supabase
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── icons/
│       └── catalog/               # Iconos SVG de bancos/billeteras argentinas
└── src/
    ├── main.jsx                   # Entry point
    ├── App.jsx                    # Router principal + lazy loading
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
    │   ├── supabaseApi.js         # API principal (CRUD, cache, dólar)
    │   ├── iconStorage.js         # Almacenamiento de iconos custom
    │   ├── whatsappApi.js         # API de integración WhatsApp
    │   └── telegramApi.js         # API de integración Telegram
    │
    ├── hooks/
    │   ├── useAccounts.js         # Hook para cuentas
    │   ├── useCategories.js       # Hook para categorías
    │   └── useDashboard.js        # Hook para datos del dashboard
    │
    ├── utils/
    │   └── format.js              # Formateo de números y fechas
    │
    ├── data/
    │   ├── emojis.js              # Lista de emojis para categorías
    │   └── predefinedIcons.js     # Iconos predefinidos (bancos, etc.)
    │
    ├── components/
    │   ├── Layout.jsx             # Layout con sidebar
    │   ├── ProtectedRoute.jsx     # HOC para rutas protegidas
    │   ├── AnimatedBackground.jsx # Fondo animado landing
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
    │   ├── SortDropdown.jsx       # Dropdown de ordenamiento
    │   ├── MovementsList.jsx      # Lista de movimientos
    │   ├── EditMovementModal.jsx  # Modal para editar
    │   ├── NewMovementModal.jsx   # Modal para nuevo movimiento
    │   ├── CreateCategoryModal.jsx # Modal para crear categoría
    │   ├── IconPicker.jsx         # Selector de iconos/emojis
    │   ├── SearchButton.jsx       # Botón de búsqueda (Alt+K)
    │   ├── SearchModal.jsx        # Modal de búsqueda
    │   ├── SessionExpiryWarning.jsx # Aviso de sesión por expirar
    │   │
    │   ├── integrations/
    │   │   ├── WhatsAppLinkSection.jsx # Vinculación de WhatsApp
    │   │   └── TelegramLinkSection.jsx  # Vinculación de Telegram
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
        ├── Categories.jsx         # Gestión de categorías
        └── Integrations.jsx       # Integraciones externas (WhatsApp)
```

---

## Rutas de la Aplicación

### Rutas Públicas (carga inmediata)
| Ruta | Página | Descripción |
|------|--------|-------------|
| `/` | Landing | Página de bienvenida |
| `/login` | Login | Inicio de sesión |
| `/register` | Register | Registro de usuario |
| `/reset-password` | ResetPassword | Recuperar contraseña |

### Rutas Protegidas (lazy loading con Suspense)
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
| `/integraciones` | Integrations | Integraciones externas (WhatsApp) |

---

## Base de Datos (Supabase PostgreSQL)

### Tablas

#### `profiles`
Información de usuarios (extiende auth.users)
| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | NO | - |
| email | text | YES | - |
| full_name | text | YES | - |
| avatar_url | text | YES | - |
| created_at | timestamp | YES | now() |
| updated_at | timestamp | YES | now() |

#### `user_settings`
Configuración por usuario
| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | - |
| default_currency | text | YES | 'ARS' |
| exchange_rate | numeric | YES | 1000 |
| created_at | timestamp | YES | now() |
| updated_at | timestamp | YES | now() |

#### `accounts`
Cuentas del usuario (bancos, billeteras, tarjetas)
| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | - |
| name | text | NO | - |
| currency | text | NO | 'ARS' |
| initial_balance | numeric | YES | 0 |
| account_number | text | YES | - |
| account_type | text | YES | 'Caja de ahorro' |
| is_credit_card | boolean | YES | false |
| closing_day | integer | YES | - |
| icon | text | YES | - |
| hidden_from_balance | boolean | YES | false |
| created_at | timestamp | YES | now() |
| updated_at | timestamp | YES | now() |

#### `categories`
Categorías de ingresos y gastos
| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | - |
| name | text | NO | - |
| type | text | NO | - |
| icon | text | YES | - |
| created_at | timestamp | YES | now() |

#### `movements`
Movimientos (ingresos y gastos)
| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | - |
| type | text | NO | - |
| date | date | NO | CURRENT_DATE |
| amount | numeric | NO | - |
| account_id | uuid | YES | - |
| category_id | uuid | YES | - |
| note | text | YES | - |
| installment_purchase_id | uuid | YES | - |
| installment_number | integer | YES | - |
| total_installments | integer | YES | - |
| created_at | timestamp | YES | now() |
| updated_at | timestamp | YES | now() |

#### `transfers`
Transferencias entre cuentas
| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | - |
| date | date | NO | CURRENT_DATE |
| from_account_id | uuid | YES | - |
| to_account_id | uuid | YES | - |
| from_amount | numeric | NO | - |
| to_amount | numeric | NO | - |
| note | text | YES | - |
| created_at | timestamp | YES | now() |
| updated_at | timestamp | YES | now() |

#### `installment_purchases`
Compras en cuotas (tarjeta de crédito)
| Campo | Tipo | Nullable | Default |
|-------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | - |
| description | text | NO | - |
| total_amount | numeric | NO | - |
| installments | integer | NO | - |
| account_id | uuid | YES | - |
| category_id | uuid | YES | - |
| start_date | date | NO | - |
| created_at | timestamp | YES | now() |

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

⚙️ AJUSTES
   ├── Tarjetas          /tarjetas
   ├── Cuentas           /cuentas
   ├── Categorías        /categorias
   └── Integraciones     /integraciones
```

---

## Funcionalidades Implementadas

### ✅ Core
- [x] Autenticación con Google (Supabase)
- [x] Landing page pública con fondo animado
- [x] Dashboard con resumen financiero
- [x] Registro de ingresos, gastos y transferencias
- [x] Sistema de cuotas automáticas para tarjetas
- [x] Multi-moneda (ARS/USD) con tipo de cambio en tiempo real
- [x] Dark/Light mode
- [x] Aviso de sesión por expirar

### ✅ Análisis
- [x] Estadísticas con gráficos (Recharts)
- [x] Comparador de períodos
- [x] Resumen por categoría
- [x] Filtros por fecha, cuenta y categoría

### ✅ Gestión
- [x] CRUD de movimientos
- [x] Gestión de cuentas con iconos personalizados
- [x] Gestión de categorías con emojis/iconos
- [x] Gestión de tarjetas de crédito
- [x] Búsqueda global (Alt+K)
- [x] Atajos de teclado
- [x] Ordenamiento de listas

### ✅ UX
- [x] PWA instalable
- [x] Responsive (mobile-first)
- [x] Feedback visual (toasts, loaders)
- [x] Empty states
- [x] Lazy loading de rutas protegidas

### ✅ Performance
- [x] Cache de requests con deduplicación
- [x] Lazy loading con React.lazy() y Suspense
- [x] Invalidación selectiva de cache

### ✅ Integraciones
- [x] Bot de WhatsApp con Claude AI para lenguaje natural
- [x] Vinculación de WhatsApp con código de verificación
- [x] Registro de movimientos por mensaje de texto
- [x] Consultas de gastos y saldos por WhatsApp

---

## API de Tipo de Cambio

La app usa [dolarapi.com](https://dolarapi.com) para obtener cotizaciones en tiempo real:

```javascript
// Obtener dólar oficial
const response = await fetch('https://dolarapi.com/v1/dolares/oficial');
// Retorna: { compra, venta, fechaActualizacion }

// Obtener todas las cotizaciones
const response = await fetch('https://dolarapi.com/v1/dolares');
// Retorna array con: oficial, blue, bolsa, crypto, etc.
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
4. **Tipos de cuenta válidos**: 'Caja de ahorro', 'Cuenta corriente', 'Efectivo', 'Inversión', 'Tarjeta de crédito', 'Billetera virtual', 'Otro'
5. **Tipos de categoría**: 'income' | 'expense'
6. **Tipos de movimiento**: 'income' | 'expense'

### Sistema de Cuotas
1. Se crea registro en `installment_purchases`
2. Se generan N filas en `movements` con `installment_purchase_id`
3. Cada cuota tiene `installment_number` y `total_installments`
4. Eliminar compra elimina todas las cuotas (CASCADE)

### Sistema de Cache
```javascript
// Cache de 5 minutos con deduplicación
const CACHE_DURATION = 5 * 60 * 1000;

// Previene requests duplicados concurrentes
withDeduplication(key, fetchFn)

// Invalidar cache selectivamente
invalidateCache('accounts') // Invalida accounts + dashboard + movements
clearCache() // Limpia todo
```

### Categorías por Defecto (nuevos usuarios)
Al registrarse, `initializeUserData()` crea:
- **Ingresos**: 💼 Sueldo, 💰 Freelance, 📈 Inversiones, 🎁 Regalo, 📦 Otros ingresos
- **Gastos**: 🍔 Comida, 🏠 Hogar, 🚗 Transporte, 🎬 Entretenimiento, 🛒 Supermercado, 💊 Salud, 👕 Ropa, 📱 Servicios, 📦 Otros gastos

---

## Iconos de Bancos/Billeteras

La app incluye iconos SVG de entidades financieras argentinas en `/public/icons/catalog/`:
- Bancos: Galicia, Santander, BBVA, Macro, Nación, Provincia, ICBC, HSBC, etc.
- Billeteras: Mercado Pago, Ualá, Naranja X, Brubank, Lemon, Personal Pay, etc.
- Otros: Visa, Mastercard, American Express, PayPal, etc.

---

## Reglas Automáticas de Categorización

### Descripción
Sistema de reglas que sugiere automáticamente categorías y cuentas al crear movimientos, basándose en condiciones definidas por el usuario (nota, monto, cuenta, tipo).

### Base de Datos

**`auto_rules`** - Reglas principales
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK a profiles |
| name | text | Nombre descriptivo |
| is_active | boolean | Activar/desactivar |
| priority | integer | Orden de evaluación (mayor = más prioritario) |
| logic_operator | text | 'AND' \| 'OR' para combinar condiciones |

**`auto_rule_conditions`** - Condiciones de las reglas
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| rule_id | uuid | FK a auto_rules |
| field | text | 'note' \| 'amount' \| 'account_id' \| 'type' |
| operator | text | 'contains' \| 'equals' \| 'starts_with' \| 'ends_with' \| 'greater_than' \| 'less_than' \| 'between' |
| value | text | Valor a comparar |

**`auto_rule_actions`** - Acciones a ejecutar
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| rule_id | uuid | FK a auto_rules |
| field | text | 'category_id' \| 'account_id' |
| value | text | UUID de la categoría o cuenta a asignar |

### Componentes

**Página**: `/reglas` - Editor visual con React Flow (`@xyflow/react`)
- Vista desktop: Grafo con nodos (Trigger → Condiciones → Acciones)
- Vista mobile: Lista de cards expandibles
- Modal para crear/editar reglas

**Archivos**:
```
src/
├── pages/AutoRules.jsx
├── hooks/
│   ├── useAutoRules.js
│   └── useDebounce.js
├── components/rules/
│   ├── RuleFlowEditor.jsx      # Canvas React Flow
│   ├── RuleFlowNode.jsx        # Nodos custom
│   ├── RuleFormModal.jsx       # Modal crear/editar
│   ├── RuleConditionForm.jsx   # Formulario condición
│   ├── RuleActionForm.jsx      # Formulario acción
│   ├── RuleSuggestionBanner.jsx # Banner en forms
│   └── RuleMobileCard.jsx      # Card mobile
```

### API Functions (supabaseApi.js)

```javascript
// Obtener reglas con condiciones y acciones
export const getAutoRules = () => ...

// CRUD
export const createAutoRule = async ({ name, logicOperator, priority, conditions, actions }) => ...
export const updateAutoRule = async (id, data) => ...
export const deleteAutoRule = async (id) => ...
export const toggleAutoRule = async (id, isActive) => ...
export const reorderAutoRules = async (rules) => ...

// Evaluación (usado en forms)
export const evaluateAutoRules = async ({ note, amount, accountId, type }) => ...
```

### Integración en Formularios

Los formularios `ExpenseForm.jsx` e `IncomeForm.jsx` evalúan reglas automáticamente:
1. Debounce de 400ms en nota y monto
2. Llama `evaluateAutoRules()` con datos actuales
3. Si matchea, muestra `RuleSuggestionBanner`
4. Usuario puede aplicar o ignorar la sugerencia

### Ejemplo de Uso

1. Usuario crea regla: "Si nota contiene 'netflix' → Categoría: Servicios"
2. Al escribir "Pago netflix" en un nuevo gasto
3. Aparece banner: "Regla detectada: Netflix mensual"
4. Click en "Aplicar" → categoría se autocompleta

### Cache
- Key: `'autoRules'`
- Evento: `DataEvents.RULES_CHANGED`

---

## Bot de WhatsApp

### Descripción
Permite a los usuarios crear gastos, ingresos, transferencias y hacer consultas usando lenguaje natural a través de WhatsApp.

**✨ Mejoras recientes:**
- **Integración con reglas automáticas**: El bot ahora evalúa las reglas del usuario para auto-sugerir categorías y cuentas
- **Filtrado inteligente de cuentas**: Muestra solo 5-7 cuentas relevantes en vez de todas
- **Excluye tarjetas de crédito** para gastos simples (a menos que se mencionen)
- **Prioriza cuentas con saldo positivo**

### Componentes

#### Base de Datos (Nuevas tablas)

**`whatsapp_users`** - Vincula números de WhatsApp con cuentas de Cashé
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK a profiles |
| phone_number | text | Número en formato +5491123456789 |
| verified | boolean | Si está verificado |
| verification_code | text | Código de 6 dígitos |
| verification_expires_at | timestamptz | Expiración del código |

**`whatsapp_pending_actions`** - Cola de confirmaciones
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| whatsapp_user_id | uuid | FK a whatsapp_users |
| action_type | text | 'movement' \| 'transfer' \| 'query' |
| action_data | jsonb | Datos parseados |
| status | text | 'pending' \| 'confirmed' \| 'cancelled' |
| expires_at | timestamptz | Auto-expira en 10 minutos |

#### Edge Function

**Ubicación**: `supabase/functions/whatsapp-webhook/index.ts`

**Funcionalidad**:
1. Verifica webhook de Meta (GET con hub.verify_token)
2. Recibe mensajes de WhatsApp (POST)
3. Usa Claude API para interpretar lenguaje natural
4. Crea movimientos/transferencias tras confirmación
5. Envía respuestas al usuario

#### Frontend

**Servicio**: `src/services/whatsappApi.js`
- `getWhatsAppStatus()` - Obtener estado de vinculación
- `generateVerificationCode()` - Generar código de 6 dígitos
- `checkWhatsAppVerification()` - Polling para verificación
- `unlinkWhatsApp()` - Desvincular WhatsApp

**Componentes**:
- `src/components/integrations/WhatsAppLinkSection.jsx` - Sección de vinculación
- `src/pages/Integrations.jsx` - Página de integraciones

**Ruta**: `/integraciones`

### Flujo de Vinculación

1. Usuario abre `/integraciones` en la app web
2. Hace click en "Vincular WhatsApp"
3. Se genera código de 6 dígitos (expira en 10 min)
4. Usuario envía código al bot de WhatsApp
5. Bot verifica código y vincula la cuenta
6. Usuario puede empezar a enviar mensajes

### Ejemplos de Uso

```
Usuario: "Gasté 5000 en el super con la visa"
Bot: 📝 *Confirmar gasto:*
     💸 Monto: $5.000
     📁 Categoría: Supermercado
     💳 Cuenta: VISA
     📅 Fecha: Hoy
     ¿Confirmo? (sí/no/editar)

Usuario: "sí"
Bot: ✅ Gasto registrado
```

### Variables de Entorno (Edge Function)

```bash
WHATSAPP_ACCESS_TOKEN      # Token de Meta Business API
WHATSAPP_PHONE_NUMBER_ID   # ID del número de WhatsApp Business
WHATSAPP_VERIFY_TOKEN      # Token personalizado para verificación
ANTHROPIC_API_KEY          # API key de Claude
```

### Deploy

```bash
# Aplicar migración de base de datos
# (ejecutar en Supabase Dashboard o con supabase db push)

# Deploy Edge Function
supabase functions deploy whatsapp-webhook

# Configurar secrets
supabase secrets set WHATSAPP_ACCESS_TOKEN=xxx
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=xxx
supabase secrets set WHATSAPP_VERIFY_TOKEN=xxx
supabase secrets set ANTHROPIC_API_KEY=xxx
```

---

## Bot de Telegram

### Descripción
Bot complementario al de WhatsApp. Permite crear gastos, ingresos, transferencias y hacer consultas usando botones interactivos. **No requiere solicitud de acceso** (es gratis).

### Ventajas sobre WhatsApp
- **Gratis**: Sin costos de API
- **Sin aprobación**: No requiere verificación de Meta
- **Setup simple**: Solo crear bot con BotFather
- **Botones inline**: Más flexibles que WhatsApp

### Base de Datos (Nuevas tablas)

**`telegram_users`** - Vincula cuentas de Telegram con Cashé
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK a profiles |
| telegram_id | bigint | ID numérico de Telegram |
| telegram_username | text | @username (opcional) |
| telegram_first_name | text | Nombre del usuario |
| verified | boolean | Si está verificado |
| verification_code | text | Código de 6 dígitos |

**`telegram_pending_actions`** - Cola de confirmaciones (igual que WhatsApp)

### Edge Function

**Ubicación**: `supabase/functions/telegram-webhook/index.ts`

**Funcionalidad**:
1. Recibe updates del Telegram Bot API
2. Maneja callback queries (botones inline)
3. Misma máquina de estados que WhatsApp
4. Crea movimientos/transferencias tras confirmación

### Frontend

**Servicio**: `src/services/telegramApi.js`
- `getTelegramStatus()` - Estado de vinculación
- `generateTelegramVerificationCode()` - Generar código
- `checkTelegramVerification()` - Polling para verificación
- `unlinkTelegram()` - Desvincular

**Componente**: `src/components/integrations/TelegramLinkSection.jsx`

### Flujo de Vinculación

1. Usuario abre `/integraciones` en la app web
2. Hace click en "Vincular Telegram"
3. Se genera código de 6 dígitos (expira en 10 min)
4. Click en "Abrir Telegram" → deep link `t.me/BOT?start=CODE`
5. Bot verifica código y vincula la cuenta
6. Usuario puede empezar a usar el bot

### Variables de Entorno (Edge Function)

```bash
TELEGRAM_BOT_TOKEN         # Token del bot (de BotFather)
```

### Deploy

```bash
# 1. Crear bot con @BotFather en Telegram
# 2. Obtener token del bot

# 3. Aplicar migración
# (ejecutar database/telegram_schema.sql en Supabase Dashboard)

# 4. Deploy Edge Function
supabase functions deploy telegram-webhook

# 5. Configurar secret
supabase secrets set TELEGRAM_BOT_TOKEN=xxx

# 6. Configurar webhook de Telegram
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook"
```

### Comandos del Bot

| Comando | Acción |
|---------|--------|
| `/start` | Iniciar o vincular cuenta |
| `/menu` | Mostrar menú principal |
| `/cancel` | Cancelar operación actual |
