# PWA & Caching — Cashé

PWA configurada via `vite-plugin-pwa` (Workbox). El service worker se regenera en cada build y se
activa inmediatamente (`skipWaiting: true`, `clientsClaim: true`). El modo de registro es
`autoUpdate`: el SW nuevo reemplaza al anterior sin intervención del usuario.

---

## Manifest

Definido en `vite.config.js` (generado por `VitePWA`, no hay `manifest.json` separado en `public/`).

Campos principales:
- `name`: "Cashé - Finanzas Personales"
- `short_name`: "Cashé"
- `theme_color`: `#14b8a6` (teal primario)
- `background_color`: `#0a0a0a`
- `display`: `standalone`
- `orientation`: `portrait`
- `categories`: `["finance", "productivity"]`

Iconos: PNG en `public/icons/` desde 72×72 hasta 512×512. Los íconos de 192 y 512 incluyen
purpose `maskable` para íconos adaptativos en Android.

Shortcuts de acceso rápido desde la pantalla de inicio:
| Nombre | URL |
|--------|-----|
| Nuevo Gasto | `/nuevo?type=expense` |
| Nuevo Ingreso | `/nuevo?type=income` |
| Ver Gastos | `/gastos` |
| Estadísticas | `/estadisticas` |

---

## Service Worker (Workbox)

Configurado en `vite.config.js` bajo `workbox`. Precachea todos los assets del build
(`**/*.{js,css,html,ico,png,svg,woff2}`).

Estrategias de runtime por recurso:

| Recurso | Estrategia | Cache name | TTL |
|---------|------------|------------|-----|
| Supabase Auth/REST | Sin interceptar (browser nativo) | — | — |
| DolarAPI (`dolarapi.com`) | StaleWhileRevalidate | `dolar-api-cache` | 30 min |
| Fontshare (`api.fontshare.com`) | CacheFirst | `font-cache` | 1 año |
| Google Apps Script legacy | NetworkFirst | `legacy-api-cache` | 1 hora, timeout 10s |
| Navegación SPA | navigateFallback a `/index.html` | — | — |

**Nota importante**: Supabase no está en las reglas de runtime intencionalmente. Interceptar con
Workbox en una caída de red provoca que `supabase-js` lance `AbortError`. La capa de cache de la
app (`supabaseApi.js`) cubre la historia de datos-frescos sin necesitar el SW.

Importa el handler de push: `importScripts: ['sw-push.js']`.

---

## Push Notifications

**Handler**: `public/sw-push.js` — escucha el evento `push` del service worker, parsea el payload,
y muestra la notificación con `self.registration.showNotification()`.

Estructura del payload push:
```json
{
  "title": "Cashé",
  "body": "Tu tarjeta VISA vence mañana.",
  "icon": "/icons/icon-192.png",
  "badge": "/icons/icon-96.png",
  "tag": "cashe-notification",
  "data": { "url": "/programadas" },
  "actions": [
    { "action": "open", "title": "Ver" },
    { "action": "dismiss", "title": "Cerrar" }
  ]
}
```

**Suscripción frontend**: `src/services/pushNotifications.js`

Funciones principales:
- `isPushSupported()` — verifica soporte del navegador
- `getNotificationPermission()` — retorna 'granted' / 'denied' / 'default'
- `requestNotificationPermission()` — solicita permiso al usuario
- `subscribeToPush(vapidPublicKey)` — crea suscripción PushManager con la clave VAPID

**Variable de entorno requerida**: `VITE_VAPID_PUBLIC_KEY` — la clave pública VAPID se pasa a
`subscribeToPush()` para registrar la suscripción.

Las suscripciones se guardan en Supabase (ver tablas de notificaciones) y las Edge Functions
`send-due-date-notifications` / `scheduled-notifications` usan el endpoint push para enviar.

---

## Cache frontend (`src/services/supabaseApi.js`)

Implementación stale-while-revalidate con deduplicación de requests concurrentes.

Valores reales del código (verificados en `supabaseApi.js`):

| Parámetro | Valor | Comportamiento |
|-----------|-------|----------------|
| `FRESH_DURATION` | 30 s | Datos fresh: no refetch, retorna inmediatamente |
| `STALE_DURATION` | 10 min | Datos stale: retorna inmediatamente + dispara background refresh |
| Ventana de dedup | Mientras el request esté pendiente | Evita requests concurrentes a la misma key |

El background refresh usa `emitQuiet(event)` — solo notifica al suscriptor específico, no cascadea
a `ALL_DATA_CHANGED`. Esto evita recargar el dashboard entero en cada refresh silencioso.

Funciones de gestión de cache:
- `invalidateCache(type)` — invalida la key del recurso + `dashboard`, `movements`, `income`,
  `expense`, `accounts` (según el tipo).
- `clearCache()` — borra todo (usado en logout).

---

## dataEvents (`src/services/dataEvents.js`)

Pub-sub para invalidación cross-components. Exporta:

```javascript
export const DataEvents = {
  EXPENSES_CHANGED:    'expenses_changed',
  INCOMES_CHANGED:     'incomes_changed',
  TRANSFERS_CHANGED:   'transfers_changed',
  ACCOUNTS_CHANGED:    'accounts_changed',
  CATEGORIES_CHANGED:  'categories_changed',
  BUDGETS_CHANGED:     'budgets_changed',
  GOALS_CHANGED:       'goals_changed',
  RECURRING_CHANGED:   'recurring_changed',
  SCHEDULED_CHANGED:   'scheduled_changed',
  RULES_CHANGED:       'rules_changed',
  ALL_DATA_CHANGED:    'all_data_changed',
};
```

Dos variantes de emisión:
- `emit(event)` — notifica suscriptores del evento específico **y** a `ALL_DATA_CHANGED`. Usar
  tras mutaciones iniciadas por el usuario.
- `emitQuiet(event)` — solo notifica el evento específico. Usar para background cache refreshes.

Suscripción en hooks:
```javascript
import { useDataEvent } from '../services/dataEvents';

useDataEvent([DataEvents.ACCOUNTS_CHANGED, DataEvents.CATEGORIES_CHANGED], () => {
  // refetch
});
```
`useDataEvent` maneja cleanup automático al desmontar el componente.

---

## Hooks de UX

### `useOnlineStatus` (`src/hooks/useOnlineStatus.js`)
Trackea conectividad de red via `navigator.onLine` y los eventos `online`/`offline`.
Retorna `{ isOnline, wasOffline }`. `wasOffline` es `true` durante 3 s después de volver online
(útil para mostrar "Conexión restaurada").

### `useHaptics` (`src/hooks/useHaptics.js`)
Feedback táctil via Vibration API. Patterns disponibles:
`light` (10ms), `medium` (20ms), `heavy` (30ms), `success` ([10,50,10]),
`error` ([50,100,50]), `warning` ([30,50,30]), `selection` (5ms), `impact` (15ms).
Verifica soporte con `'vibrate' in navigator` antes de ejecutar.
