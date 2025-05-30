"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import { getSheetData } from "@/lib/googleApi"
import { Skeleton } from "@/components/ui/skeleton"
import { processSpendingTrendsData, ProcessedTrendsData } from "@/lib/dataProcessing"
import { useTranslation } from "react-i18next"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { useRefresh } from "@/contexts/RefreshContext"

// Define props interface
interface SpendingTrendsChartProps {
  spreadsheetId: string
  accessToken: string
}

// Estructura para los datos transformados para Recharts LineChart con múltiples líneas
interface RechartsTrendDataPoint {
  name: string // Label del eje X (e.g., "Ene", "Feb")
  [category: string]: number | string // Llaves dinámicas para cada categoría seleccionada
}

// Paleta de colores para las líneas del gráfico
const LINE_COLORS_LIGHT = ["#2563eb", "#db2777", "#ea580c", "#65a30d", "#7c3aed", "#ca8a04", "#059669", "#e11d48"]
const LINE_COLORS_DARK = ["#3b82f6", "#ec4899", "#f97316", "#84cc16", "#8b5cf6", "#eab308", "#10b981", "#f43f5e"]

export function SpendingTrendsChart({ spreadsheetId, accessToken }: SpendingTrendsChartProps) {
  const { theme } = useTheme()
  const [processedData, setProcessedData] = useState<ProcessedTrendsData | null>(null)
  const [rechartsData, setRechartsData] = useState<RechartsTrendDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()
  const { globalRefreshKey } = useRefresh()

  const [currentPeriod, setCurrentPeriod] = useState<"month" | "year" | "week">("year")
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [popoverOpen, setPopoverOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!spreadsheetId || !accessToken) {
        setError(t("error_faltan_datos_conexion_google"))
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setError(null)
      console.log('Refetch tendencias para Recharts', globalRefreshKey, currentPeriod)
      await new Promise(res => setTimeout(res, 1000))

      try {
        const range = "Transactions!A2:E" // Date, Type, _, Category, Amount
        const result = await getSheetData(accessToken, spreadsheetId, range)

        if (result && result.values) {
          const trends = processSpendingTrendsData(result.values, currentPeriod)
          setProcessedData(trends)
          setAvailableCategories(trends.allCategories)
          // Seleccionar las primeras N categorías o las previamente seleccionadas si existen
          if (selectedCategories.length === 0 && trends.allCategories.length > 0) {
            setSelectedCategories(trends.allCategories.slice(0, Math.min(3, trends.allCategories.length)))
          }
        } else {
          setProcessedData(null)
          setAvailableCategories([])
          setSelectedCategories([])
        }
      } catch (err: any) {
        console.error("Error fetching spending trends data:", err)
        setError(err.message || t("error_cargar_datos_grafico"))
        setProcessedData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [currentPeriod, spreadsheetId, accessToken, globalRefreshKey, t])

  // Efecto para transformar los datos procesados a formato Recharts cuando cambian los datos o las categorías seleccionadas
  useEffect(() => {
    if (processedData && selectedCategories.length > 0) {
      const transformed: RechartsTrendDataPoint[] = processedData.timeLabels.map((timeLabel, index) => {
        const point: RechartsTrendDataPoint = { name: timeLabel }
        processedData.categoryTrends.forEach(catTrend => {
          if (selectedCategories.includes(catTrend.name)) {
            point[catTrend.name] = catTrend.data[index] || 0
          }
        })
        return point
      })
      setRechartsData(transformed)
    } else {
      setRechartsData([])
    }
  }, [processedData, selectedCategories])

  const handleCategorySelection = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }
  
  const lineColors = theme === 'dark' ? LINE_COLORS_DARK : LINE_COLORS_LIGHT

  if (isLoading) {
    return <div className="h-[350px] w-full flex items-center justify-center" aria-busy="true" aria-live="polite"><Skeleton className="h-full w-full" /></div>
  }

  if (error) {
    return <p className="text-red-500 p-4 h-[350px] flex items-center justify-center" role="alert" aria-live="polite">{t("error_cargando_grafico_tendencias")}: {error}</p>
  }

  if (!rechartsData || rechartsData.length === 0) {
    return (
      <div className="h-[350px] flex flex-col items-center justify-center">
         <div className="flex flex-wrap gap-4 mb-4 items-center">
            <Select value={currentPeriod} onValueChange={(value: "week" | "month" | "year") => setCurrentPeriod(value)}>
              <SelectTrigger className="w-auto min-w-[150px]">
                <SelectValue placeholder={t("seleccionar_periodo")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">{t("semana_actual") || "Semana"}</SelectItem>
                <SelectItem value="month">{t("mes_actual") || "Mes"}</SelectItem>
                <SelectItem value="year">{t("ano_actual") || "Año"}</SelectItem>
              </SelectContent>
            </Select>
            {availableCategories.length > 0 && (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-auto min-w-[200px] justify-between">
                    {selectedCategories.length > 0 ? `${selectedCategories.length} ${t("categorias_seleccionadas", { count: selectedCategories.length })}` : t("seleccionar_categorias")}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <ScrollArea className="h-[200px]">
                    <div className="p-4 space-y-2">
                    {availableCategories.map(cat => (
                      <div key={cat} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`cat-${cat}`}
                          checked={selectedCategories.includes(cat)}
                          onCheckedChange={() => handleCategorySelection(cat)}
                        />
                        <label htmlFor={`cat-${cat}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {cat}
                        </label>
                      </div>
                    ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}
        </div>
        <p className="text-muted-foreground p-4 text-center">{t("no_hay_datos_tendencias")}</p>
      </div>
    )
  }

  return (
    <div className="h-[350px] w-full">
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <Select value={currentPeriod} onValueChange={(value: "week" | "month" | "year") => setCurrentPeriod(value)}>
          <SelectTrigger className="w-auto min-w-[150px]">
            <SelectValue placeholder={t("seleccionar_periodo")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">{t("semana_actual") || "Semana"}</SelectItem>
            <SelectItem value="month">{t("mes_actual") || "Mes"}</SelectItem>
            <SelectItem value="year">{t("ano_actual") || "Año"}</SelectItem>
          </SelectContent>
        </Select>

        {availableCategories.length > 0 && (
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-auto min-w-[200px] justify-between">
                {selectedCategories.length > 0 ? `${selectedCategories.length} ${t("categorias_seleccionadas", { count: selectedCategories.length })}` : t("seleccionar_categorias")}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <ScrollArea className="h-[200px]">
                <div className="p-4 space-y-2">
                {availableCategories.map(cat => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`cat-chk-${cat}`} // Ensure unique ID for checkbox
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => handleCategorySelection(cat)}
                    />
                    <label htmlFor={`cat-chk-${cat}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {cat}
                    </label>
                  </div>
                ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={rechartsData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}/>
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke={theme === 'dark' ? "#e5e7eb" : "#374151"} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} stroke={theme === 'dark' ? "#e5e7eb" : "#374151"} tickFormatter={(value) => `$${value.toLocaleString('es-ES')}`} width={80}/>
          <Tooltip
            cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
            contentStyle={{ 
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
            }}
            labelStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              name // El nombre de la categoría ya es correcto
            ]}
          />
          <Legend 
             iconSize={10}
             wrapperStyle={{ 
               paddingTop: '10px',
               color: theme === 'dark' ? '#e5e7eb' : '#374151'
             }}
          />
          {selectedCategories.map((category, index) => (
            <Line 
              key={category} 
              type="monotone" 
              dataKey={category} 
              stroke={lineColors[index % lineColors.length]} 
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
