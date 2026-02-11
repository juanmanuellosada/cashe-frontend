# 📚 Ejemplos de Uso - EvilCharts

## 🚀 Quick Start

### Importar Componentes
```jsx
// Gráficos
import BalanceLineChart from '@/components/charts/BalanceLineChart';
import ExpensePieChart from '@/components/charts/ExpensePieChart';
import IncomeExpenseBarChart from '@/components/charts/IncomeExpenseBarChart';
import StackedAreaChart from '@/components/charts/StackedAreaChart';

// UI Components (si necesitas custom charts)
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ChartContainer, ChartTooltip } from '@/components/ui/Chart';
import { Badge } from '@/components/ui/Badge';
```

---

## 📊 BalanceLineChart

### Ejemplo Básico
```jsx
function MyDashboard() {
  const balanceData = [
    { month: 'Ene', balance: 50000 },
    { month: 'Feb', balance: 65000 },
    { month: 'Mar', balance: 48000 },
    { month: 'Abr', balance: 72000 },
    { month: 'May', balance: 85000 },
    { month: 'Jun', balance: 95000 },
  ];

  return (
    <BalanceLineChart
      data={balanceData}
      loading={false}
      currency="ARS"
    />
  );
}
```

### Con Loading State
```jsx
function MyDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchBalanceData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <BalanceLineChart
      data={data}
      loading={loading}
      currency="ARS"
    />
  );
}
```

### Formato de Datos
```typescript
interface BalanceData {
  month: string;      // "Ene", "Feb", etc.
  balance: number;    // 50000, -25000, etc.
}
```

**Notas:**
- ✅ `balance` puede ser negativo (se mostrará en rojo)
- ✅ Detecta tendencia automáticamente
- ✅ Badge con porcentaje de cambio
- ✅ Tooltip con formato de moneda

---

## 🥧 ExpensePieChart

### Ejemplo Básico
```jsx
function ExpensesDashboard() {
  const expensesData = [
    {
      name: 'Comida',
      value: 15000,
      percentage: 30,
      icon: '🍔'  // Emoji
    },
    {
      name: 'Transporte',
      value: 8000,
      percentage: 16,
      icon: '🚗'
    },
    {
      name: 'Hogar',
      value: 12000,
      percentage: 24,
      icon: '🏠'
    },
    {
      name: 'Servicios',
      value: 7000,
      percentage: 14,
      icon: '/icons/services.svg'  // SVG custom
    },
    {
      name: 'Entretenimiento',
      value: 8000,
      percentage: 16,
      icon: '🎬'
    },
  ];

  return (
    <ExpensePieChart
      data={expensesData}
      loading={false}
      currency="ARS"
    />
  );
}
```

### Con Click Handler
```jsx
function ExpensesDashboard() {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleSliceClick = (categoryName) => {
    console.log('Clicked category:', categoryName);
    setSelectedCategory(categoryName);
    // Navegar a detalle, filtrar tabla, etc.
  };

  return (
    <>
      <ExpensePieChart
        data={expensesData}
        onSliceClick={handleSliceClick}
        currency="ARS"
      />

      {selectedCategory && (
        <div>Mostrando detalles de: {selectedCategory}</div>
      )}
    </>
  );
}
```

### Formato de Datos
```typescript
interface ExpenseData {
  name: string;        // "Comida", "Transporte", etc.
  value: number;       // 15000, 8000, etc.
  percentage: number;  // 30, 16, etc. (opcional pero recomendado)
  icon?: string;       // Emoji o path a SVG/PNG
}
```

**Notas:**
- ✅ Máximo 6 categorías en leyenda
- ✅ Soporta iconos custom (emoji o SVG)
- ✅ Labels con porcentajes dentro del pie
- ✅ Click en sección para filtrar (opcional)

---

## 📊 IncomeExpenseBarChart

### Ejemplo Básico
```jsx
function ComparativeDashboard() {
  const monthlyData = [
    { month: 'Ene', ingresos: 100000, gastos: 75000 },
    { month: 'Feb', ingresos: 120000, gastos: 85000 },
    { month: 'Mar', ingresos: 95000, gastos: 95000 },
    { month: 'Abr', ingresos: 130000, gastos: 70000 },
    { month: 'May', ingresos: 110000, gastos: 90000 },
    { month: 'Jun', ingresos: 140000, gastos: 80000 },
  ];

  return (
    <IncomeExpenseBarChart
      data={monthlyData}
      loading={false}
      currency="ARS"
    />
  );
}
```

### Con Múltiples Monedas
```jsx
function MultiCurrencyDashboard() {
  const [currency, setCurrency] = useState('ARS');
  const [data, setData] = useState([]);

  useEffect(() => {
    // Fetch data según moneda seleccionada
    fetchIncomeExpenseData(currency).then(setData);
  }, [currency]);

  return (
    <div>
      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
        <option value="ARS">Pesos (ARS)</option>
        <option value="USD">Dólares (USD)</option>
      </select>

      <IncomeExpenseBarChart
        data={data}
        currency={currency}
      />
    </div>
  );
}
```

