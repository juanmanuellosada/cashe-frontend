import { useTranslation } from "react-i18next";

export function AppHeader() {
  const { t, i18n } = useTranslation();

  return (
    <header className="w-full border-b bg-background/95 sticky top-0 z-40">
      <div className="flex h-16 items-center px-4 container mx-auto justify-between">
        {/* ...resto del header... */}
        <div className="flex items-center gap-2">
          {/* Selector de idioma */}
          <select
            className="border rounded px-2 py-1 text-sm bg-background"
            value={i18n.language}
            onChange={e => i18n.changeLanguage(e.target.value)}
            aria-label={t("seleccionar_idioma")}
          >
            <option value="es">{t("espanol")}</option>
            <option value="en">{t("ingles")}</option>
          </select>
        </div>
      </div>
    </header>
  );
} 