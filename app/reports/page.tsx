"use client"

import { useState, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, TrendingUp, TrendingDown, PieChart, LineChart, Target, FileSpreadsheet } from "lucide-react"
import { subMonths, startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns"
import { DateRange } from "react-day-picker"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MultiSelect } from "@/components/multi-select"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { useAccounts } from "@/contexts/accounts-context"
import { useCategories } from "@/contexts/categories-context"
import html2canvas from 'html2canvas'
import { toast } from "sonner"
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
  BarElement,
  Filler,
} from "chart.js"
import { Line, Pie } from "react-chartjs-2"
import { formatCurrency } from "@/lib/format"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
)

// Datos de ejemplo - en una app real vendrían de una API o base de datos
const sampleTransactions = [
  {
    id: "1",
    accountId: "1",
    categoryId: "income-1",
    amount: 45000,
    type: "income" as const,
    date: "2025-08-01",
    description: "Sueldo agosto"
  },
  {
    id: "2",
    accountId: "1",
    categoryId: "expense-1",
    amount: -12000,
    type: "expense" as const,
    date: "2025-08-05",
    description: "Supermercado"
  },
  {
    id: "3",
    accountId: "2",
    categoryId: "expense-2",
    amount: -8500,
    type: "expense" as const,
    date: "2025-08-10",
    description: "Combustible"
  },
  {
    id: "4",
    accountId: "1",
    categoryId: "income-2",
    amount: 15000,
    type: "income" as const,
    date: "2025-08-15",
    description: "Freelance web"
  },
  {
    id: "5",
    accountId: "3",
    categoryId: "expense-3",
    amount: -5000,
    type: "expense" as const,
    date: "2025-07-25",
    description: "Cine"
  },
  {
    id: "6",
    accountId: "1",
    categoryId: "expense-4",
    amount: -3200,
    type: "expense" as const,
    date: "2025-07-20",
    description: "Internet"
  },
  {
    id: "7",
    accountId: "1",
    categoryId: "income-1",
    amount: 45000,
    type: "income" as const,
    date: "2025-07-01",
    description: "Sueldo julio"
  },
  {
    id: "8",
    accountId: "2",
    categoryId: "expense-5",
    amount: -8000,
    type: "expense" as const,
    date: "2025-06-15",
    description: "Médico"
  },
]

