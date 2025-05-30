import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ExpensesByCategoryChart } from "@/components/expenses-by-category-chart";
import { X, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WidgetCategoriasProps {
  spreadsheetId: string;
  accessToken: string;
  period: string;
  visible: boolean;
  onToggle: () => void;
}

export function WidgetCategorias({ spreadsheetId, accessToken, period, visible, onToggle }: WidgetCategoriasProps) {
  const { t } = useTranslation();
  if (!visible) {
    return (
      <button className="text-xs text-gray-500" onClick={onToggle} aria-label={t("mostrar_categorias")}>
        {t("mostrar_categorias")} <Eye size={14} className="inline ml-1" />
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
          <CardTitle>{t("gastos_por_categoria")}</CardTitle>
          <CardDescription>{t("distribucion_gastos")}</CardDescription>
        </CardHeader>        <CardContent>
          <ExpensesByCategoryChart spreadsheetId={spreadsheetId} accessToken={accessToken} />
        </CardContent>
      </Card>
    </div>
  );
} 