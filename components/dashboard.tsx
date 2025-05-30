"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountSummary } from "@/components/account-summary"
import { ExpensesByCategoryChart } from "@/components/expenses-by-category-chart"
import { MonthlyBalanceChart } from "@/components/monthly-balance-chart"
import { RecentTransactions } from "@/components/recent-transactions"
import { FinancialInsights } from "@/components/financial-insights"
import { BudgetProgress } from "@/components/budget-progress"
import { CalendarView } from "@/components/calendar-view"
import { X, Eye } from "lucide-react"
import { WidgetResumen } from "./dashboard-widgets/WidgetResumen"
import { WidgetBalance } from "./dashboard-widgets/WidgetBalance"
import { WidgetCategorias } from "./dashboard-widgets/WidgetCategorias"
import { WidgetTransacciones } from "./dashboard-widgets/WidgetTransacciones"
import { WidgetPresupuestos } from "./dashboard-widgets/WidgetPresupuestos"
import { WidgetCalendario } from "./dashboard-widgets/WidgetCalendario"
import { WidgetInsights } from "./dashboard-widgets/WidgetInsights"
import { useTranslation } from "react-i18next"

// Define props interface
interface DashboardProps {
  spreadsheetId: string | null;
  accessToken: string | undefined;
  refreshKey?: number;
  setRefreshKey?: React.Dispatch<React.SetStateAction<number>>;
}

export function Dashboard({ spreadsheetId, accessToken, refreshKey, setRefreshKey }: DashboardProps) {
  const [period, setPeriod] = useState("month")
  // Estado de visibilidad de widgets
  const [visibleWidgets, setVisibleWidgets] = useState({
    resumen: true,
    balance: true,
    categorias: true,
    transacciones: true,
    presupuestos: true,
    calendario: true,
    insights: true,
  });

  const { t } = useTranslation();

  const handleToggle = (key: keyof typeof visibleWidgets) => {
    setVisibleWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle cases where spreadsheetId or accessToken might be missing initially
  if (!spreadsheetId || !accessToken) {
    return <p aria-live="polite">{t("cargando_datos_financieros")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard")}</h1>
        <Tabs defaultValue="month" className="w-[300px]" onValueChange={setPeriod} aria-label={t("periodo_dashboard")}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="week">{t("semana")}</TabsTrigger>
            <TabsTrigger value="month">{t("mes")}</TabsTrigger>
            <TabsTrigger value="year">{t("ano")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <WidgetResumen
        spreadsheetId={spreadsheetId}
        accessToken={accessToken}
        visible={visibleWidgets.resumen}
        onToggle={() => handleToggle("resumen")}
        refreshKey={refreshKey}
      />

      <div className="grid gap-6 md:grid-cols-1">
        <div className="w-full">
          <WidgetBalance
            spreadsheetId={spreadsheetId}
            accessToken={accessToken}
            period={period}
            visible={visibleWidgets.balance}
            onToggle={() => handleToggle("balance")}
            refreshKey={refreshKey}
          />
        </div>
        <div className="w-full">
          <WidgetCategorias
            spreadsheetId={spreadsheetId}
            accessToken={accessToken}
            period={period}
            visible={visibleWidgets.categorias}
            onToggle={() => handleToggle("categorias")}
            refreshKey={refreshKey}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <div className="w-full">
          <WidgetTransacciones
            spreadsheetId={spreadsheetId}
            accessToken={accessToken}
            visible={visibleWidgets.transacciones}
            onToggle={() => handleToggle("transacciones")}
            refreshKey={refreshKey}
          />
        </div>
        <div className="w-full">
          <WidgetPresupuestos
            spreadsheetId={spreadsheetId}
            accessToken={accessToken}
            visible={visibleWidgets.presupuestos}
            onToggle={() => handleToggle("presupuestos")}
            refreshKey={refreshKey}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <WidgetCalendario
          spreadsheetId={spreadsheetId}
          accessToken={accessToken}
          visible={visibleWidgets.calendario}
          onToggle={() => handleToggle("calendario")}
          refreshKey={refreshKey}
        />
        <WidgetInsights
          spreadsheetId={spreadsheetId}
          accessToken={accessToken}
          visible={visibleWidgets.insights}
          onToggle={() => handleToggle("insights")}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  )
}
