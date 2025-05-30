import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RecentTransactions } from "@/components/recent-transactions"
import { CalendarView } from "@/components/calendar-view"
import { BudgetProgress } from "@/components/budget-progress"
import { useGoogleApi } from "@/hooks/useGoogleApi"
import { useRefresh } from "@/contexts/RefreshContext"

export default function FinanzasPage() {
  const { spreadsheetId, accessToken, isLoading, error } = useGoogleApi();
  const { globalRefreshKey } = useRefresh();

  if (isLoading) {
    return <div className="p-4">Cargando datos financieros...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }
  if (!spreadsheetId || !accessToken) {
    return <div className="p-4">Inicializando hoja de cálculo...</div>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight">Finanzas</h1>
        </div>

        <Tabs defaultValue="transactions">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transactions">Transacciones</TabsTrigger>
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions" className="space-y-6 pt-4">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Transacciones recientes</CardTitle>
                  <CardDescription>Historial de movimientos financieros</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentTransactions spreadsheetId={spreadsheetId} accessToken={accessToken} refreshKey={globalRefreshKey} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Presupuestos</CardTitle>
                  <CardDescription>Progreso mensual</CardDescription>
                </CardHeader>
                <CardContent>
                  <BudgetProgress spreadsheetId={spreadsheetId} accessToken={accessToken} refreshKey={globalRefreshKey} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="calendar" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Calendario de gastos</CardTitle>
                <CardDescription>Vista mensual de tus gastos</CardDescription>
              </CardHeader>
              <CardContent>
                <CalendarView spreadsheetId={spreadsheetId} accessToken={accessToken} refreshKey={globalRefreshKey} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
