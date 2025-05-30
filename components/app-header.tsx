"use client";

import Image from "next/image";
import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Plus, WifiOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TransactionForm } from "@/components/transaction-form";
import { useState, createContext, useContext, useCallback } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { AddAccountForm } from "@/components/AddAccountForm";
import { AddCardForm } from "@/components/AddCardForm";
import { AddTransferForm } from "@/components/AddTransferForm";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSheetData, appendSheetData } from "@/lib/googleApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Dashboard Refresh Context
const DashboardRefreshContext = createContext({ refreshDashboard: () => {} });
export function useDashboardRefresh() {
  return useContext(DashboardRefreshContext);
}

export function AppHeader({
  isOffline,
  spreadsheetId,
  accessToken,
}: {
  isOffline: boolean;
  spreadsheetId?: string;
  accessToken?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("gasto");
  const [refreshKey, setRefreshKey] = useState(0);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Función para refrescar dashboard
  const refreshDashboard = useCallback(() => setRefreshKey(k => k + 1), []);

  // --- Category Form ---
  function CategoryForm({ onSuccess }: { onSuccess: () => void }) {
    const [name, setName] = useState("");
    const [type, setType] = useState("gasto");
    const [parent, setParent] = useState("");
    const [budget, setBudget] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!spreadsheetId || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const id = `cat-${Date.now()}`;
        const values = [[name, type, parent, budget, id]];
        await appendSheetData(accessToken, spreadsheetId, "Categories!A2:E", values);
        onSuccess();
        refreshDashboard();
      } catch (err: any) {
        setError(err.message || "Error al guardar la categoría");
      } finally {
        setLoading(false);
      }
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">{t("nombre")}</label>
          <Input value={name} onChange={e => setName(e.target.value)} required placeholder={t("ejemplo_categoria") || "Ej: Alimentación"} />
        </div>
        <div>
          <label className="block mb-1 font-medium">{t("tipo")}</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder={t("selecciona_tipo")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gasto">{t("gasto")}</SelectItem>
              <SelectItem value="ingreso">{t("ingreso")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block mb-1 font-medium">{t("categoria_padre")}</label>
          <Input value={parent} onChange={e => setParent(e.target.value)} placeholder={t("opcional") || "Opcional"} />
        </div>
        <div>
          <label className="block mb-1 font-medium">{t("presupuesto")}</label>
          <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder={t("opcional") || "Opcional"} />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={loading}>{loading ? t("guardando") : t("guardar")}</Button>
        </div>
      </form>
    );
  }

  // --- Budget Form ---
  function BudgetForm({ onSuccess }: { onSuccess: () => void }) {
    const [category, setCategory] = useState("");
    const [limit, setLimit] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!spreadsheetId || !accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const values = [[category, limit, startDate, endDate, notes]];
        await appendSheetData(accessToken, spreadsheetId, "Budgets!A2:E", values);
        onSuccess();
        refreshDashboard();
      } catch (err: any) {
        setError(err.message || "Error al guardar el presupuesto");
      } finally {
        setLoading(false);
      }
    };
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">{t("categoria")}</label>
          <Input value={category} onChange={e => setCategory(e.target.value)} required placeholder={t("ejemplo_categoria") || "Ej: Alimentación"} />
        </div>
        <div>
          <label className="block mb-1 font-medium">{t("limite_mensual")}</label>
          <Input type="number" value={limit} onChange={e => setLimit(e.target.value)} required placeholder="0.00" />
        </div>
        <div>
          <label className="block mb-1 font-medium">{t("fecha_inicio")}</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1 font-medium">{t("fecha_fin")}</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
        </div>
        <div>
          <label className="block mb-1 font-medium">{t("notas")}</label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("opcional") || "Opcional"} />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={loading}>{loading ? t("guardando") : t("guardar")}</Button>
        </div>
      </form>
    );
  }

  return (
    <DashboardRefreshContext.Provider value={{ refreshDashboard }}>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
        {!isMobile && <SidebarTrigger />}

        <Link href="/" className="flex items-center">
          <Image
            src="/images/cashe-texto.png"
            alt="Cashé Logo"
            width={80} // Adjust width as needed
            height={32}
          />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {isOffline && (
            <div className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
              <WifiOff className="h-3 w-3" />
              <span>Sin conexión</span>
            </div>
          )}
          <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>{t("nuevo")}</span>
          </Button>
          <ModeToggle />
        </div>

        {/* Dialog centrado con Tabs horizontales arriba */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl w-full flex flex-col items-center justify-center">
            <DialogHeader>
              <DialogTitle>{t("nuevo")}</DialogTitle>
            </DialogHeader>
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="flex flex-row w-full justify-center mb-6 bg-muted/80 rounded-lg p-2 shadow-md">
                <TabsTrigger value="gasto" className="mx-1 data-[state=active]:bg-primary data-[state=active]:text-white">{t("gasto")}</TabsTrigger>
                <TabsTrigger value="ingreso" className="mx-1 data-[state=active]:bg-primary data-[state=active]:text-white">{t("ingreso")}</TabsTrigger>
                <TabsTrigger value="categoria" className="mx-1 data-[state=active]:bg-primary data-[state=active]:text-white">{t("categoria")}</TabsTrigger>
                <TabsTrigger value="cuenta" className="mx-1 data-[state=active]:bg-primary data-[state=active]:text-white">{t("cuenta")}</TabsTrigger>
                <TabsTrigger value="tarjeta" className="mx-1 data-[state=active]:bg-primary data-[state=active]:text-white">{t("tarjeta")}</TabsTrigger>
                <TabsTrigger value="transferencia" className="mx-1 data-[state=active]:bg-primary data-[state=active]:text-white">{t("transferencia")}</TabsTrigger>
                <TabsTrigger value="presupuesto" className="mx-1 data-[state=active]:bg-primary data-[state=active]:text-white">{t("presupuesto")}</TabsTrigger>
              </TabsList>
              <div className="flex-1">
                <TabsContent value="gasto">
                  <TransactionForm spreadsheetId={spreadsheetId} accessToken={accessToken} type="expense" hideTypeSelector onSuccess={() => { setOpen(false); refreshDashboard(); }} />
                </TabsContent>
                <TabsContent value="ingreso">
                  <TransactionForm spreadsheetId={spreadsheetId} accessToken={accessToken} type="income" hideTypeSelector onSuccess={() => { setOpen(false); refreshDashboard(); }} />
                </TabsContent>
                <TabsContent value="categoria">
                  <CategoryForm onSuccess={() => { setOpen(false); refreshDashboard(); }} />
                </TabsContent>
                <TabsContent value="cuenta">
                  <AddAccountForm onAccountAdded={() => { setOpen(false); refreshDashboard(); }} />
                </TabsContent>
                <TabsContent value="tarjeta">
                  <AddCardForm onCardAdded={() => { setOpen(false); refreshDashboard(); }} />
                </TabsContent>
                <TabsContent value="transferencia">
                  <AddTransferForm onTransferAdded={() => { setOpen(false); refreshDashboard(); }} />
                </TabsContent>
                <TabsContent value="presupuesto">
                  <BudgetForm onSuccess={() => { setOpen(false); refreshDashboard(); }} />
                </TabsContent>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      </header>
    </DashboardRefreshContext.Provider>
  );
}
