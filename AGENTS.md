# AGENTS.md — Cashé

Guía de contexto portable entre agentes de IA. Para convenciones de Claude Code específicas, ver `CLAUDE.md`.

## Qué es Cashé

App web de finanzas personales (gastos, ingresos, transferencias, presupuestos, objetivos, cuotas de tarjeta, transacciones recurrentes). SPA en producción en https://cashe.ar/. Usuario final argentino, UI en español.

## Stack

JavaScript puro, sin TypeScript, sin tests.

- **Frontend**: React 18.3.1 + Vite 6 + React Router DOM 6.22 + Tailwind CSS 3.4
- **Estado**: Zustand 5.0.11 (store único en `src/store/index.js`, hook `useAppStore`) + 4 React Contexts (Auth, Error, Statistics, Zoom)
- **Backend**: Supabase 2.91 (@supabase/supabase-js) — Auth + Postgres con RLS + Edge Functions
- **UI libs**: Framer Motion 12, Recharts 3.6, Lucide React 0.563, class-variance-authority, clsx, tailwind-merge
- **Virtualización**: react-window 2.2.5 + react-virtualized-auto-sizer 2.0.2
- **Fechas**: date-fns 4 + react-day-picker 9
- **PWA**: vite-plugin-pwa 1.2 (Workbox) + push notifications con VAPID
- **Build/Deploy**: GitHub Pages (gh-pages)

## Estructura del repo

```
cashe-frontend/
├── src/
│   ├── components/      # UI (~50 .jsx + subcarpetas: budgets, charts, common, dashboard,
│   │                    #   forms, goals, integrations, recurring, rules, scheduled, table, ui)
│   ├── pages/           # 26 páginas (ver sección Rutas)
│   ├── hooks/           # 18 hooks custom (useAccounts, useBudgets, useFormDraft, useHaptics…)
│   ├── contexts/        # Auth, Error, Statistics, Zoom
│   ├── store/           # Zustand — useAppStore
│   ├── services/        # supabaseApi + cache + whatsappApi, telegramApi, pushNotifications
│   ├── config/          # supabase.js (cliente)
│   ├── data/            # emojis, iconos predefinidos
│   ├── utils/           # format.js
│   └── lib/             # utils.js (clsx + twMerge → cn)
├── supabase/
│   ├── migrations/      # SQL (aplicar vía Dashboard o CLI)
│   └── functions/       # 7 Edge Functions (Deno/TS):
│       │                #   whatsapp-webhook, telegram-webhook,
│       │                #   process-recurring, scheduled-notifications,
│       │                #   monthly-card-reminder, send-due-date-notifications,
│       │                #   send-access-request
│       └── _shared/     # utilidades compartidas entre funciones
├── public/icons/catalog/ # SVG de bancos/billeteras argentinas
├── database/            # schema.sql histórico
├── email-templates/     # templates de Supabase Auth
├── agent_docs/          # docs extensas (schema DB, charts, bots, PWA)
└── .claude/             # config Claude Code + rules path-scoped + skills custom
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Build de producción |
| `npm run preview` | Preview local del build |
| `npm run lint` | ESLint flat config (`eslint.config.js`) |
| `npm run deploy` | Build + deploy a GitHub Pages |

Node recomendado: ≥18. Sin `.nvmrc`, Makefile ni justfile.

## Rutas

**Públicas** (carga inmediata): `/`, `/login`, `/register`, `/reset-password`, `/privacidad`.

**Protegidas** (lazy loading con Suspense):

| Path | Página |
|---|---|
| `/home` | Home (dashboard) |
| `/nuevo` | NewMovement |
| `/gastos` | Expenses |
| `/ingresos` | Income |
| `/transferencias` | Transfers |
| `/tarjetas` | CreditCards |
| `/cuentas` | Accounts |
| `/categorias` | Categories |
| `/adjuntos` | Attachments |
| `/integraciones` | Integrations |
| `/presupuestos` | Budgets |
| `/metas` | Goals |
| `/recurrentes` | Recurring |
| `/programadas` | ScheduledTransactions |
| `/calendario` | Calendar |
| `/reglas` | AutoRules |
| `/resumen-mensual` | MonthlyReport |
| `/configuracion` | Settings |
| `/estadisticas` | Statistics (+ StatisticsProvider) |
| `/comparador` | Comparador (+ StatisticsProvider) |
| `/resumen-categorias` | CategorySummary (+ StatisticsProvider) |

## Convenciones

- **Commits**: conventional commits parcial (`feat:`, `fix:`, `perf:`), en español o inglés. Sin ticket ID en el subject.
- **Branches**: descriptivas, sin patrón fijo. `main` es el branch principal y de producción.
- **Idioma**: UI en español; nombres de variables, tablas y campos en inglés (`movements`, `expense`, `income`).
- **Naming**: componentes PascalCase en `.jsx` con default export; hooks `useXxx` en `.js`; páginas en `src/pages/`.
- **Imports**: relativos (`../services/supabaseApi`), sin alias `@/`.
- **Estilos**: Tailwind utility-first, variantes con `cva` + `cn` (`src/lib/utils.js`). Dark mode via `class` strategy. CSS variables en `src/index.css` son la fuente de verdad de la paleta.

## Reglas críticas

- **Fechas**: siempre formato ISO `yyyy-mm-dd` al persistir.
- **Montos**: número puro, sin símbolos (`$`, `.`, `,`). Formateo solo al render.
- **RLS**: todas las queries corren con Row Level Security habilitada; nunca desactivar. `user_id` es columna obligatoria en todas las tablas de datos del usuario.
- **Cuotas**: eliminar una compra en cuotas hace CASCADE sobre todas las filas de `movements` vinculadas.
- **Multi-moneda**: ARS/USD con tipo de cambio live desde `https://dolarapi.com/v1/dolares`.

