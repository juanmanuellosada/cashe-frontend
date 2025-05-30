"use client"

import { useEffect, useState } from "react"; 
import { Card, CardContent } from "@/components/ui/card"
import { ArrowDown, ArrowUp, DollarSign, Wallet } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { getSheetData, updateSheetData } from "@/lib/googleApi"; 
import { Skeleton } from "@/components/ui/skeleton"; 
import { useTranslation } from "react-i18next";
import { useRefresh } from "@/contexts/RefreshContext";

// Define props interface
interface AccountSummaryProps {
  spreadsheetId: string;
  accessToken: string;
}

// Define structure for summary data
interface SummaryData {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
}

export function AccountSummary({ spreadsheetId, accessToken }: AccountSummaryProps) {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const { globalRefreshKey } = useRefresh();

  useEffect(() => {
    const fetchData = async () => {
      if (!spreadsheetId || !accessToken) {
        setError("No se proporcionó ID de hoja de cálculo o token de acceso");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      setSummaryData(null); // Limpiar estado antes de fetch
      console.log('Refetch resumen', globalRefreshKey);
      await new Promise(res => setTimeout(res, 1000));
      try {
        console.log("Fetching summary data using spreadsheetId:", spreadsheetId);
        
        // First, ensure the Summary sheet exists and is initialized
        try {
          // Initialize the Summary sheet with default values if it doesn't exist
          console.log("Initializing Summary sheet with default data");
          await updateSheetData(accessToken, spreadsheetId, "Summary!A1:B5", [
            ["Concepto", "Valor"],
            ["Saldo total", "0"],
            ["Ingresos mensuales", "0"],
            ["Gastos mensuales", "0"],
            ["Ahorro mensual (%)", "0"]
          ]);
          console.log("Summary sheet initialized successfully");
        } catch (initError: any) {
          console.error("Error initializing Summary sheet:", initError);
          // Continue execution - we'll try to fetch data anyway
        }
        
        // Now try to get the data
        const range = "Summary!A1:B5"; 
        const result = await getSheetData(accessToken, spreadsheetId, range);

        if (result && result.values && result.values.length > 0) {
          // Procesar los datos si existen
          console.log("Summary data fetched successfully:", result);
          
          // Buscar los valores por etiqueta
          let balance = 0;
          let income = 0;
          let expenses = 0;
          let rate = 0;
          
          // Buscar las filas por descripción - start from index 1 to skip headers
          for (let i = 1; i < result.values.length; i++) {
            const row = result.values[i];
            if (row && row.length >= 2) {
              if (row[0].includes("Saldo total")) {
                balance = parseFloat(row[1] || '0');
              } else if (row[0].includes("Ingresos")) {
                income = parseFloat(row[1] || '0');
              } else if (row[0].includes("Gastos")) {
                expenses = parseFloat(row[1] || '0');
              } else if (row[0].includes("Ahorro")) {
                rate = parseFloat(row[1] || '0');
              }
            }
          }

          // Usar un valor calculado para la tasa de ahorro si no está en la hoja
          const calculatedRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

          setSummaryData({
            totalBalance: balance,
            totalIncome: income,
            totalExpenses: expenses,
            savingsRate: rate || calculatedRate,
          });
        } else {
          // Si no hay datos o la hoja está vacía, usar valores predeterminados
          console.warn("Summary data not found or incomplete. Using default values.");
          setSummaryData({ 
            totalBalance: 0, 
            totalIncome: 0, 
            totalExpenses: 0, 
            savingsRate: 0 
          });
        }
      } catch (err: any) {
        console.error("Error fetching account summary:", err);
        
        // Mensaje de error más específico
        if (err.message && err.message.includes('Unauthorized')) {
          setError('Sesión expirada. Por favor, vuelve a iniciar sesión.');
        } else if (err.message && err.message.includes('Unable to parse range')) {
          setError('Error en el formato de rango. Intentando recuperar...');
          
          // Try to recreate the Summary sheet from scratch
          try {
            await updateSheetData(accessToken, spreadsheetId, "Summary!A1:B5", [
              ["Concepto", "Valor"],
              ["Saldo total", "0"],
              ["Ingresos mensuales", "0"],
              ["Gastos mensuales", "0"],
              ["Ahorro mensual (%)", "0"]
            ]);
            setSummaryData({ 
              totalBalance: 0, 
              totalIncome: 0, 
              totalExpenses: 0, 
              savingsRate: 0 
            });
            setError(null); // Clear error if successful
          } catch (recoveryErr) {
            console.error("Failed to recover Summary sheet:", recoveryErr);
            setError('No se pudo recuperar la hoja de resumen. Por favor, recarga la página.');
          }
        } else {
          setError(`No se pudo cargar el resumen: ${err.message || 'Error desconocido'}`);
        }
        
        // Usar valores predeterminados incluso en caso de error
        setSummaryData({ 
          totalBalance: 0, 
          totalIncome: 0, 
          totalExpenses: 0, 
          savingsRate: 0 
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [spreadsheetId, accessToken, globalRefreshKey]);

  // --- Render Loading State --- 
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-live="polite">
        <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
      </div>
    );
  }

  // --- Render Error State --- 
  if (error) {
    return <p className="text-red-500" role="alert" aria-live="polite">{t("error_cargando_resumen")}: {t(error)}</p>;
  }

  // --- Render Data --- 
  // Use fetched data or defaults if null
  const { 
    totalBalance = 0, 
    totalIncome = 0, 
    totalExpenses = 0, 
    savingsRate = 0 
  } = summaryData || {};

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("balance_total")}</p>
              <h3 className="mt-1 text-2xl font-bold">
                ${totalBalance.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">{t("actualizado_fecha", { fecha: "5 mayo, 2025" })}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("ingresos")}</p>
              <h3 className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                ${totalIncome.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-500">
              <ArrowUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">{t("este_mes")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("gastos")}</p>
              <h3 className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-500">
                ${totalExpenses.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="rounded-full bg-rose-100 p-2 text-rose-600 dark:bg-rose-900/30 dark:text-rose-500">
              <ArrowDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">{t("este_mes")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("tasa_ahorro")}</p>
              <h3 className="mt-1 text-2xl font-bold">{savingsRate.toFixed(1)}%</h3>
            </div>
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <Progress value={savingsRate} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
