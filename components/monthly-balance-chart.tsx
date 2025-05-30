"use client"

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { getSheetData } from "@/lib/googleApi";
import { Skeleton } from "@/components/ui/skeleton";
import { processMonthlyBalanceData } from "@/lib/dataProcessing";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRefresh } from "@/contexts/RefreshContext";

interface MonthlyBalanceChartProps {
  spreadsheetId: string;
  accessToken: string;
}

// Estructura de datos para Recharts BarChart
interface RechartsBalanceDataPoint {
  name: string; // Label del eje X (e.g., mes, semana)
  ingresos: number;
  gastos: number;
  // Podríamos añadir balance: ingresos - gastos si se quiere mostrar directamente
}

const INGRESO_COLOR_LIGHT = "#4ade80"; // verde claro
const INGRESO_COLOR_DARK = "#22c55e"; // verde más oscuro
const GASTO_COLOR_LIGHT = "#f87171"; // rojo claro
const GASTO_COLOR_DARK = "#ef4444"; // rojo más oscuro

export function MonthlyBalanceChart({ spreadsheetId, accessToken }: MonthlyBalanceChartProps) {
  const { theme } = useTheme();
  const [chartData, setChartData] = useState<RechartsBalanceDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const [currentPeriod, setCurrentPeriod] = useState<"month" | "year" | "week">("month");
  const { globalRefreshKey } = useRefresh();

  useEffect(() => {
    const fetchData = async () => {
      if (!spreadsheetId || !accessToken) {
        setError(t("error_faltan_datos_conexion_google"));
        setIsLoading(false);
        setChartData([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      console.log('Refetch balance para Recharts', globalRefreshKey, currentPeriod);
      await new Promise(res => setTimeout(res, 1000));

      try {
        // Usar Transactions!A2:E como rango estándar que contiene Date, Type, Amount
        const range = "Transactions!A2:E"; 
        const result = await getSheetData(accessToken, spreadsheetId, range);

        if (result && result.values) {
          const processed = processMonthlyBalanceData(result.values, currentPeriod);
          const rechartsData: RechartsBalanceDataPoint[] = processed.labels.map((label, index) => ({
            name: label,
            ingresos: processed.income[index] || 0,
            gastos: processed.expenses[index] || 0,
          }));
          setChartData(rechartsData);
        } else {
          setChartData([]);
          // Considerar un mensaje si result.values está vacío, aunque processMonthlyBalanceData debería manejarlo.
        }
      } catch (err: any) {
        console.error("Error fetching monthly balance data for Recharts:", err);
        setError(err.message || t("error_cargar_datos_grafico"));
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPeriod, spreadsheetId, accessToken, globalRefreshKey, t]);

  const ingresoColor = theme === 'dark' ? INGRESO_COLOR_DARK : INGRESO_COLOR_LIGHT;
  const gastoColor = theme === 'dark' ? GASTO_COLOR_DARK : GASTO_COLOR_LIGHT;

  if (isLoading) {
    return <div className="h-[350px] w-full flex items-center justify-center" aria-busy="true" aria-live="polite"><Skeleton className="h-full w-full" /></div>;
  }

  if (error) {
    return <p className="text-red-500 p-4 h-[350px] flex items-center justify-center" role="alert" aria-live="polite">{t("error_cargando_grafico_balance")}: {error}</p>;
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-[350px] flex flex-col items-center justify-center">
        <div className="flex gap-4 mb-4">
          <Select value={currentPeriod} onValueChange={(value: "week" | "month" | "year") => setCurrentPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("seleccionar_periodo")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t("semana_actual") || "Semana Actual"}</SelectItem>
              <SelectItem value="month">{t("mes_actual") || "Mes Actual"}</SelectItem>
              <SelectItem value="year">{t("ano_actual") || "Año Actual"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-muted-foreground p-4 text-center">{t("no_hay_datos_balance")}</p>;
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full">
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <Select value={currentPeriod} onValueChange={(value: "week" | "month" | "year") => setCurrentPeriod(value)}>
          <SelectTrigger className="w-auto min-w-[150px]">
            <SelectValue placeholder={t("seleccionar_periodo")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">{t("semana_actual") || "Semana Actual"}</SelectItem>
            <SelectItem value="month">{t("mes_actual") || "Mes Actual"}</SelectItem>
            <SelectItem value="year">{t("ano_actual") || "Año Actual"}</SelectItem>
          </SelectContent>
        </Select>
        {/* Aquí podrían ir más filtros, como seleccionar cuentas específicas */}
      </div>

      <ResponsiveContainer width="100%" height="85%"> 
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"} />
          <XAxis 
            dataKey="name" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            stroke={theme === 'dark' ? "#e5e7eb" : "#374151"} 
          />
          <YAxis 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            stroke={theme === 'dark' ? "#e5e7eb" : "#374151"} 
            tickFormatter={(value) => `$${value.toLocaleString('es-ES')}`}
            width={80} // Aumentar el ancho para que quepan los números
          />
          <Tooltip
            cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
            contentStyle={{ 
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
            }}
            labelStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#374151' }}
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              t(name) // Traducir "ingresos" y "gastos"
            ]}
          />
          <Legend 
            iconSize={10}
            wrapperStyle={{ 
              paddingTop: '10px',
              color: theme === 'dark' ? '#e5e7eb' : '#374151'
            }}
            formatter={(value) => t(value) // Traducir labels de la leyenda
            }
          />
          <Bar dataKey="ingresos" fill={ingresoColor} name={t("ingresos") || "Ingresos"} radius={[4, 4, 0, 0]} barSize={15} />
          <Bar dataKey="gastos" fill={gastoColor} name={t("gastos") || "Gastos"} radius={[4, 4, 0, 0]} barSize={15} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
