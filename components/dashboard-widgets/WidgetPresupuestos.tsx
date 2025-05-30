import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BudgetProgress } from "@/components/budget-progress";
import { X, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WidgetPresupuestosProps {
  spreadsheetId: string;
  accessToken: string;
  visible: boolean;
  onToggle: () => void;
  refreshKey?: number;
}

export function WidgetPresupuestos({ spreadsheetId, accessToken, visible, onToggle, refreshKey }: WidgetPresupuestosProps) {
  const { t } = useTranslation();
  if (!visible) {
    return (
      <button className="text-xs text-gray-500" onClick={onToggle} aria-label={t("mostrar_presupuestos")}>
        {t("mostrar_presupuestos")} <Eye size={14} className="inline ml-1" />
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
          <CardTitle>{t("presupuestos")}</CardTitle>
          <CardDescription>{t("progreso_mensual")}</CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetProgress spreadsheetId={spreadsheetId} accessToken={accessToken} refreshKey={refreshKey} />
        </CardContent>
      </Card>
    </div>
  );
} 