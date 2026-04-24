# Charts System — Cashé

Stack de visualización: **Recharts 3.6** como motor de renderizado, **EvilCharts** (componentes copiables,
no npm package) como capa de primitivos, **Framer Motion** para animaciones. Los primitivos viven en
`src/components/ui/`, los charts compuestos en `src/components/charts/`.

---

## Primitivos UI (`src/components/ui/`)

### `Chart.jsx`
Contexto y wrappers centrales de Recharts.

- **`ChartContainer`** — Wrapper con contexto de configuración. Inyecta CSS variables `--chart-1..5`
  en el DOM. Props: `config` (mapa de serie → color/label), `className`.
- **`ChartTooltip`** — Tooltip con payload parsing. Usa `ChartTooltipContent` internamente.
- **`ChartLegend`** — Leyenda con soporte para iconos de categoría (emoji o SVG).

### `Card.jsx`
Sistema de cards: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
Usa CSS variables de Cashé (`--bg-card`, `--border`, etc.).

### `Badge.jsx`
Badges con variantes via `class-variance-authority`: `default`, `secondary`, `destructive`,
`success`, `outline`.

---

## Charts disponibles (`src/components/charts/`)

| Componente | Archivo | Tipo Recharts | Props clave | Cuándo usarlo |
|------------|---------|---------------|-------------|---------------|
| `BalanceLineChart` | BalanceLineChart.jsx | LineChart + AreaChart | `{ data, loading, currency }` — data: `[{month, balance}]` | Evolución del balance en el tiempo |
| `ExpensePieChart` | ExpensePieChart.jsx | PieChart (donut) | `{ data, loading, currency, onSliceClick }` — data: `[{name, value, icon?}]` | Distribución de gastos por categoría |
| `IncomeExpenseBarChart` | IncomeExpenseBarChart.jsx | BarChart (2 series) | `{ data, loading, currency }` — data: `[{month, ingresos, gastos}]` | Comparativo mensual ingresos vs gastos |
| `StackedAreaChart` | StackedAreaChart.jsx | AreaChart apilado | `{ movements, dateRange, currency, categoryIconMap }` | Composición de gastos por categoría en el tiempo |
| `CategoryRadarChart` | CategoryRadarChart.jsx | RadarChart | `{ data, loading, currency, period }` — data: `[{category, actual, promedio}]` | Gastos actuales vs promedio histórico |
| `BudgetProgressChart` | BudgetProgressChart.jsx | RadialBarChart | `{ data, loading, currency }` — data: `[{category, gastado, presupuesto}]` | Progreso contra presupuestos |
| `IncomeExpenseComposedChart` | IncomeExpenseComposedChart.jsx | ComposedChart | `{ data, loading, currency }` — data: `[{month, ingresos, gastos}]` | Barras de ingreso/gasto + línea de balance acumulado |
| `CategoryFlowChart` | CategoryFlowChart.jsx | — | — | Flujo entre categorías |
| `ExpenseHeatmap` | ExpenseHeatmap.jsx | — | — | Heatmap de gastos por día/categoría |
| `ExpenseTreemap` | ExpenseTreemap.jsx | Treemap | — | Proporción de gastos como mapa de árbol |
| `IncomePieChart` | IncomePieChart.jsx | PieChart (donut) | — | Distribución de ingresos por categoría |
| `Sparkline` | Sparkline.jsx | LineChart minimal | — | Minitendencia inline en cards |

> Los 7 primeros son los charts principales documentados en el backup; los últimos 5 existen en
> el directorio pero no tienen documentación detallada en el backup.

---

## Sistema de animación (`src/components/charts/AnimatedChart.jsx`)

Todos los wrappers usan Framer Motion. Respetar `prefers-reduced-motion` es automático via la
config de Framer.

| Wrapper | Efecto | Uso |
|---------|--------|-----|
| `AnimatedChart` | Fade + slide-up (0.5s, ease-out-expo) | Envolver cualquier chart individual |
| `AnimatedChartGroup` | Stagger container (prop `staggerDelay`, default 0.1s) | Grupos de charts |
| `AnimatedChartItem` | Ítem dentro de un group | Hijo de `AnimatedChartGroup` |
| `AnimatedNumber` | Bounce spring (1s) para números | Stats, totales |
| `AnimatedBadge` | Scale 0→1 con bounce | Badges de tendencia |
| `HoverCard` | Lift -4px on hover | Cards interactivas |

Uso típico:

```jsx
<AnimatedChartGroup staggerDelay={0.15}>
  <AnimatedChartItem>
    <BalanceLineChart data={data} currency="ARS" />
  </AnimatedChartItem>
  <AnimatedChartItem>
    <ExpensePieChart data={pieData} currency="ARS" />
  </AnimatedChartItem>
</AnimatedChartGroup>
```

Delay de animación recomendado por chart (en el orden habitual de la página):
`BalanceLineChart` 0s → `ExpensePieChart` 0.1s → `IncomeExpenseBarChart` 0.2s →
`StackedAreaChart` 0.15s → `CategoryRadarChart` 0.2s → `BudgetProgressChart` 0.25s →
`IncomeExpenseComposedChart` 0.4s.

---

## Efectos visuales

### SVG Filters — Glow
```jsx
<defs>
  <filter id="chart-glow">
    <feGaussianBlur stdDeviation="2" result="blur" />
    <feComposite in="SourceGraphic" in2="blur" operator="over" />
  </filter>
</defs>
```
Aplicar con `filter="url(#chart-glow)"` en el elemento SVG.

### Gradientes de área
```jsx
<linearGradient id="gradient-balance" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor="color" stopOpacity={0.8} />
  <stop offset="100%" stopColor="color" stopOpacity={0.3} />
</linearGradient>
```

### Background pattern (dots)
```jsx
<pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
  <circle cx="2" cy="2" r="1" fill="var(--border-subtle)" opacity="0.5" />
</pattern>
```

### CSS Variables de gráficos
Definidas en `src/index.css`. No hardcodear hex en los charts.

```css
--chart-1: var(--accent-primary);   /* Teal */
--chart-2: var(--accent-purple);
--chart-3: var(--accent-blue);
--chart-4: var(--accent-yellow);
--chart-5: var(--accent-cyan);
--chart-income:   var(--accent-green);
--chart-expense:  var(--accent-red);
--chart-transfer: var(--accent-blue);
```

El theming dark/light se maneja via `src/index.css` — `ChartContainer` aplica las variables al
wrapper y los charts las heredan.

---

## Performance

- **Bundle impact total estimado**: ~22 KB gzipped (Recharts ya incluido; EvilCharts ~4 KB;
  Framer Motion ~18 KB).
- Las rutas con charts (`/estadisticas`, `/comparador`, `/resumen-categorias`) usan `React.lazy()`
  + `Suspense` — los chunks `vendor-recharts` y `vendor-motion` solo se descargan cuando el usuario
  navega a esas rutas.
- `AnimatePresence` maneja el unmount suave de charts al cambiar de vista.
- Framer Motion respeta `prefers-reduced-motion` automáticamente.
