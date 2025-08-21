"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler)

// Mapeo de categorías a íconos y colores
const categoryIconMapping = {
  "Sueldo": { icon: Briefcase, color: "#43A047" },
  "Freelance": { icon: Laptop, color: "#81C784" },
  "Inversiones": { icon: TrendingUp, color: "#4CAF50" },
  "Trabajo Extra": { icon: Clock, color: "#66BB6A" },
  "Otros": { icon: MoreHorizontal, color: "#A5D6A7" },
  "Alimentación": { icon: Utensils, color: "#F57C00" },
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
  accounts: 4,
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
  { name: "Alimentación", value: 12000, color: "#F57C00" }, // Changed to specific orange color
  { name: "Transporte", value: 8500, color: "#FF9800" }, // Changed to specific amber color
  { name: "Entretenimiento", value: 4200, color: "#FF5722" }, // Changed to specific deep orange color
  { name: "Servicios", value: 5800, color: "#E91E63" }, // Changed to specific pink color
  { name: "Otros", value: 2000, color: "#9C27B0" }, // Changed to specific purple color
]

const incomesByCategory = [
  { name: "Sueldo", value: 35000, color: "#43A047" }, // Changed to specific green color
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
  const { displayCurrency, formatDisplayAmount, formatOriginalAmount } = useCurrency()
  const { addCategory } = useCategories()
  const { addAccount, getActiveAccounts } = useAccounts()
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
  const [showCalendar, setShowCalendar] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [chartKey, setChartKey] = useState(0) // Para forzar re-render del chart
  const [filters, setFilters] = useState({
    accounts: [] as string[],
    categories: [] as string[],
    types: [] as string[],
    minAmount: "",
    maxAmount: "",
  })

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
    accounts: summaryData.accounts,
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

  const getPeriodComparison = () => {
    if (!dateRange?.from) {
      return "vs período anterior"
    }

    if (dateRange.to) {
      // Rango de fechas
      const currentPeriod = `${format(dateRange.from, "dd/MM", { locale: es })} - ${format(dateRange.to, "dd/MM", { locale: es })}`
      
      // Calcular período anterior con la misma duración
      const duration = dateRange.to.getTime() - dateRange.from.getTime()
      const previousEnd = new Date(dateRange.from.getTime() - 1) // Un día antes del inicio actual
      const previousStart = new Date(previousEnd.getTime() - duration)
      
      const previousPeriod = `${format(previousStart, "dd/MM", { locale: es })} - ${format(previousEnd, "dd/MM", { locale: es })}`
      
      return `vs ${previousPeriod}`
    } else {
      // Fecha única
      const currentPeriod = format(dateRange.from, "dd/MM", { locale: es })
      
      // Período anterior (mismo día del mes anterior, o mes anterior si no es posible)
      const previousDate = new Date(dateRange.from)
      previousDate.setMonth(previousDate.getMonth() - 1)
      
      // Si el día no existe en el mes anterior (ej: 31 de marzo -> 28/29 de febrero)
      if (previousDate.getMonth() === dateRange.from.getMonth() - 2) {
        previousDate.setDate(0) // Último día del mes anterior
      }
      
      const previousPeriod = format(previousDate, "dd/MM", { locale: es })
      
      return `vs ${previousPeriod}`
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
  const periodComparison = getPeriodComparison()

  const lineChartData = {
    labels: convertedMonthlyTrend.map((item) => item.month),
    datasets: [
      {
        label: "Ingresos",
        data: convertedMonthlyTrend.map((item) => item.income),
        borderColor: "#43A047", // Green color for income
        backgroundColor: "rgba(67, 160, 71, 0.1)",
        borderWidth: 4,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: "#43A047",
        pointBorderColor: "#43A047",
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBorderWidth: 2,
      },
      {
        label: "Gastos",
        data: convertedMonthlyTrend.map((item) => item.expenses),
        borderColor: "#F57C00", // Orange color for expenses
        backgroundColor: "rgba(245, 124, 0, 0.1)",
        borderWidth: 4,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: "#F57C00",
        pointBorderColor: "#F57C00",
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBorderWidth: 2,
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

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
        displayColors: true,
        titleFont: {
          size: 14,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 13,
        },
        padding: 12,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.parsed.y, displayCurrency.code)}`,
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
          },
          callback: (value: any) => `$${(value / 1000).toFixed(0)}k`,
        },
      },
    },
  }

  const expensesPieData = {
    labels: convertedExpensesByCategory.map((item) => item.name),
    datasets: [
      {
        data: convertedExpensesByCategory.map((item) => item.value),
        backgroundColor: convertedExpensesByCategory.map((item) => item.color),
        borderColor: "hsl(var(--card))",
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  }

  const incomesPieData = {
    labels: convertedIncomesByCategory.map((item) => item.name),
    datasets: [
      {
        data: convertedIncomesByCategory.map((item) => item.value),
        backgroundColor: convertedIncomesByCategory.map((item) => item.color),
        borderColor: "hsl(var(--card))",
        borderWidth: 2,
        hoverBorderWidth: 3,
      },
    ],
  }

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
        padding: 12,
        callbacks: {
          label: (context: any) => `${context.label}: ${formatCurrency(context.parsed, displayCurrency.code)}`,
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-secondary/10 hover:!border-orange-500 hover:!bg-secondary/10 border-secondary/20 transition-all duration-200 [&>*]:hover:!text-secondary dark:[&>*]:hover:!text-secondary"
                onClick={() => setTransactionModal({ isOpen: true, type: "income" })}
              >
                <ArrowUpRight className="h-4 w-4 text-secondary mr-1" />
                <span className="text-secondary font-medium">Ingreso</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-primary/10 hover:!border-orange-500 hover:!bg-primary/10 border-primary/20 transition-all duration-200 [&>*]:hover:!text-primary dark:[&>*]:hover:!text-primary"
                onClick={() => setTransactionModal({ isOpen: true, type: "expense" })}
              >
                <ArrowDownRight className="h-4 w-4 text-primary mr-1" />
                <span className="text-primary font-medium">Gasto</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-accent/10 hover:!border-orange-500 hover:!bg-accent/10 border-accent/20 transition-all duration-200 [&>*]:hover:!text-accent dark:[&>*]:hover:!text-accent"
                onClick={() => setTransferModalOpen(true)}
              >
                <ArrowRightLeft className="h-4 w-4 text-accent mr-1" />
                <span className="text-accent font-medium">Transferir</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-muted/10 hover:!border-orange-500 hover:!bg-muted/10 border-muted/20 transition-all duration-200 [&>*]:hover:!text-muted-foreground dark:[&>*]:hover:!text-muted-foreground"
                onClick={() => setAccountModalOpen(true)}
              >
                <Plus className="h-4 w-4 text-muted-foreground mr-1" />
                <span className="text-muted-foreground font-medium">Cuenta</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-yellow-500/10 hover:!border-orange-500 hover:!bg-yellow-500/10 border-yellow-500/20 transition-all duration-200 [&>*]:hover:!text-yellow-600 dark:[&>*]:hover:!text-yellow-400"
                onClick={() => setCategoryModalOpen(true)}
              >
                <Tag className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-1" />
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">Categoría</span>
              </Button>
            </div>

            {/* Filtros de fecha y general */}
            <div className="flex items-center gap-2 lg:ml-auto">
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm bg-card hover:!border-orange-500 hover:!bg-card hover:!text-card-foreground dark:hover:!text-white transition-all duration-200">
                    <CalendarIcon className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">{displayLabel.label}</span>
                    <span className="sm:hidden">{displayLabel.shortLabel}</span>
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
                  <div className="p-3">
                    <h4 className="font-medium text-sm mb-3 text-card-foreground">Seleccionar período</h4>
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={es}
                      className="rounded-md border-0"
                    />
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDateRange(undefined)
                          setShowCalendar(false)
                        }}
                        className="flex-1"
                      >
                        Limpiar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowCalendar(false)}
                        disabled={!dateRange?.from}
                        className="flex-1"
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm bg-card hover:!border-orange-500 hover:!bg-card hover:!text-card-foreground dark:hover:!text-white transition-all duration-200 relative">
                    <Filter className="h-4 w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Filtros</span>
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs flex items-center justify-center">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
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

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-card-foreground">Ingresos Totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-secondary">
                {convertedSummaryData.totalIncome}
              </div>
              <p className="text-xs text-muted-foreground">+12% {periodComparison}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-card-foreground">Gastos Totales</CardTitle>
              <TrendingDown className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-primary">
                {convertedSummaryData.totalExpenses}
              </div>
              <p className="text-xs text-muted-foreground">+5% {periodComparison}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-card-foreground">Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-accent">{convertedSummaryData.balance}</div>
              <p className="text-xs text-muted-foreground">Ahorro este período</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg text-card-foreground">Cuentas Activas</CardTitle>
                  <CardDescription className="text-sm">Cuentas configuradas</CardDescription>
                </div>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-card-foreground">{summaryData.accounts}</div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos y movimientos */}
        <div className="space-y-4 sm:space-y-6">
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
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#43A047" }}></div>
                  <span className="text-sm font-medium text-card-foreground">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#F57C00" }}></div>
                  <span className="text-sm font-medium text-card-foreground">Gastos</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos de torta - ahora ocupan todo el ancho */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg text-card-foreground">
                  Gastos por Categoría {dateRange?.from ? `(${displayLabel.shortLabel})` : ''}
                </CardTitle>
                <CardDescription className="text-sm">
                  Total: {formatCurrency(convertedExpensesByCategory.reduce((sum, cat) => sum + cat.value, 0), displayCurrency.code)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] sm:h-[200px] w-full">
                  <Pie data={expensesPieData} options={pieChartOptions} />
                </div>
                <div className="mt-3 sm:mt-4 space-y-2">
                  {convertedExpensesByCategory.map((category, index) => (
                    <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="truncate text-card-foreground">{category.name}</span>
                      </div>
                      <span className="font-medium ml-2 text-card-foreground">{formatCurrency(category.value, displayCurrency.code)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg text-card-foreground">
                  Ingresos por Categoría {dateRange?.from ? `(${displayLabel.shortLabel})` : ''}
                </CardTitle>
                <CardDescription className="text-sm">
                  Total: {formatCurrency(convertedIncomesByCategory.reduce((sum, cat) => sum + cat.value, 0), displayCurrency.code)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[180px] sm:h-[200px] w-full">
                  <Pie data={incomesPieData} options={pieChartOptions} />
                </div>
                <div className="mt-3 sm:mt-4 space-y-2">
                  {convertedIncomesByCategory.map((category, index) => (
                    <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="truncate text-card-foreground">{category.name}</span>
                      </div>
                      <span className="font-medium ml-2 text-card-foreground">{formatCurrency(category.value, displayCurrency.code)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de transacciones */}
      <TransactionModal
        isOpen={transactionModal.isOpen}
        transaction={transactionModal.transaction}
        defaultType={transactionModal.type}
        onClose={() => setTransactionModal({ isOpen: false })}
        onSave={handleCreateTransaction}
      />
      
      {/* Modal de transferencias */}
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
      
      {/* Modal de categorías */}
      <CategoryModal 
        isOpen={categoryModalOpen} 
        onClose={() => setCategoryModalOpen(false)} 
        onSave={handleCategorySave}
        defaultType="expense"
      />
      
      {/* Modal de cuentas */}
      <AccountModal 
        isOpen={accountModalOpen} 
        onClose={() => setAccountModalOpen(false)} 
        onSave={handleAccountSave}
      />
    </DashboardLayout>
  )
}
