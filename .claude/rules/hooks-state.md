---
paths:
  - src/hooks/**
  - src/store/**
  - src/contexts/**
---

# Reglas — Hooks y estado

## Hooks custom (`src/hooks/`)

- Un archivo por hook, naming `useXxx`, default export.
- Un hook = un concern. Si supera ~150 líneas, partir en sub-hooks o mover lógica pura a `src/utils/`.
- **No llamar al cliente supabase-js directo desde hooks de UI.** Pasar siempre por `src/services/supabaseApi.js` para respetar cache y dedup.
- Suscribirse a cambios con `useDataEvent(events, callback)` de `src/services/dataEvents.js` — no polling manual.

## Zustand store (`src/store/index.js`)

Store único `useAppStore` con slices: `accounts`, `categories`, `categoriesWithId`, `movements`, `dashboard`.

**Reglas:**

- **No duplicar datos de servidor en Zustand** — los datos viven en el cache de `supabaseApi`. El store refleja el resultado del último fetch.
- El store se suscribe a `DataEvents` globalmente (al final de `index.js`). No re-suscribir los mismos eventos en hooks/componentes.
- Selectors con función para evitar re-renders: `useAppStore(s => s.accounts)`.
- Mutaciones van a través de las actions del store (`addMovement`, `updateMovement`, `deleteMovement`, `addTransfer`) — incluyen optimistic updates y rollback automático.
- `reset()` en logout (ya lo maneja `AuthContext`).

### Optimistic updates

El store implementa optimistic updates para movements:
1. Inserta ítem con `id: temp_...` y `_optimistic: true`.
2. On success: reemplaza con datos reales del servidor.
3. On error: rollback al estado previo.

No reimplementar este patrón fuera del store.

## React Contexts (`src/contexts/`)

Cuatro contextos con scope claro:

- **`AuthContext`** — sesión Supabase Auth, profile del usuario. Provider en la raíz. Manejar token refresh y expiración de sesión.
- **`ErrorContext`** — error boundary + toasts de error. Usar `useError().showError(err)` para reportar errores no manejados.
- **`StatisticsContext`** — filtros y rango de fechas compartidos entre `/estadisticas`, `/comparador`, `/resumen-categorias`.
- **`ZoomContext`** — nivel de zoom/densidad visual de dashboards.

No crear contextos nuevos salvo que el estado sea genuinamente compartido entre subárboles lejanos. Para estado local, `useState`.

## Hooks utilitarios notables

- `useDataEvent(events, callback)` — suscripción a DataEvents con cleanup automático.
- `useDebounce(value, ms)` — estándar para inputs con side-effects costosos (e.g. evaluación de auto-rules a 400ms).
- `useIconCatalog` — resuelve paths de iconos SVG del catálogo de bancos/billeteras.