export default function ReportsPage() {
  const { accounts, getActiveAccounts } = useAccounts()
  const { categories } = useCategories()
  const reportRef = useRef<HTMLDivElement>(null)
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  })
  
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const exportToPDF = async () => {
    setIsExporting(true)
    
    try {
      // Preparar datos del reporte
      const reportData = {
        // Filtros aplicados
        period: {
          from: dateRange?.from?.toISOString(),
          to: dateRange?.to?.toISOString(),
          display: dateRange?.from && dateRange?.to 
            ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
            : 'Todo el período'
        },
        selectedAccounts: selectedAccounts.length > 0 
          ? accountOptions.filter(acc => selectedAccounts.includes(acc.id))
          : [],
        selectedCategories: selectedCategories.length > 0 
          ? categoryOptions.filter(cat => selectedCategories.includes(cat.id))
          : [],
        accountsDisplay: selectedAccounts.length > 0 
          ? accountOptions.filter(acc => selectedAccounts.includes(acc.id)).map(acc => acc.name).join(', ')
          : 'Todas las cuentas',
        categoriesDisplay: selectedCategories.length > 0 
          ? categoryOptions.filter(cat => selectedCategories.includes(cat.id)).map(cat => cat.name).join(', ')
          : 'Todas las categorías',
        
        // Métricas principales
        metrics,
        
        // Datos para gráficos
        chartData: {
          timeline: timelineData,
          incomeByCategory: Object.fromEntries(categoryAnalysis.incomeByCategory),
          expensesByCategory: Object.fromEntries(categoryAnalysis.expensesByCategory)
        }
      }
      
      console.log('Enviando datos del reporte:', reportData)
      
      // Llamar a la API con POST para enviar los datos
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Error generando PDF: ${response.status}`)
      }
      
      console.log('PDF recibido, iniciando descarga...')
      
      // Descargar el PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte-financiero-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      console.log('Descarga completada')
      
      // Mostrar notificación de éxito
      toast.success("PDF generado exitosamente", {
        description: `Reporte financiero descargado como reporte-financiero-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      })
      
    } catch (error) {
      console.error('Error generando PDF:', error)
      
      // Mostrar notificación de error
      toast.error("Error al generar el PDF", {
        description: error instanceof Error ? error.message : 'Hubo un problema al generar el reporte. Inténtalo de nuevo.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No hay transacciones para exportar')
      return
    }

    try {
      // Crear encabezados del CSV
      const headers = [
        'Fecha',
        'Descripción',
        'Categoría',
        'Cuenta',
        'Tipo',
        'Monto',
        'Moneda'
      ]

      // Convertir transacciones a formato CSV
      const csvData = filteredTransactions.map(transaction => {
        const account = accounts.find(a => a.id === transaction.accountId)
        const category = categories.find(c => c.id === transaction.categoryId)
        
        return [
          format(new Date(transaction.date), 'dd/MM/yyyy'),
          `"${transaction.description}"`,
          `"${category?.name || 'Sin categoría'}"`,
          `"${account?.name || 'Cuenta desconocida'}"`,
          transaction.type === 'income' ? 'Ingreso' : 'Gasto',
          Math.abs(transaction.amount).toFixed(2),
          account?.currency || 'USD'
        ]
      })

      // Combinar encabezados y datos
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.join(','))
      ].join('\n')

      // Agregar BOM para soporte de caracteres especiales
      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      })

      // Crear enlace de descarga
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `transacciones-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`${filteredTransactions.length} transacciones exportadas a CSV`)
    } catch (error) {
      console.error('Error al exportar CSV:', error)
      toast.error('Error al exportar las transacciones')
    }
  }

  // Preparar opciones para los selectores
  const accountOptions = useMemo(() => 
    getActiveAccounts().map(account => ({
      id: account.id,
      name: account.name,
      icon: account.icon,
      color: account.color,
      image: account.image || undefined,
      type: account.type
    })), [getActiveAccounts]
  )

  const categoryOptions = useMemo(() => 
    categories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      image: category.image || undefined,
      type: category.type
    })), [categories]
  )

  // Filtrar transacciones según los criterios seleccionados
  const filteredTransactions = useMemo(() => {
    return sampleTransactions.filter(transaction => {
      // Filtro por fecha
      if (dateRange?.from && dateRange?.to) {
        const transactionDate = new Date(transaction.date)
        if (!isWithinInterval(transactionDate, { start: dateRange.from, end: dateRange.to })) {
          return false
        }
      }

      // Filtro por cuentas
      if (selectedAccounts.length > 0 && !selectedAccounts.includes(transaction.accountId)) {
        return false
      }

      // Filtro por categorías
      if (selectedCategories.length > 0 && !selectedCategories.includes(transaction.categoryId)) {
        return false
      }

      return true
    })
  }, [dateRange, selectedAccounts, selectedCategories])

  // Calcular métricas
  const metrics = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = Math.abs(filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0))
    
    const netIncome = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (netIncome / totalIncome) * 100 : 0

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      savingsRate,
      transactionCount: filteredTransactions.length
    }
  }, [filteredTransactions])

  // Datos para gráfico de ingresos vs gastos por categoría
  const categoryAnalysis = useMemo(() => {
    const incomeByCategory = new Map<string, number>()
    const expensesByCategory = new Map<string, number>()

    filteredTransactions.forEach(transaction => {
      const category = categories.find(c => c.id === transaction.categoryId)
      if (!category) return

      if (transaction.type === 'income') {
        incomeByCategory.set(category.name, (incomeByCategory.get(category.name) || 0) + transaction.amount)
      } else {
        expensesByCategory.set(category.name, (expensesByCategory.get(category.name) || 0) + Math.abs(transaction.amount))
      }
    })

    return { incomeByCategory, expensesByCategory }
  }, [filteredTransactions, categories])

  // Datos para Chart.js
  const getTooltipColors = () => {
    if (typeof window === "undefined") {
      return {
        backgroundColor: "#ffffff",
        titleColor: "#000000",
        bodyColor: "#000000",
        borderColor: "#e5e7eb",
      }
    }

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
        display: false, // Custom legend below
      },
      tooltip: {
        backgroundColor: getTooltipColors().backgroundColor,
        titleColor: getTooltipColors().titleColor,
        bodyColor: getTooltipColors().bodyColor,
        borderColor: getTooltipColors().borderColor,
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
          label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: getGridColors().gridColor,
          drawBorder: false,
        },
        ticks: {
          color: getGridColors().textColor,
          font: {
            size: 12,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: getGridColors().gridColor,
          drawBorder: false,
        },
        ticks: {
          color: getGridColors().textColor,
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return formatCurrency(value)
          }
        },
      },
    }
  }

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Custom legend below
      },
      tooltip: {
        backgroundColor: getTooltipColors().backgroundColor,
        titleColor: getTooltipColors().titleColor,
        bodyColor: getTooltipColors().bodyColor,
        borderColor: getTooltipColors().borderColor,
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
          label: (context: any) => `${context.label}: ${formatCurrency(context.parsed)}`,
        },
      },
    },
  }

  // Gráfico de ingresos por categoría
  const incomeChartData = {
    labels: Array.from(categoryAnalysis.incomeByCategory.keys()),
    datasets: [{
      data: Array.from(categoryAnalysis.incomeByCategory.values()),
      backgroundColor: Array.from(categoryAnalysis.incomeByCategory.keys()).map((_, index) => {
        const colors = [
          "#43A047", // Green
          "#2E7D32", // Dark Green
          "#66BB6A", // Light Green
          "#388E3C", // Medium Green
          "#81C784", // Very Light Green
          "#4CAF50", // Material Green
        ];
        return colors[index % colors.length];
      }),
      borderColor: "hsl(var(--card))",
      borderWidth: 2,
      hoverBorderWidth: 3,
    }]
  }

  // Gráfico de gastos por categoría
  const expensesChartData = {
    labels: Array.from(categoryAnalysis.expensesByCategory.keys()),
    datasets: [{
      data: Array.from(categoryAnalysis.expensesByCategory.values()),
      backgroundColor: Array.from(categoryAnalysis.expensesByCategory.keys()).map((_, index) => {
        const colors = [
          "#F57C00", // Orange
          "#FF9800", // Light Orange
          "#E65100", // Dark Orange
          "#FF8F00", // Amber Orange
          "#FFB74D", // Very Light Orange
          "#FB8C00", // Medium Orange
        ];
        return colors[index % colors.length];
      }),
      borderColor: "hsl(var(--card))",
      borderWidth: 2,
      hoverBorderWidth: 3,
    }]
  }

  // Gráfico de tendencia temporal
  const timelineData = useMemo(() => {
    const monthlyData = new Map<string, { income: number; expenses: number }>()
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expenses: 0 })
      }
      
      const data = monthlyData.get(monthKey)!
      if (transaction.type === 'income') {
        data.income += transaction.amount
      } else {
        data.expenses += Math.abs(transaction.amount)
      }
    })

    const sortedData = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))

    return {
      labels: sortedData.map(([month]) => {
        const [year, monthNum] = month.split('-')
        const date = new Date(parseInt(year), parseInt(monthNum) - 1)
        return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
      }),
      datasets: [
        {
          label: "Ingresos",
          data: sortedData.map(([, data]) => data.income),
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
          data: sortedData.map(([, data]) => data.expenses),
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
        }
      ]
    }
  }, [filteredTransactions])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={exportToCSV} variant="outline" className="w-full sm:w-auto">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button onClick={exportToPDF} disabled={isExporting} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Generando PDF...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>

        <div ref={reportRef}>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros de Análisis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <DatePickerWithRange
                    value={dateRange}
                    onValueChange={setDateRange}
                    placeholder="Seleccionar período"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cuentas</label>
                  <MultiSelect
                    options={accountOptions}
                    value={selectedAccounts}
                    onValueChange={setSelectedAccounts}
                    placeholder="Todas las cuentas"
                    maxDisplay={2}
                    type="account"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Categorías</label>
                  <MultiSelect
                    options={categoryOptions}
                    value={selectedCategories}
                    onValueChange={setSelectedCategories}
                    placeholder="Todas las categorías"
                    maxDisplay={2}
                    type="category"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Métricas principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
          <Card data-export="stats-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredTransactions.filter(t => t.type === 'income').length} transacciones
              </p>
            </CardContent>
          </Card>

          <Card data-export="stats-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(metrics.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredTransactions.filter(t => t.type === 'expense').length} transacciones
              </p>
            </CardContent>
          </Card>

          <Card data-export="stats-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(metrics.netIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.transactionCount} transacciones totales
              </p>
            </CardContent>
          </Card>

          <Card data-export="stats-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Ahorro</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.savingsRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Del total de ingresos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <Tabs defaultValue="timeline" className="space-y-4 mt-12">
          <div className="overflow-x-auto">
            <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="timeline" className="text-xs sm:text-sm">
                <LineChart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Tendencia</span>
                <span className="sm:hidden">Línea</span>
              </TabsTrigger>
              <TabsTrigger value="income-categories" className="text-xs sm:text-sm">
                <PieChart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Ingresos por Categoría</span>
                <span className="sm:hidden">Ingresos</span>
              </TabsTrigger>
              <TabsTrigger value="expense-categories" className="text-xs sm:text-sm">
                <PieChart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Gastos por Categoría</span>
                <span className="sm:hidden">Gastos</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="timeline" className="space-y-4">
            <Card data-export="chart">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Evolución de Ingresos y Gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] sm:h-[400px]" data-chart="timeline">
                  <Line data={timelineData} options={lineChartOptions} />
                </div>
                {/* Custom Legend */}
                <div className="flex items-center justify-center gap-4 sm:gap-6 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#43A047]"></div>
                    <span className="text-xs sm:text-sm text-muted-foreground">Ingresos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-[#F57C00]"></div>
                    <span className="text-xs sm:text-sm text-muted-foreground">Gastos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income-categories" className="space-y-4">
            <Card data-export="chart">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Distribución de Ingresos por Categoría</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total: {formatCurrency(Array.from(categoryAnalysis.incomeByCategory.values()).reduce((sum, val) => sum + val, 0))}
                </p>
              </CardHeader>
              <CardContent>
                {incomeChartData.labels.length > 0 ? (
                  <>
                    <div className="h-[250px] sm:h-[300px] w-full" data-chart="income">
                      <Pie data={incomeChartData} options={pieChartOptions} />
                    </div>
                    <div className="mt-4 space-y-2">
                      {incomeChartData.labels.map((label, index) => (
                        <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: incomeChartData.datasets[0].backgroundColor[index] }}
                            />
                            <span className="truncate text-card-foreground">{label}</span>
                          </div>
                          <span className="font-medium ml-2 text-card-foreground flex-shrink-0">
                            {formatCurrency(incomeChartData.datasets[0].data[index])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground text-sm">
                    No hay datos de ingresos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expense-categories" className="space-y-4">
            <Card data-export="chart">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Distribución de Gastos por Categoría</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total: {formatCurrency(Array.from(categoryAnalysis.expensesByCategory.values()).reduce((sum, val) => sum + val, 0))}
                </p>
              </CardHeader>
              <CardContent>
                {expensesChartData.labels.length > 0 ? (
                  <>
                    <div className="h-[250px] sm:h-[300px] w-full" data-chart="expenses">
                      <Pie data={expensesChartData} options={pieChartOptions} />
                    </div>
                    <div className="mt-4 space-y-2">
                      {expensesChartData.labels.map((label, index) => (
                        <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: expensesChartData.datasets[0].backgroundColor[index] }}
                            />
                            <span className="truncate text-card-foreground">{label}</span>
                          </div>
                          <span className="font-medium ml-2 text-card-foreground flex-shrink-0">
                            {formatCurrency(expensesChartData.datasets[0].data[index])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[250px] sm:h-[300px] text-muted-foreground text-sm">
                    No hay datos de gastos para mostrar
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}