## Jerga de dominio

- **movement** — fila de `movements` (tipo `income` o `expense`, con `amount`, `account_id`, `category_id`).
- **transfer** — movimiento entre dos cuentas propias (tabla `transfers`; importes pueden diferir por cambio de moneda).
- **cuota / installment** — pago parcial de compra en cuotas; N filas en `movements` vinculadas a una fila en `installment_purchases`.
- **recurring** — transacción programada en `recurring_transactions` que se genera automáticamente.
- **budget / goal** — metas o límites de gasto por categoría y período.
- **auto rule** — regla con condiciones que sugiere categoría/cuenta al crear movimientos.

## Integraciones externas

- **WhatsApp bot** (Meta Business API) → Edge Function `whatsapp-webhook`. Registra gastos por lenguaje natural con confirmación.
- **Telegram bot** (BotFather) → Edge Function `telegram-webhook`. Mismo flujo con botones inline; sin costo de API.
- **Push notifications** (VAPID, service worker) — variable `VITE_VAPID_PUBLIC_KEY`.
- **Resend** — emails transaccionales desde Edge Functions.
- **DolarAPI** (`dolarapi.com/v1/dolares`) — tipo de cambio en tiempo real.

## Variables de entorno

Ver `.env.example`. Principales: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`. Para dev: `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD`.

## Docs extensas

Temas en profundidad viven en `agent_docs/`:

- `agent_docs/database-schema.md` — Schema completo (15+ tablas), migraciones, RLS.
- `agent_docs/charts-system.md` — Sistema de gráficos (Recharts + EvilCharts + Framer Motion wrappers).
- `agent_docs/bots-architecture.md` — Máquina de estados WhatsApp/Telegram, NLP con Claude, auto-rules.
- `agent_docs/pwa-and-caching.md` — PWA, service worker, stale-while-revalidate, `dataEvents`.

Reglas path-scoped en `.claude/rules/` aplican solo a directorios específicos y se cargan automáticamente.
