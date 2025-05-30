import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FinancialInsights } from "@/components/financial-insights";
import { X, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WidgetInsightsProps {
  spreadsheetId: string;
  accessToken: string;
  visible: boolean;
  onToggle: () => void;
}

export function WidgetInsights({ spreadsheetId, accessToken, visible, onToggle }: WidgetInsightsProps) {
  const { t } = useTranslation();
  if (!visible) {
    return (
      <button className="text-xs text-gray-500" onClick={onToggle} aria-label={t("mostrar_analisis_inteligente")}>
        {t("mostrar_analisis_inteligente")} <Eye size={14} className="inline ml-1" />
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
          <CardTitle>{t("analisis_inteligente")}</CardTitle>
          <CardDescription>{t("recomendaciones_personalizadas")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialInsights spreadsheetId={spreadsheetId} accessToken={accessToken} />
        </CardContent>
      </Card>
    </div>
  );
} 