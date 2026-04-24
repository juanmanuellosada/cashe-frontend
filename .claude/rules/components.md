---
paths:
  - src/components/**
  - src/pages/**
---

# Reglas — Componentes y páginas

## Naming y estructura

- PascalCase en `.jsx`, default export, props destructurados en la firma.
- Hook privado al componente: en el mismo archivo si es <40 líneas; de lo contrario moverlo a `src/hooks/`.
- Páginas en `src/pages/` reciben props de ruta; la lógica de datos vive en hooks custom o en el store.

## Imports

- Relativos (`../services/supabaseApi`, `./ui/Card`). Sin alias `@/`.
- Orden: React primero, libs externas, módulos del proyecto, relativos, estilos.

## UI base

- `src/components/ui/` tiene primitivos tipo shadcn: `Card`, `Badge`, `Chart`. Preferirlos sobre estilos ad-hoc.
- Tailwind utility-first. Combinar clases con `cn()` de `src/lib/utils.js` (wrapper de `clsx` + `tailwind-merge`).
- Variantes con `class-variance-authority` (`cva`) para componentes con variantes declarativas.

## Modales

- Patrón `ConfirmModal`, `EditXxxModal`, `NewXxxModal`. Props típicos: `open`, `onClose`, `onConfirm`, data del item.
- Usar `ConfirmModal` para confirmaciones destructivas en vez de `window.confirm`.

## Animaciones

- Framer Motion vía wrappers de `src/components/charts/AnimatedChart.jsx`:
  `AnimatedChart`, `AnimatedChartGroup`, `AnimatedChartItem`, `AnimatedNumber`, `AnimatedBadge`, `HoverCard`.
- No usar `motion.*` directo salvo causa específica.
- Los wrappers ya respetan `prefers-reduced-motion`.

## Gráficos

- Recharts 3.6.0 + sistema EvilCharts en `src/components/ui/Chart.jsx`.
- CSS variables de theming: `--chart-1` a `--chart-5`, `--chart-income`, `--chart-expense`, `--chart-transfer`.
- SVG filters (glow), gradientes y background patterns: ver catálogo en `CLAUDE.md`.

## Iconos

- Lucide React para iconos genéricos.
- SVG custom de bancos/billeteras en `/public/icons/catalog/`.
- Helper de resolución: `getIconCatalogUrl` en `src/hooks/useIconCatalog.js`.

## Listas grandes

- Virtualizar con `react-window` + `react-virtualized-auto-sizer` para listados >100 ítems.

## Rutas protegidas

- Envolver con `ProtectedRoute` en `App.jsx`. Carga lazy vía `React.lazy()` + `<Suspense>`.
- No agregar lógica de autenticación dentro de las páginas; delegarla al `AuthContext`.