### Formato de Datos
```typescript
interface IncomeExpenseData {
  month: string;     // "Ene", "Feb", etc.
  ingresos: number;  // 100000, 120000, etc.
  gastos: number;    // 75000, 85000, etc.
}
```

**Notas:**
- ✅ Badge con tendencia general
- ✅ Tooltip muestra balance del mes
- ✅ Gradientes en barras
- ✅ Colores: Verde (ingresos), Rojo (gastos)

---

## 🌈 StackedAreaChart

### Ejemplo Básico
```jsx
function CategoryTrendsDashboard() {
  const movements = [
    {
      fecha: '2024-01-15',
      tipo: 'gasto',
      categoria: '🍔 Comida',
      montoPesos: 5000,
      montoDolares: 5,
    },
    {
      fecha: '2024-01-20',
      tipo: 'gasto',
      categoria: '🚗 Transporte',
      montoPesos: 3000,
      montoDolares: 3,
    },
    // ... más movimientos
  ];

  const dateRange = {
    from: new Date('2024-01-01'),
    to: new Date('2024-06-30'),
  };

  const categoryIconMap = {
    'Comida': '🍔',
    'Transporte': '🚗',
    'Hogar': '🏠',
    'Servicios': '📱',
    // ... más categorías
  };

  return (
    <StackedAreaChart
      movements={movements}
      dateRange={dateRange}
      currency="ARS"
      categoryIconMap={categoryIconMap}
    />
  );
}
```

### Con Filtro de Rango de Fechas
```jsx
import { DateRangePicker } from '@/components/DateRangePicker';

function TrendsPage() {
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  return (
    <div>
      <DateRangePicker
        value={dateRange}
        onChange={setDateRange}
      />

      <StackedAreaChart
        movements={allMovements}
        dateRange={dateRange}
        currency="ARS"
      />
    </div>
  );
}
```

### Formato de Datos
```typescript
interface Movement {
  fecha: string;           // ISO date "2024-01-15"
  tipo: 'gasto' | 'ingreso';
  categoria: string;       // "Comida", "Transporte", etc.
  montoPesos: number;      // Monto en pesos
  montoDolares?: number;   // Monto en dólares (opcional)
  monto?: number;          // Alias de montoPesos
}

interface DateRange {
  from: Date;
  to: Date;
}

interface CategoryIconMap {
  [categoryName: string]: string;  // emoji o path
}
```

**Notas:**
- ✅ Top 8 categorías + "Otros"
- ✅ Click en leyenda para toggle
- ✅ Tooltip con totales calculados
- ✅ Gradientes por categoría
- ⚠️ Solo procesa movimientos tipo "gasto"

---

## 🎨 Crear un Gráfico Custom

### Ejemplo: Simple Bar Chart
```jsx
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/Chart';

const chartConfig = {
  value: {
    label: "Valor",
    color: "var(--chart-1)",
  },
};

function MyCustomChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mi Gráfico Custom</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-60">
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--chart-1)" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

### Con Efectos Visuales
```jsx
function MyEnhancedChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gráfico con Efectos</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-60">
          <BarChart data={data}>
            <defs>
              {/* Background Pattern */}
              <pattern
                id="custom-dots"
                x="0"
                y="0"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx="2"
                  cy="2"
                  r="1"
                  fill="var(--border-subtle)"
                />
              </pattern>

              {/* Gradient */}
              <linearGradient id="customGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              </linearGradient>

              {/* Glow Effect */}
              <filter id="custom-glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Apply pattern */}
            <rect x="0" y="0" width="100%" height="100%" fill="url(#custom-dots)" />

            <XAxis dataKey="name" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />

            {/* Apply gradient and glow */}
            <Bar
              dataKey="value"
              fill="url(#customGradient)"
              filter="url(#custom-glow)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

---

## 🎯 Integración en Páginas

### Dashboard Principal
```jsx
// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import BalanceLineChart from '@/components/charts/BalanceLineChart';
import ExpensePieChart from '@/components/charts/ExpensePieChart';
import IncomeExpenseBarChart from '@/components/charts/IncomeExpenseBarChart';

function Home() {
  const [balanceData, setBalanceData] = useState([]);
  const [expensesData, setExpensesData] = useState([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchBalanceData(),
      fetchExpensesData(),
      fetchIncomeExpenseData(),
    ])
      .then(([balance, expenses, incomeExpense]) => {
        setBalanceData(balance);
        setExpensesData(expenses);
        setIncomeExpenseData(incomeExpense);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted">Resumen de tus finanzas</p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BalanceLineChart
          data={balanceData}
          loading={loading}
          currency="ARS"
        />

        <ExpensePieChart
          data={expensesData}
          loading={loading}
          currency="ARS"
        />
      </div>

      {/* Full Width Chart */}
      <IncomeExpenseBarChart
        data={incomeExpenseData}
        loading={loading}
        currency="ARS"
      />
    </div>
  );
}
```

