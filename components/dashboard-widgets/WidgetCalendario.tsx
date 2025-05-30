import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CalendarView } from "@/components/calendar-view";
import { X, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WidgetCalendarioProps {
  spreadsheetId: string;
  accessToken: string;
  visible: boolean;
  onToggle: () => void;
}

export function WidgetCalendario({ spreadsheetId, accessToken, visible, onToggle }: WidgetCalendarioProps) {
  const { t } = useTranslation();
  if (!visible) {
    return (
      <button className="text-xs text-gray-500" onClick={onToggle} aria-label={t("mostrar_calendario")}>
        {t("mostrar_calendario")} <Eye size={14} className="inline ml-1" />
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
          <CardTitle>{t("calendario_gastos")}</CardTitle>
          <CardDescription>{t("vista_mensual_gastos")}</CardDescription>
        </CardHeader>
        <CardContent>
          <CalendarView spreadsheetId={spreadsheetId} accessToken={accessToken} />
        </CardContent>
      </Card>
    </div>
  );
} 