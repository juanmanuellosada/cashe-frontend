"use client"; // Make this a client component

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpensesByCategoryChart } from "@/components/expenses-by-category-chart";
import { MonthlyBalanceChart } from "@/components/monthly-balance-chart";
import { FinancialInsights } from "@/components/financial-insights";
import { SpendingTrendsChart } from "@/components/spending-trends-chart";
import { findSheet, createSheet } from "@/lib/googleApi"; // Import sheet helpers
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { useRefresh } from "@/contexts/RefreshContext"; // Importar useRefresh

export default function AnalisisPage() {
  const { data: session, status } = useSession();
  const { globalRefreshKey } = useRefresh(); // Usar el hook
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(true); // Start loading
  const [error, setError] = useState<string | null>(null);
  const [localRefreshKey, setLocalRefreshKey] = useState(0); // Renombrado para claridad

  useEffect(() => {
    const initializeSheet = async () => {
      if (session?.accessToken) {
        setIsLoadingSheet(true);
        setError(null);
        try {
          let sheetId = await findSheet(session.accessToken);
          if (!sheetId) {
            // Optionally create if not found, or just show an error/message
            // For analysis, we probably assume the sheet exists from the main page
            console.warn("Spreadsheet not found for analysis.");
            setError("Hoja de cálculo no encontrada. Asegúrate de haber iniciado sesión correctamente en la página principal.");
            // sheetId = await createSheet(session.accessToken); 
          }
          setSpreadsheetId(sheetId);
        } catch (err: any) {
          console.error("Error finding sheet for analysis:", err);
          setError(`Error al acceder a la hoja de cálculo: ${err.message}`);
        } finally {
          setIsLoadingSheet(false);
        }
      } else if (status === "unauthenticated") {
         setError("Por favor, inicia sesión para ver el análisis.");
         setIsLoadingSheet(false);
      }
    };

    if (status !== "loading") { // Only run if session status is resolved
        initializeSheet();
    }
  }, [session, status]);

  // Nuevo useEffect para actualizar localRefreshKey cuando globalRefreshKey cambie
  useEffect(() => {
    if (globalRefreshKey > 0) { // Opcional: solo refrescar si ha habido un cambio real
      setLocalRefreshKey(prevKey => prevKey + 1);
    }
  }, [globalRefreshKey]);

  // Handle loading and error states for the whole page based on sheet access
  if (status === "loading" || isLoadingSheet) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Análisis</h1>
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-6 md:grid-cols-2">
             <Skeleton className="h-64 w-full" />
             <Skeleton className="h-64 w-full" />
          </div>
           <Skeleton className="h-80 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (error || !spreadsheetId || !session?.accessToken) {
     return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold tracking-tight">Análisis</h1>
          <p className="text-red-500">{error || "No se pudo cargar el análisis. Verifica tu sesión y la hoja de cálculo."}</p>
          {/* Optionally add a sign-in button or link */}
        </div>
      </AppLayout>
     )
  }

  // Render content now that we have spreadsheetId and accessToken
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight">Análisis</h1>
        </div>

        <Tabs defaultValue="charts">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="charts">Gráficos</TabsTrigger>
            <TabsTrigger value="insights">Recomendaciones</TabsTrigger>
          </TabsList>
          <TabsContent value="charts" className="space-y-6 pt-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Gastos por categoría</CardTitle>
                  <CardDescription>Distribución de gastos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpensesByCategoryChart period="month" spreadsheetId={spreadsheetId!} accessToken={session!.accessToken!} refreshKey={localRefreshKey} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Balance mensual</CardTitle>
                  <CardDescription>Ingresos vs gastos</CardDescription>
                </CardHeader>
                <CardContent>
                  <MonthlyBalanceChart period="month" spreadsheetId={spreadsheetId!} accessToken={session!.accessToken!} refreshKey={localRefreshKey} />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Tendencias de gasto</CardTitle>
                <CardDescription>Evolución por categoría</CardDescription>
              </CardHeader>
              <CardContent>
                <SpendingTrendsChart spreadsheetId={spreadsheetId!} accessToken={session!.accessToken!} refreshKey={localRefreshKey} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="insights" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Análisis inteligente</CardTitle>
                <CardDescription>Recomendaciones personalizadas basadas en tus datos</CardDescription>
              </CardHeader>
              <CardContent>
                <FinancialInsights spreadsheetId={spreadsheetId!} accessToken={session!.accessToken!} refreshKey={localRefreshKey} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
