import { AccountSummary } from "@/components/account-summary";
import { X, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WidgetResumenProps {
  spreadsheetId: string;
  accessToken: string;
  visible: boolean;
  onToggle: () => void;
}

export function WidgetResumen({ spreadsheetId, accessToken, visible, onToggle }: WidgetResumenProps) {
  const { t } = useTranslation();
  if (!visible) {
    return (
      <button className="text-xs text-gray-500" onClick={onToggle} aria-label={t("mostrar_resumen_cuentas")}>
        {t("mostrar_resumen_cuentas")} <Eye size={14} className="inline ml-1" />
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
      <AccountSummary spreadsheetId={spreadsheetId} accessToken={accessToken} />
    </div>
  );
} 