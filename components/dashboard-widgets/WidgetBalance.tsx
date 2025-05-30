import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MonthlyBalanceChart } from "@/components/monthly-balance-chart";
import { X, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WidgetBalanceProps {
  spreadsheetId: string;
  accessToken: string;
  period: string;
  visible: boolean;
  onToggle: () => void;
  refreshKey?: number;
}

export function WidgetBalance({ spreadsheetId, accessToken, period, visible, onToggle, refreshKey }: WidgetBalanceProps) {
  const { t } = useTranslation();
  if (!visible) {
    return (
      <button className="text-xs text-gray-500" onClick={onToggle} aria-label={t("mostrar_balance")}>
        {t("mostrar_balance")} <Eye size={14} className="inline ml-1" />
      </button>
    );
  }
  return (
    <div className="relative">
      <button
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
        onClick={onToggle}
        title={t("ocultar_widget")}
        aria-label={t("ocultar_widget")}
      >
        <X size={18} />
      </button>
      <Card>
        <CardHeader>
          <CardTitle>{t("balance_mensual")}</CardTitle>
          <CardDescription>{t("ingresos_vs_gastos_tiempo")}</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyBalanceChart period={period} spreadsheetId={spreadsheetId} accessToken={accessToken} refreshKey={refreshKey} />
        </CardContent>
      </Card>
    </div>
  );
} 