import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { RecentTransactions } from "@/components/recent-transactions";
import { X, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WidgetTransaccionesProps {
  spreadsheetId: string;
  accessToken: string;
  visible: boolean;
  onToggle: () => void;
  refreshKey?: number;
}

export function WidgetTransacciones({ spreadsheetId, accessToken, visible, onToggle, refreshKey }: WidgetTransaccionesProps) {
  const { t } = useTranslation();
  if (!visible) {
    return (
      <button className="text-xs text-gray-500" onClick={onToggle} aria-label={t("mostrar_transacciones")}>
        {t("mostrar_transacciones")} <Eye size={14} className="inline ml-1" />
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
          <CardTitle>{t("transacciones_recientes")}</CardTitle>
          <CardDescription>{t("ultimos_movimientos_financieros")}</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentTransactions spreadsheetId={spreadsheetId} accessToken={accessToken} refreshKey={refreshKey} />
        </CardContent>
      </Card>
    </div>
  );
} 