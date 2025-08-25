"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { modalVariants, formVariants } from "@/lib/animations"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { TimeRangeSelector } from "@/components/TimeRangeSelector"
import { TopExpensesWidget } from "@/components/TopExpensesWidget"
import { DashboardProvider, useDashboard } from "@/components/DashboardContext"
import { DashboardCustomizer } from "@/components/DashboardCustomizer"
import { FloatingActionButton } from "@/components/FloatingActionButton"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  CalendarIcon,
  Filter,
  ChevronDown,
  X,
  Briefcase,
  Laptop,
  Clock,
  Utensils,
  Car,
  Gamepad2,
  Zap,
  Heart,
  GraduationCap,
  MoreHorizontal,
  Tag,
} from "lucide-react"
import { useCurrency } from "@/contexts/currency-context"
import { useCategories } from "@/contexts/categories-context"
import { useAccounts } from "@/contexts/accounts-context"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js"
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Line, Pie } from "react-chartjs-2"
import { formatCurrency } from "@/lib/currency"
import { TransactionModal } from "@/components/transaction-modal"
import { TransferModal } from "@/components/transfer-modal"
import { CategoryModal } from "@/components/category-modal"
import { AccountModal } from "@/components/account-modal"
import { DashboardLayout } from "@/components/dashboard-layout"
import type { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { es } from "date-fns/locale"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler, ChartDataLabels)

// Mapeo de categorías a íconos y colores
const categoryIconMapping = {
  "Sueldo": { icon: Briefcase, color: "#22C55E" },
  "Freelance": { icon: Laptop, color: "#81C784" },
  "Inversiones": { icon: TrendingUp, color: "#4CAF50" },
  "Trabajo Extra": { icon: Clock, color: "#66BB6A" },
  "Otros": { icon: MoreHorizontal, color: "#A5D6A7" },
  "Alimentación": { icon: Utensils, color: "#DC2626" },
  "Transporte": { icon: Car, color: "#FF9800" },
  "Entretenimiento": { icon: Gamepad2, color: "#FFB74D" },
  "Servicios": { icon: Zap, color: "#FFCC02" },
  "Salud": { icon: Heart, color: "#FFA726" },
  "Educación": { icon: GraduationCap, color: "#FF8A65" },
}

// Helper para obtener el ícono y color de una categoría
const getCategoryData = (categoryName: string) => {
  return categoryIconMapping[categoryName as keyof typeof categoryIconMapping] || { icon: Tag, color: "#FFAB91" }
}

// Datos de ejemplo
const summaryData = {
  totalIncome: 45000,
  totalExpenses: 32500,
  balance: 12500,
  savingsRate: 27.8, // (balance / totalIncome) * 100
  expenseRatio: 72.2, // (totalExpenses / totalIncome) * 100
  currency: "ARS",
}

const recentTransactions = [
  {
    id: 1,
    type: "expense",
    description: "Supermercado Coto",
    amount: -2500,
    category: "Alimentación",
    date: "2025-01-15",
    account: "Cuenta Sueldo",
  },
  {
    id: 2,
    type: "income",
    description: "Sueldo Enero",
    amount: 45000,
    category: "Sueldo",
    date: "2025-01-15",
    account: "Cuenta Sueldo",
  },
  {
    id: 3,
    type: "expense",
    description: "Netflix",
    amount: -1200,
    category: "Entretenimiento",
    date: "2025-01-14",
    account: "Tarjeta Crédito",
  },
  {
    id: 4,
    type: "expense",
    description: "Combustible",
    amount: -3500,
    category: "Transporte",
    date: "2025-01-13",
    account: "Efectivo",
  },
  {
    id: 5,
    type: "income",
    description: "Freelance",
    amount: 8000,
    category: "Trabajo Extra",
    date: "2025-01-12",
    account: "Cuenta Sueldo",
  },
]

const expensesByCategory = [
  { name: "Alimentación", value: 12000, color: "#DC2626" }, // Changed to intense red color
  { name: "Transporte", value: 8500, color: "#FF9800" }, // Changed to specific amber color
  { name: "Entretenimiento", value: 4200, color: "#FF5722" }, // Changed to specific deep orange color
  { name: "Servicios", value: 5800, color: "#E91E63" }, // Changed to specific pink color
  { name: "Otros", value: 2000, color: "#9C27B0" }, // Changed to specific purple color
]

const incomesByCategory = [
  { name: "Sueldo", value: 35000, color: "#22C55E" }, // Changed to vivid green color
  { name: "Freelance", value: 8000, color: "#66BB6A" }, // Changed to specific light green color
  { name: "Inversiones", value: 2000, color: "#81C784" }, // Changed to specific lighter green color
]