### Página de Estadísticas
```jsx
// src/pages/Statistics.jsx
import { useState } from 'react';
import StackedAreaChart from '@/components/charts/StackedAreaChart';
import { DateRangePicker } from '@/components/DateRangePicker';

function Statistics() {
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  const { movements, loading } = useMovements(dateRange);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <StackedAreaChart
          movements={movements}
          dateRange={dateRange}
          currency="ARS"
        />
      )}
    </div>
  );
}
```

---

## 🎨 Personalización de Colores

### Cambiar Colores en ChartConfig
```jsx
const chartConfig = {
  ventas: {
    label: "Ventas",
    color: "#10b981",  // Green
  },
  compras: {
    label: "Compras",
    color: "#f43f5e",  // Red
  },
  beneficio: {
    label: "Beneficio",
    color: "#14b8a6",  // Teal
  },
};
```

### Usar Variables CSS Custom
```jsx
const chartConfig = {
  primary: {
    label: "Principal",
    color: "var(--accent-primary)",
  },
  secondary: {
    label: "Secundario",
    color: "var(--accent-purple)",
  },
};
```

### Theme-Aware Colors
```jsx
const chartConfig = {
  data: {
    label: "Datos",
    theme: {
      light: "#0ea5e9",  // Blue claro para light mode
      dark: "#38bdf8",   // Blue más claro para dark mode
    },
  },
};
```

---

## 🧪 Testing

### Test con React Testing Library
```jsx
import { render, screen } from '@testing-library/react';
import BalanceLineChart from '@/components/charts/BalanceLineChart';

describe('BalanceLineChart', () => {
  const mockData = [
    { month: 'Ene', balance: 50000 },
    { month: 'Feb', balance: 65000 },
  ];

  it('renders chart with data', () => {
    render(<BalanceLineChart data={mockData} loading={false} />);
    expect(screen.getByText('Evolución del balance')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<BalanceLineChart data={[]} loading={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<BalanceLineChart data={[]} loading={false} />);
    expect(screen.getByText('Sin movimientos para mostrar')).toBeInTheDocument();
  });
});
```

---

## 💡 Tips y Trucos

### 1. Memoizar Datos Pesados
```jsx
const chartData = useMemo(() => {
  return movements
    .filter(m => m.tipo === 'gasto')
    .reduce((acc, m) => {
      // ... procesamiento pesado
      return acc;
    }, []);
}, [movements]);
```

### 2. Lazy Load Charts
```jsx
const BalanceLineChart = lazy(() => import('@/components/charts/BalanceLineChart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <BalanceLineChart data={data} />
    </Suspense>
  );
}
```

### 3. Formato Dinámico
```jsx
const formatCurrency = (value, currency) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency,
  }).format(value);
};
```

### 4. Responsive Heights
```jsx
// Mobile
<ChartContainer className="h-48 sm:h-60 lg:h-80">
  {/* Chart */}
</ChartContainer>
```

### 5. Export Chart as Image
```jsx
import html2canvas from 'html2canvas';

const chartRef = useRef(null);

const exportChart = async () => {
  const canvas = await html2canvas(chartRef.current);
  const link = document.createElement('a');
  link.download = 'chart.png';
  link.href = canvas.toDataURL();
  link.click();
};

return (
  <div ref={chartRef}>
    <BalanceLineChart data={data} />
    <button onClick={exportChart}>Exportar</button>
  </div>
);
```

---

## 🚨 Errores Comunes

### 1. "useChart must be used within ChartContainer"
```jsx
// ❌ Incorrecto
<LineChart>
  <ChartTooltip content={<ChartTooltipContent />} />
</LineChart>

// ✅ Correcto
<ChartContainer config={chartConfig}>
  <LineChart>
    <ChartTooltip content={<ChartTooltipContent />} />
  </LineChart>
</ChartContainer>
```

### 2. Datos vacíos causan crash
```jsx
// ✅ Siempre validar datos
if (!data || data.length === 0) {
  return <EmptyState />;
}
```

### 3. Variables CSS no definidas
```jsx
// Verificar que index.css tenga:
:root {
  --chart-1: var(--accent-primary);
  --chart-2: var(--accent-purple);
  // ...
}
```

### 4. Formato de fecha incorrecto
```jsx
// ❌ Incorrecto
{ fecha: '15/01/2024' }

// ✅ Correcto (ISO)
{ fecha: '2024-01-15' }
```

---

✨ **Ejemplos completos y funcionales**
🎯 **Casos de uso reales**
🧪 **Tests y buenas prácticas**
💡 **Tips para optimización**
🚨 **Solución de problemas comunes**
