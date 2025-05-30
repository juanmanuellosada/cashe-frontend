"use client"

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
// import Chart from "chart.js/auto"; // Eliminado Chart.js
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  Sector,
} from "recharts";
import { getSheetData } from "@/lib/googleApi";
import { Skeleton } from "@/components/ui/skeleton";
import { processExpensesByCategoryData } from "@/lib/dataProcessing";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Para los filtros
import { useRefresh } from "@/contexts/RefreshContext";

// Define props interface
interface ExpensesByCategoryChartProps {
  // period: "month" | "year"; // El periodo se manejará localmente ahora
  spreadsheetId: string;
  accessToken: string;
}

// Ajustado para Recharts: array de objetos
interface RechartsCategoryDataPoint {
  name: string;
  value: number;
  // Podríamos añadir más propiedades si es necesario, como un ID o color específico.
}

// Definimos los colores aquí para fácil acceso y consistencia
const DARK_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#84cc16"];
const LIGHT_COLORS = ["#059669", "#2563eb", "#7c3aed", "#db2777", "#e11d48", "#ea580c", "#ca8a04", "#65a30d"];


// Componente para el label customizado de Recharts Pie
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent * 100 < 5) return null; // No mostrar labels para segmentos muy pequeños

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export function ExpensesByCategoryChart({ spreadsheetId, accessToken }: ExpensesByCategoryChartProps) {
  const { theme } = useTheme();
  // Estado para los datos formateados para Recharts
  const [chartData, setChartData] = useState<RechartsCategoryDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { globalRefreshKey } = useRefresh();

  // Estados para los filtros
  const [currentPeriod, setCurrentPeriod] = useState<"month" | "year">("month");
  const [allCategories, setAllCategories] = useState<string[]>([]); // Para el selector de categoría
  const [selectedCategory, setSelectedCategory] = useState<string>("all"); // 'all' o una categoría específica

  useEffect(() => {
    const fetchData = async () => {
      if (!spreadsheetId || !accessToken) return;
      setIsLoading(true);
      setError(null);
      // setChartData(null); // No se está limpiando chartData, considerar si es necesario
      console.log('Refetch expenses chart', globalRefreshKey);
      await new Promise(res => setTimeout(res, 1000)); // <--- CAMBIO AQUÍ
      try {
        const range = "Transactions!A2:E"; // Asumiendo columnas: Date (A), Type (B), Category (D), Amount (E)
        const result = await getSheetData(accessToken, spreadsheetId, range);

        if (result && result.values) {
          // Procesar datos con la función existente
          const processedDataFromLib = processExpensesByCategoryData(result.values, currentPeriod);
          
          // Transformar datos para Recharts
          const rechartsData: RechartsCategoryDataPoint[] = processedDataFromLib.labels.map((label, index) => ({
            name: label,
            value: processedDataFromLib.values[index] || 0,
          }));
          setChartData(rechartsData);

          // Actualizar lista de categorías para el selector (solo la primera vez o si cambian)
          if (allCategories.length === 0 || currentPeriodChanged) { // 'currentPeriodChanged' es una heurística
             const uniqueCategories = Array.from(new Set(processedDataFromLib.labels.filter(l => l !== "Otros")));
             setAllCategories(uniqueCategories);
          }

        } else {
          setChartData([]);
          setAllCategories([]);
        }
      } catch (err: any) {
        console.error("Error fetching category expense data for Recharts:", err);
        setError(`Failed to load chart data: ${err.message}`);
        setChartData([]);
        setAllCategories([]);
      } finally {
        setIsLoading(false);
      }
    };
    let currentPeriodChanged = false; // Pequeña lógica para detectar cambio de periodo

    fetchData();
  }, [currentPeriod, spreadsheetId, accessToken, globalRefreshKey]); // Dependencias actualizadas


  // Lógica para filtrar datos si se selecciona una categoría específica
  const getFilteredData = () => {
    if (selectedCategory === "all" || !chartData) {
      return chartData;
    }
    // Si se selecciona una categoría, mostramos solo esa y el resto agrupado en "Otros"
    const focusedCategoryData = chartData.find(d => d.name === selectedCategory);
    if (!focusedCategoryData) return chartData; // Si no existe la categoría, mostrar todo

    const otherCategoriesValue = chartData
      .filter(d => d.name !== selectedCategory)
      .reduce((acc, curr) => acc + curr.value, 0);

    const filtered = [focusedCategoryData];
    if (otherCategoriesValue > 0) {
      filtered.push({ name: t("otros") || "Otros", value: otherCategoriesValue });
    }
    return filtered;
  };
  
  const displayData = getFilteredData();
  const colors = theme === "dark" ? DARK_COLORS : LIGHT_COLORS;

  if (isLoading) {
    return <div className="h-[350px] w-full flex items-center justify-center" aria-busy="true" aria-live="polite"><Skeleton className="h-48 w-48 rounded-full" /></div>;
  }

  if (error) {
    return <p className="text-red-500 p-4 h-[350px] flex items-center justify-center" role="alert" aria-live="polite">{t("error_cargando_grafico")}: {t(error)}</p>;
  }
   if (!displayData || displayData.length === 0) {
     return (
        <div className="h-[350px] flex flex-col items-center justify-center">
          <div className="flex gap-4 mb-4">
            <Select value={currentPeriod} onValueChange={(value: "month" | "year") => setCurrentPeriod(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("seleccionar_periodo")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">{t("mes_actual")}</SelectItem>
                <SelectItem value="year">{t("ano_actual")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-muted-foreground p-4 text-center">{t("no_hay_datos_gastos")}</p>
        </div>
     );
   }

  return (
    <div className="h-[350px] w-full">
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <Select value={currentPeriod} onValueChange={(value: "month" | "year") => {
          // currentPeriodChanged = true; // Esto necesitaría ser un estado para funcionar correctamente entre renders
          setSelectedCategory("all"); // Resetear categoría al cambiar período
          setCurrentPeriod(value);
        }}>
          <SelectTrigger className="w-auto min-w-[150px]">
            <SelectValue placeholder={t("seleccionar_periodo")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">{t("mes_actual") || "Mes Actual"}</SelectItem>
            <SelectItem value="year">{t("ano_actual") || "Año Actual"}</SelectItem>
            {/* Podríamos añadir más periodos como "Últimos 3 meses", "Año pasado", etc. */}
          </SelectContent>
        </Select>

        {allCategories.length > 0 && (
           <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value)}>
            <SelectTrigger className="w-auto min-w-[180px]">
              <SelectValue placeholder={t("seleccionar_categoria")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("todas_las_categorias") || "Todas las categorías"}</SelectItem>
              {allCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie
            data={displayData}
            cx="50%"
            cy="50%"
            labelLine={false}
            // label={renderCustomizedLabel} // El label customizado puede ser muy verboso para el pie.
            outerRadius={100} // Ajustar según necesidad
            innerRadius={60} // Para efecto doughnut
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            paddingAngle={1}
          >
            {displayData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string, props: any) => {
              const total = displayData.reduce((acc, curr) => acc + curr.value, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
              return [`$${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${percentage}%)`, name];
            }}
          />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center"
            wrapperStyle={{ paddingTop: "10px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}