const monthlyTrend = [
  { month: "Enero", income: 42000, expenses: 28000 },
  { month: "Febrero", income: 38000, expenses: 31000 },
  { month: "Marzo", income: 45000, expenses: 29500 },
  { month: "Abril", income: 47000, expenses: 35000 },
  { month: "Mayo", income: 45000, expenses: 32500 },
  { month: "Junio", income: 48000, expenses: 30000 },
  { month: "Julio", income: 44000, expenses: 33500 },
  { month: "Agosto", income: 46000, expenses: 31000 },
  { month: "Septiembre", income: 49000, expenses: 34000 },
  { month: "Octubre", income: 43000, expenses: 29500 },
  { month: "Noviembre", income: 47500, expenses: 32000 },
  { month: "Diciembre", income: 50000, expenses: 35500 },
]

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  )
}

function DashboardContent() {
  const { displayCurrency, formatDisplayAmount, formatOriginalAmount } = useCurrency()
  const { addCategory } = useCategories()
  const { addAccount, getActiveAccounts } = useAccounts()
  const { widgets } = useDashboard()
  const availableAccounts = getActiveAccounts().map(account => account.name)
  const [transactionModal, setTransactionModal] = useState<{ isOpen: boolean; transaction?: any; type?: string }>({
    isOpen: false,
  })
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2025, 0, 1), // Enero 2025
    to: new Date(2025, 0, 31), // Fin de enero 2025
  })
  const [showFilters, setShowFilters] = useState(false)
  const [chartKey, setChartKey] = useState(0) // Para forzar re-render del chart
  const [filters, setFilters] = useState({
    accounts: [] as string[],
    categories: [] as string[],
    types: [] as string[],
    minAmount: "",
    maxAmount: "",
  })

  // Helper function to check if widget is visible
  const isWidgetVisible = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId)
    return widget?.visible ?? true
  }

  // Helper function to get visible widgets sorted by order
  const getVisibleWidgets = () => {
    return widgets
      .filter(w => w.visible)
      .sort((a, b) => a.order - b.order)
  }

  // Render widget component by ID
  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'balance':
        return (
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-card-foreground">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-accent">{convertedSummaryData.balance}</div>
              <p className="text-xs text-muted-foreground">{displayLabel.shortLabel}</p>
            </CardContent>
          </Card>
        )
      case 'income':
        return (
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-card-foreground">Ingresos Totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-secondary">
                {convertedSummaryData.totalIncome}
              </div>
              <p className="text-xs text-muted-foreground">{displayLabel.shortLabel}</p>
            </CardContent>
          </Card>
        )
      case 'expenses':
        return (
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-card-foreground">Gastos Totales</CardTitle>
              <TrendingDown className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-primary">
                {convertedSummaryData.totalExpenses}
              </div>
              <p className="text-xs text-muted-foreground">{displayLabel.shortLabel}</p>
            </CardContent>
          </Card>
        )
      case 'transactions':
        return (
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-card-foreground">Tasa de Ahorro</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-secondary">{summaryData.savingsRate.toFixed(1).replace('.', ',')}%</div>
              <p className="text-xs text-muted-foreground">Meta: 20%</p>
            </CardContent>
          </Card>
        )
      case 'top-expenses':
        return (
          <TopExpensesWidget 
            expenses={recentTransactions.map(t => ({
              id: t.id.toString(),
              description: t.description,
              amount: t.amount,
              category: t.category || 'Sin categoría',
              date: t.date,
            }))}
            dateRange={dateRange}
            className="xl:col-span-1"
          />
        )
      case 'expenses-categories':
        return (
          <Card className="bg-card border-border">
            <CardHeader className="pb-1">
              <CardTitle className="text-base sm:text-lg text-card-foreground">
                Gastos por categoría {dateRange?.from ? `(${displayLabel.shortLabel})` : ''}
              </CardTitle>
              <CardDescription className="text-sm">
                Total: {formatCurrency(convertedExpensesByCategory.reduce((sum, cat) => sum + cat.value, 0), displayCurrency.code)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] sm:h-[400px] w-full">
                <Pie data={expensesPieData} options={pieChartOptions} />
              </div>
            </CardContent>
          </Card>
        )
      case 'income-categories':
        return (
          <Card className="bg-card border-border">
            <CardHeader className="pb-1">
              <CardTitle className="text-base sm:text-lg text-card-foreground">
                Ingresos por categoría {dateRange?.from ? `(${displayLabel.shortLabel})` : ''}
              </CardTitle>
              <CardDescription className="text-sm">
                Total: {formatCurrency(convertedIncomesByCategory.reduce((sum, cat) => sum + cat.value, 0), displayCurrency.code)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] sm:h-[400px] w-full">
                <Pie data={incomesPieData} options={pieChartOptions} />
              </div>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  // Función para manejar el guardado de categorías
  const handleCategorySave = (categoryData: any) => {
    try {
      console.log("Guardando categoría:", categoryData)
      
      // Agregar la categoría al contexto (se guardará automáticamente en localStorage)
      addCategory({
        name: categoryData.name,
        type: categoryData.type,
        color: categoryData.color,
        icon: categoryData.icon,
        image: categoryData.image
      })
      
      setCategoryModalOpen(false)
      
      // Mostrar notificación de éxito
      const categoryType = categoryData.type === 'income' ? 'ingresos' : 'gastos'
      toast.success("Categoría creada exitosamente", {
        description: `${categoryData.name} - Tipo: ${categoryType}`,
      })
    } catch (error) {
      // Mostrar notificación de error
      toast.error("Error al crear la categoría", {
        description: "Hubo un problema al guardar la categoría. Inténtalo de nuevo.",
      })
    }
  }

  // Función para manejar el guardado de cuentas
  const handleAccountSave = (accountData: any) => {
    try {
      console.log("Guardando cuenta:", accountData)
      
      // Agregar la cuenta al contexto (se guardará automáticamente en localStorage)
      addAccount({
        name: accountData.name,
        balance: accountData.balance,
        currency: accountData.currency,
        type: accountData.type,
        isActive: accountData.isActive,
        description: accountData.description,
        color: accountData.color,
        icon: accountData.icon,
        image: accountData.image
      })
      
      setAccountModalOpen(false)
      
      // Mostrar notificación de éxito
      toast.success("Cuenta creada exitosamente", {
        description: `${accountData.name} - $${accountData.balance.toLocaleString('es-AR')}`,
      })
    } catch (error) {
      // Mostrar notificación de error
      toast.error("Error al crear la cuenta", {
        description: "Hubo un problema al guardar la cuenta. Inténtalo de nuevo.",
      })
    }
  }

  // Función para manejar la creación de transacciones
  const handleCreateTransaction = (transactionData: any) => {
    try {
      console.log("Creando transacción:", transactionData)
      // Aquí se implementaría la lógica para guardar la transacción
      // Por ahora solo cerramos el modal
      setTransactionModal({ isOpen: false })
      
      // Mostrar notificación de éxito
      const transactionType = transactionData.type === 'income' ? 'ingreso' : 'gasto'
      toast.success(
        `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1)} creado exitosamente`,
        {
          description: `${transactionData.description} - $${transactionData.amount.toLocaleString('es-AR')}`,
        }
      )
    } catch (error) {
      // Mostrar notificación de error
      toast.error("Error al crear la transacción", {
        description: "Hubo un problema al guardar la transacción. Inténtalo de nuevo.",
      })
    }
  }

  // Función para manejar el guardado de transferencias
  const handleTransferSave = (transferData: any) => {
    try {
      console.log("Guardando transferencia:", transferData)
      setTransferModalOpen(false)
      
      // Mostrar notificación de éxito
      toast.success("Transferencia creada exitosamente", {
        description: `$${transferData.amount.toLocaleString('es-AR')} transferidos`,
      })
    } catch (error) {
      // Mostrar notificación de error
      toast.error("Error al crear la transferencia", {
        description: "Hubo un problema al guardar la transferencia. Inténtalo de nuevo.",
      })
    }
  }

  // Detectar cambios de tema y forzar actualización del chart
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setChartKey(prev => prev + 1)
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Convert data to display currency
  const convertedSummaryData = {
    totalIncome: formatDisplayAmount(summaryData.totalIncome, summaryData.currency),
    totalExpenses: formatDisplayAmount(summaryData.totalExpenses, summaryData.currency),
    balance: formatDisplayAmount(summaryData.balance, summaryData.currency),
    savingsRate: summaryData.savingsRate,
    currency: displayCurrency.code,
  }

  const convertedExpensesByCategory = expensesByCategory.map(category => ({
    ...category,
    value: parseFloat(formatDisplayAmount(category.value, summaryData.currency).replace(/[^\d.-]/g, ''))
  }))

  const convertedIncomesByCategory = incomesByCategory.map(category => ({
    ...category,
    value: parseFloat(formatDisplayAmount(category.value, summaryData.currency).replace(/[^\d.-]/g, ''))
  }))

  const convertedMonthlyTrend = monthlyTrend.map(month => ({
    ...month,
    income: parseFloat(formatDisplayAmount(month.income, summaryData.currency).replace(/[^\d.-]/g, '')),
    expenses: parseFloat(formatDisplayAmount(month.expenses, summaryData.currency).replace(/[^\d.-]/g, ''))
  }))

  const availableCategories = [
    "Alimentación",
    "Transporte",
    "Entretenimiento",
    "Servicios",
    "Sueldo",
    "Freelance",
    "Inversiones",
    "Trabajo Extra",
  ]
  const availableTypes = ["income", "expense"]

  const handleFilterChange = (type: keyof typeof filters, value: string, checked: boolean) => {
    if (type === "minAmount" || type === "maxAmount") {
      setFilters((prev) => ({ ...prev, [type]: value }))
    } else {
      setFilters((prev) => ({
        ...prev,
        [type]: checked
          ? [...(prev[type] as string[]), value]
          : (prev[type] as string[]).filter((item) => item !== value),
      }))
    }
  }

  const clearFilters = () => {
    setFilters({
      accounts: [],
      categories: [],
      types: [],
      minAmount: "",
      maxAmount: "",
    })
  }

  const getActiveFiltersCount = () => {
    return (
      filters.accounts.length +
      filters.categories.length +
      filters.types.length +
      (filters.minAmount ? 1 : 0) +
      (filters.maxAmount ? 1 : 0)
    )
  }

  const getDisplayLabel = () => {
    if (dateRange?.from) {
      if (dateRange.to) {
        return {
          label: `${format(dateRange.from, "dd/MM/yyyy", { locale: es })} - ${format(dateRange.to, "dd/MM/yyyy", { locale: es })}`,
          shortLabel: `${format(dateRange.from, "dd/MM", { locale: es })} - ${format(dateRange.to, "dd/MM", { locale: es })}`,
        }
      } else {
        return {
          label: format(dateRange.from, "dd/MM/yyyy", { locale: es }),
          shortLabel: format(dateRange.from, "dd/MM", { locale: es }),
        }
      }
    }
    return {
      label: "Seleccionar período",
      shortLabel: "Período",
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2 text-card-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-card-foreground" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, displayCurrency.code)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const displayLabel = getDisplayLabel()
  const activeFiltersCount = getActiveFiltersCount()

  // Función para crear gradientes dinámicos
  const createGradient = (ctx: CanvasRenderingContext2D, color: string) => {
    const gradient = ctx.createRadialGradient(150, 150, 0, 150, 150, 150);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.7, color + 'CC'); // Más opaco en el centro
    gradient.addColorStop(1, color + '80'); // Más transparente en el borde
    return gradient;
  }

  // Función para generar colores con gradientes
  const generateGradientColors = (canvas: HTMLCanvasElement | null, colors: string[]) => {
    if (!canvas) return colors;
    const ctx = canvas.getContext('2d');
    if (!ctx) return colors;
    
    return colors.map(color => createGradient(ctx, color));
  }

  const lineChartData = {
    labels: convertedMonthlyTrend.map((item) => item.month),
    datasets: [
      {
        label: "Ingresos",
        data: convertedMonthlyTrend.map((item) => item.income),
        borderColor: "#22C55E", // Verde más vívido para ingresos
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return 'rgba(34, 197, 94, 0.1)';
          
          // Crear gradiente vertical
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
          gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.2)');
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.05)');
          return gradient;
        },
        borderWidth: 4,
        fill: true, // Área sombreada bajo la línea
        tension: 0.4,
        pointBackgroundColor: "#22C55E",
        pointBorderColor: "#ffffff", // Border blanco para mejor contraste
        pointRadius: 8,
        pointHoverRadius: 12, // Hover gigante
        pointBorderWidth: 4,
        pointHoverBorderWidth: 6,
        // Efectos de brillo en puntos
        pointShadowOffsetX: 2,
        pointShadowOffsetY: 2,
        pointShadowBlur: 8,
        pointShadowColor: 'rgba(34, 197, 94, 0.4)',
        // Animación en puntos
        pointHoverBackgroundColor: "#16A34A",
        pointHoverBorderColor: "#ffffff",
      },
      {
        label: "Gastos",
        data: convertedMonthlyTrend.map((item) => item.expenses),
        borderColor: "#DC2626", // Rojo intenso para gastos
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return 'rgba(220, 38, 38, 0.1)';
          
          // Crear gradiente vertical
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(220, 38, 38, 0.4)');
          gradient.addColorStop(0.5, 'rgba(220, 38, 38, 0.2)');
          gradient.addColorStop(1, 'rgba(220, 38, 38, 0.05)');
          return gradient;
        },
        borderWidth: 4,
        fill: true, // Área sombreada bajo la línea
        tension: 0.4,
        pointBackgroundColor: "#DC2626",
        pointBorderColor: "#ffffff", // Border blanco para mejor contraste
        pointRadius: 8,
        pointHoverRadius: 12, // Hover gigante
        pointBorderWidth: 4,
        pointHoverBorderWidth: 6,
        // Efectos de brillo en puntos
        pointShadowOffsetX: 2,
        pointShadowOffsetY: 2,
        pointShadowBlur: 8,
        pointShadowColor: 'rgba(220, 38, 38, 0.4)',
        // Animación en puntos
        pointHoverBackgroundColor: "#EF4444",
        pointHoverBorderColor: "#ffffff",
      },
    ],
  }

  const getTooltipColors = () => {
    if (typeof window === "undefined")
      return {
        backgroundColor: "#ffffff",
        titleColor: "#000000",
        bodyColor: "#000000",
        borderColor: "#e5e7eb",
      }

    const computedStyle = getComputedStyle(document.documentElement)
    const isDark = document.documentElement.classList.contains("dark")

    return {
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
      titleColor: isDark ? "#f9fafb" : "#111827",
      bodyColor: isDark ? "#f9fafb" : "#111827",
      borderColor: isDark ? "#374151" : "#e5e7eb",
    }
  }

  const getGridColors = () => {
    if (typeof window === "undefined") {
      return {
        gridColor: "rgba(0, 0, 0, 0.2)",
        textColor: "#374151",
      }
    }

    const isDark = document.documentElement.classList.contains("dark")

    return {
      gridColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.2)",
      textColor: isDark ? "#ffffff" : "#374151",
    }
  }

  // Función para obtener colores dinámicos de bordes según el tema
  const getBorderColors = () => {
    if (typeof window === "undefined") {
      return {
        borderColor: "#000000",
        hoverBorderColor: "#000000",
      }
    }

    const isDark = document.documentElement.classList.contains("dark")

    return {
      borderColor: isDark ? "#ffffff" : "#000000",
      hoverBorderColor: isDark ? "#ffffff" : "#000000",
    }
  }

  // Función para obtener colores dinámicos de datalabels según el tema
  const getDataLabelColors = () => {
    if (typeof window === "undefined") {
      return {
        color: "#000000",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderColor: "rgba(0, 0, 0, 0.3)",
        textShadowColor: "rgba(255, 255, 255, 0.8)",
      }
    }

    const isDark = document.documentElement.classList.contains("dark")

    return {
      color: isDark ? "#ffffff" : "#000000",
      backgroundColor: isDark ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.2)",
      borderColor: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
      textShadowColor: isDark ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)",
    }
  }

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    // Animaciones espectaculares
    animation: {
      duration: 2500,
      easing: 'easeInOutQuart' as const,
    },
    // Interacciones avanzadas
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: false, // We'll show custom legend below
      },
      datalabels: {
        display: false, // Quitar los valores arriba de los puntos
      },
      // Tooltips elegantes personalizados
      tooltip: {
        backgroundColor: () => getTooltipColors().backgroundColor,
        titleColor: () => getTooltipColors().titleColor,
        bodyColor: () => getTooltipColors().bodyColor,
        borderColor: () => getTooltipColors().borderColor,
        borderWidth: 2,
        cornerRadius: 12,
        displayColors: true,
        titleFont: {
          size: 16,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 14,
        },
        padding: 16,
        callbacks: {
          title: (context: any) => `${context[0].label}`,
          label: (context: any) => {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y, displayCurrency.code)}`;
          },
          afterBody: (context: any) => {
            const income = context.find((c: any) => c.dataset.label === 'Ingresos')?.parsed.y || 0;
            const expenses = context.find((c: any) => c.dataset.label === 'Gastos')?.parsed.y || 0;
            const balance = income - expenses;
            return `Balance: ${formatCurrency(balance, displayCurrency.code)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: () => getGridColors().gridColor,
          drawBorder: false,
        },
        ticks: {
          color: () => getGridColors().textColor,
          font: {
            size: 12,
            weight: 500,
          },
        },
      },
      y: {
        grid: {
          color: () => getGridColors().gridColor,
          drawBorder: false,
        },
        ticks: {
          color: () => getGridColors().textColor,
          font: {
            size: 12,
            weight: 500,
          },
          callback: (value: any) => {
            // Formato completo sin K
            return `$${value.toLocaleString('es-AR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}`;
          },
        },
      },
    },
    elements: {
      point: {
        radius: 8, // Puntos más grandes
        hoverRadius: 12, // Puntos gigantes al hover
        borderWidth: 4, // Border súper grueso
        hoverBorderWidth: 6, // Border aún más grueso al hover
      },
      line: {
        borderWidth: 4, // Líneas muy gruesas
        tension: 0.4, // Líneas súper curvas
      },
    },
  } as any

  const expensesPieData = {
    labels: convertedExpensesByCategory.map((item) => item.name),
    datasets: [
      {
        data: convertedExpensesByCategory.map((item) => item.value),
        backgroundColor: convertedExpensesByCategory.map((item) => item.color),
        borderColor: () => getBorderColors().borderColor,
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBorderColor: () => getBorderColors().hoverBorderColor,
        hoverOffset: 0, // Se controla desde onHover
        // Efecto de sombra simulado con border
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowBlur: 8,
        shadowColor: 'rgba(0, 0, 0, 0.2)',
      },
    ],
  }

  const incomesPieData = {
    labels: convertedIncomesByCategory.map((item) => item.name),
    datasets: [
      {
        data: convertedIncomesByCategory.map((item) => item.value),
        backgroundColor: convertedIncomesByCategory.map((item) => item.color),
        borderColor: () => getBorderColors().borderColor,
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverBorderColor: () => getBorderColors().hoverBorderColor,
        hoverOffset: 0, // Se controla desde onHover
        // Efecto de sombra simulado con border
        shadowOffsetX: 2,
        shadowOffsetY: 2,
        shadowBlur: 8,
        shadowColor: 'rgba(0, 0, 0, 0.2)',
      },
    ],
  }

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    // Animaciones suaves de entrada
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1500,
      easing: 'easeInOutQuart' as const,
    },
    // Interactividad mejorada
    onHover: (event: any, elements: any, chart: any) => {
      if (elements.length > 0) {
        // Separar el segmento al hacer hover
        chart.data.datasets[0].hoverOffset = 15;
        chart.update('none');
      } else {
        // Restaurar cuando no hay hover
        chart.data.datasets[0].hoverOffset = 0;
        chart.update('none');
      }
    },
    onClick: (event: any, elements: any, chart: any) => {
      if (elements.length > 0) {
        const categoryIndex = elements[0].index;
        const categoryName = chart.data.labels[categoryIndex];
        const categoryValue = chart.data.datasets[0].data[categoryIndex];
        console.log(`Categoría seleccionada: ${categoryName} - ${formatCurrency(categoryValue, displayCurrency.code)}`);
        // Aquí se podría abrir un modal con detalles de la categoría
      }
    },
    layout: {
      padding: {
        top: 80,
        bottom: 40,
        left: 40,
        right: 40
      }
    },
    plugins: {
      legend: {
        display: false, // We'll show custom legend below
      },
      tooltip: {
        backgroundColor: () => getTooltipColors().backgroundColor,
        titleColor: () => getTooltipColors().titleColor,
        bodyColor: () => getTooltipColors().bodyColor,
        borderColor: () => getTooltipColors().borderColor,
        borderWidth: 1,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 13,
        },
        padding: 16,
        // Tooltips más informativos
        callbacks: {
          title: (context: any) => `categoría: ${context[0].label}`,
          label: (context: any) => {
            const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1).replace('.', ',');
            return [
              `Monto: ${formatCurrency(context.parsed, displayCurrency.code)}`,
              `Porcentaje: ${percentage}%`
            ];
          }
        },
      },
      datalabels: {
        display: true,
        color: () => getDataLabelColors().color,
        backgroundColor: () => getDataLabelColors().backgroundColor,
        borderColor: () => getDataLabelColors().borderColor,
        borderRadius: 4,
        borderWidth: 1,
        padding: 6,
        font: {
          size: 12,
          weight: 'bold' as const,
        },
        // Mostrar nombre de categoría, porcentaje y valor
        formatter: (value: number, context: any) => {
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
          const percentage = ((value / total) * 100).toFixed(1).replace('.', ',');
          const amount = formatCurrency(value, displayCurrency.code);
          const categoryName = context.chart.data.labels[context.dataIndex];
          return `${categoryName}\n${percentage}%\n${amount}`;
        },
        textAlign: 'center' as const,
        textShadowColor: () => getDataLabelColors().textShadowColor,
        textShadowBlur: 3,
        // Ajustar posición según el tamaño del segmento
        anchor: (context: any) => {
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
          const percentage = (context.parsed / total) * 100;
          return percentage > 15 ? 'center' : 'end';
        },
        align: (context: any) => {
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
          const percentage = (context.parsed / total) * 100;
          return percentage > 15 ? 'center' : 'end';
        },
        offset: (context: any) => {
          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
          const percentage = (context.parsed / total) * 100;
          return percentage > 15 ? 0 : 10;
        },
      },
    },
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-4">
          {/* Título */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-space-grotesk">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Resumen de tus finanzas personales</p>
          </div>
          
          {/* Controles */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-shrink-0 bg-secondary/10 hover:!border-orange-500 hover:!bg-secondary/10 border-secondary/20 transition-all duration-200 [&>*]:hover:!text-secondary dark:[&>*]:hover:!text-secondary"
                onClick={() => setTransactionModal({ isOpen: true, type: "income" })}
              >
                <ArrowUpRight className="h-4 w-4 text-secondary mr-1" />
                <span className="text-secondary font-medium">Ingreso</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-shrink-0 bg-primary/10 hover:!border-orange-500 hover:!bg-primary/10 border-primary/20 transition-all duration-200 [&>*]:hover:!text-primary dark:[&>*]:hover:!text-primary"
                onClick={() => setTransactionModal({ isOpen: true, type: "expense" })}
              >
                <ArrowDownRight className="h-4 w-4 text-primary mr-1" />
                <span className="text-primary font-medium">Gasto</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-shrink-0 bg-accent/10 hover:!border-orange-500 hover:!bg-accent/10 border-accent/20 transition-all duration-200 [&>*]:hover:!text-accent dark:[&>*]:hover:!text-accent"
                onClick={() => setTransferModalOpen(true)}
              >
                <ArrowRightLeft className="h-4 w-4 text-accent mr-1" />
                <span className="text-accent font-medium">Transferir</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-shrink-0 bg-muted/10 hover:!border-orange-500 hover:!bg-muted/10 border-muted/20 transition-all duration-200 [&>*]:hover:!text-muted-foreground dark:[&>*]:hover:!text-muted-foreground"
                onClick={() => setAccountModalOpen(true)}
              >
                <Plus className="h-4 w-4 text-muted-foreground mr-1" />
                <span className="text-muted-foreground font-medium">Cuenta</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex-shrink-0 bg-yellow-500/10 hover:!border-orange-500 hover:!bg-yellow-500/10 border-yellow-500/20 transition-all duration-200 [&>*]:hover:!text-yellow-600 dark:[&>*]:hover:!text-yellow-400"
                onClick={() => setCategoryModalOpen(true)}
              >
                <Tag className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-1" />
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">Categoría</span>
              </Button>
            </div>

            {/* Filtros de fecha y general */}
            <div className="flex items-center gap-2 lg:ml-auto">
              <TimeRangeSelector 
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
              <DashboardCustomizer />

              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 45,
                      duration: 0.1,
                    }}
                  >
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm bg-card hover:!border-orange-500 hover:!bg-card hover:!text-card-foreground dark:hover:!text-white transition-all duration-200 relative">
                      <Filter className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Filtros</span>
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs flex items-center justify-center">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </motion.div>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 bg-card border-border" align="end">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-sm text-card-foreground">Filtros</h4>
                      {activeFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                          Limpiar todo
                        </Button>
                      )}
                    </div>

                  <div className="space-y-4">
                    {/* Cuentas */}
                    <div>
                      <Label className="text-sm font-medium text-card-foreground">Cuentas</Label>
                      <div className="mt-2 space-y-2">
                        {availableAccounts.map((account) => (
                          <div key={account} className="flex items-center space-x-2">
                            <Checkbox
                              id={`account-${account}`}
                              checked={filters.accounts.includes(account)}
                              onCheckedChange={(checked) => handleFilterChange("accounts", account, checked as boolean)}
                            />
                            <Label htmlFor={`account-${account}`} className="text-sm text-card-foreground">
                              {account}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Categorías */}
                    <div>
                      <Label className="text-sm font-medium text-card-foreground">Categorías</Label>
                      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                        {availableCategories.map((category) => (
                          <div key={category} className="flex items-center space-x-2">
                            <Checkbox
                              id={`category-${category}`}
                              checked={filters.categories.includes(category)}
                              onCheckedChange={(checked) =>
                                handleFilterChange("categories", category, checked as boolean)
                              }
                            />
                            <Label htmlFor={`category-${category}`} className="text-sm text-card-foreground">
                              {category}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tipos */}
                    <div>
                      <Label className="text-sm font-medium text-card-foreground">Tipo de movimiento</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="type-income"
                            checked={filters.types.includes("income")}
                            onCheckedChange={(checked) => handleFilterChange("types", "income", checked as boolean)}
                          />
                          <Label htmlFor="type-income" className="text-sm text-card-foreground">
                            Ingresos
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="type-expense"
                            checked={filters.types.includes("expense")}
                            onCheckedChange={(checked) => handleFilterChange("types", "expense", checked as boolean)}
                          />
                          <Label htmlFor="type-expense" className="text-sm text-card-foreground">
                            Gastos
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Rango de montos */}
                    <div>
                      <Label className="text-sm font-medium text-card-foreground">Rango de montos</Label>
                      <div className="mt-2 flex gap-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Mínimo"
                            type="number"
                            value={filters.minAmount}
                            onChange={(e) => handleFilterChange("minAmount", e.target.value, true)}
                            className="text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Máximo"
                            type="number"
                            value={filters.maxAmount}
                            onChange={(e) => handleFilterChange("maxAmount", e.target.value, true)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button size="sm" variant="outline" onClick={() => setShowFilters(false)} className="flex-1">
                      Cerrar
                    </Button>
                    <Button size="sm" onClick={() => setShowFilters(false)} className="flex-1">
                      Aplicar
                    </Button>
                  </div>
                </div>
                </PopoverContent>
            </Popover>
            </div>
          </div>
        </div>

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.accounts.map((account) => (
              <Badge key={`account-${account}`} variant="secondary" className="text-xs">
                {account}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleFilterChange("accounts", account, false)}
                />
              </Badge>
            ))}
            {filters.categories.map((category) => (
              <Badge key={`category-${category}`} variant="secondary" className="text-xs">
                {category}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleFilterChange("categories", category, false)}
                />
              </Badge>
            ))}
            {filters.types.map((type) => (
              <Badge key={`type-${type}`} variant="secondary" className="text-xs">
                {type === "income" ? "Ingresos" : "Gastos"}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleFilterChange("types", type, false)} />
              </Badge>
            ))}
            {filters.minAmount && (
              <Badge variant="secondary" className="text-xs">
                Min: {formatDisplayAmount(Number(filters.minAmount), summaryData.currency)}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleFilterChange("minAmount", "", true)} />
              </Badge>
            )}
            {filters.maxAmount && (
              <Badge variant="secondary" className="text-xs">
                Max: {formatDisplayAmount(Number(filters.maxAmount), summaryData.currency)}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => handleFilterChange("maxAmount", "", true)} />
              </Badge>
            )}
          </div>
        )}

        {/* Tarjetas de resumen - dinámicamente ordenadas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {getVisibleWidgets()
            .filter(w => w.category === 'summary')
            .map(widget => (
              <div key={widget.id}>
                {renderWidget(widget.id)}
              </div>
            ))}
        </div>

        {/* Gráficos y movimientos */}
        <div className="space-y-6 sm:space-y-8">
          {/* Últimos movimientos - altura limitada */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-card-foreground">Últimos Movimientos</CardTitle>
              <CardDescription className="text-sm">Tus transacciones más recientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto">
              {recentTransactions.map((transaction) => {
                const categoryData = getCategoryData(transaction.category)
                const IconComponent = categoryData.icon
                
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2 sm:p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center"
                        style={{ backgroundColor: categoryData.color }}
                      >
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-xs sm:text-sm truncate text-card-foreground">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {transaction.category} • {transaction.account}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p
                        className={`font-semibold text-xs sm:text-sm ${transaction.type === "income" ? "text-secondary" : "text-primary"}`}
                      >
                        {formatOriginalAmount(transaction.amount, summaryData.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">{transaction.date}</p>
                    </div>
                  </div>
                )
              })}
              <Button variant="ghost" className="w-full text-sm hover:bg-muted/50">
                <Eye className="h-4 w-4 mr-2" />
                Ver todos los movimientos
              </Button>
            </CardContent>
          </Card>

          {/* Evolución mensual */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg text-card-foreground">Evolución mensual de este año</CardTitle>
              <CardDescription className="text-sm">Comparativa de ingresos vs gastos por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px] w-full">
                <Line key={chartKey} data={lineChartData} options={lineChartOptions} />
              </div>
              <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#22C55E" }}></div>
                  <span className="text-sm font-medium text-card-foreground">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#DC2626" }}></div>
                  <span className="text-sm font-medium text-card-foreground">Gastos</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos principales de categorías - ocupan fila completa */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8 sm:mt-10">
            {getVisibleWidgets()
              .filter(w => w.category === 'charts' && (w.id === 'expenses-categories' || w.id === 'income-categories'))
              .map(widget => (
                <div key={widget.id} className="w-full">
                  {renderWidget(widget.id)}
                </div>
              ))}
          </div>

          {/* Otros gráficos y widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {getVisibleWidgets()
              .filter(w => w.category === 'charts' && w.id !== 'expenses-categories' && w.id !== 'income-categories')
              .map(widget => (
                <div key={widget.id}>
                  {renderWidget(widget.id)}
                </div>
              ))}
          </div>

          {/* Floating Action Button */}
          <FloatingActionButton
            onNewIncome={() => setTransactionModal({ isOpen: true, type: "income" })}
            onNewExpense={() => setTransactionModal({ isOpen: true, type: "expense" })}
            onNewTransfer={() => setTransferModalOpen(true)}
            onNewAccount={() => setAccountModalOpen(true)}
            onNewCategory={() => setCategoryModalOpen(true)}
          />
        </div>
      </div>

      {/* Modales */}
      <TransactionModal
        isOpen={transactionModal.isOpen}
        transaction={transactionModal.transaction}
        defaultType={transactionModal.type}
        onClose={() => setTransactionModal({ isOpen: false })}
        onSave={handleCreateTransaction}
      />
      
      <TransferModal 
        isOpen={transferModalOpen} 
        onClose={() => setTransferModalOpen(false)} 
        onSave={handleTransferSave}
        accounts={getActiveAccounts().map(account => ({
          name: account.name,
          currency: account.currency,
          balance: account.balance,
          id: parseInt(account.id) || 0,
          color: account.color,
          icon: account.icon,
          image: account.image || undefined,
          type: account.type
        }))}
        exchangeRates={{ "USD": 1, "EUR": 0.85, "GBP": 0.75 }}
      />
      
      <CategoryModal 
        isOpen={categoryModalOpen} 
        onClose={() => setCategoryModalOpen(false)} 
        onSave={handleCategorySave}
        defaultType="expense"
      />
      
      <AccountModal 
        isOpen={accountModalOpen} 
        onClose={() => setAccountModalOpen(false)} 
        onSave={handleAccountSave}
      />
    </DashboardLayout>
  )
}
