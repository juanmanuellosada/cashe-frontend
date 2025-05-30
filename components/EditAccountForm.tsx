import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGoogleApi } from "@/hooks/useGoogleApi";
import { getSheetData, updateSheetData } from "@/lib/googleApi";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface EditAccountFormProps {
  account: any;
  onAccountUpdated: (updatedAccount: any) => void;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "campo_obligatorio" }),
  type: z.string().min(1, { message: "campo_obligatorio" }),
  initialBalance: z.preprocess((val) => typeof val === "string" ? Number(val) : val, z.number({ invalid_type_error: "campo_obligatorio" })),
  balance: z.preprocess((val) => typeof val === "string" ? Number(val) : val, z.number({ invalid_type_error: "campo_obligatorio" })),
  currency: z.string().min(1, { message: "campo_obligatorio" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const EditAccountForm: React.FC<EditAccountFormProps> = ({ account, onAccountUpdated }) => {
  const { spreadsheetId, accessToken } = useGoogleApi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance,
      balance: account.balance,
      currency: account.currency,
      notes: account.notes,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!spreadsheetId || !accessToken) {
      toast({
        title: t("error"),
        description: t("necesario_google_guardar"),
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      // Buscar la fila por ID
      const range = "Accounts!A2:H";
      const sheetData = await getSheetData(accessToken, spreadsheetId, range);
      if (!sheetData || !sheetData.values) throw new Error(t("no_se_pudo_leer_hoja_cuentas"));
      const rowIndex = sheetData.values.findIndex((row: string[]) => row[7] === account.id);
      if (rowIndex === -1) throw new Error(t("no_se_encontro_cuenta_editar"));
      // La fila real en la hoja es rowIndex + 2 (por el encabezado y base 1)
      const targetRange = `Accounts!A${rowIndex + 2}:H${rowIndex + 2}`;
      const now = new Date().toISOString();
      const values = [[
        data.name,
        data.type,
        data.initialBalance.toString(),
        data.balance.toString(),
        data.currency,
        data.notes,
        now,
        account.id,
      ]];
      await updateSheetData(accessToken, spreadsheetId, targetRange, values);
      toast({
        title: t("exito"),
        description: t("cuenta_actualizada"),
        variant: "default",
      });
      setOpen(false);
      // Pasar la cuenta editada al padre
      onAccountUpdated({
        ...account,
        name: data.name,
        type: data.type,
        initialBalance: data.initialBalance,
        balance: data.balance,
        currency: data.currency,
        notes: data.notes,
        lastUpdated: now,
      });
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err.message || t("error_editar_cuenta"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          {t("editar")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editar_cuenta")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-label={t("formulario_editar_cuenta")}>
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">{t("nombre")}</label>
            <Input id="name" aria-invalid={!!form.formState.errors.name} aria-describedby={form.formState.errors.name ? "name-error" : undefined} {...form.register("name")} />
            {form.formState.errors.name && <span id="name-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.name.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="type" className="block mb-1 font-medium">{t("tipo")}</label>
            <Input id="type" aria-invalid={!!form.formState.errors.type} aria-describedby={form.formState.errors.type ? "type-error" : undefined} {...form.register("type")} />
            {form.formState.errors.type && <span id="type-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.type.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="initialBalance" className="block mb-1 font-medium">{t("saldo_inicial")}</label>
            <Input id="initialBalance" type="number" step="0.01" aria-invalid={!!form.formState.errors.initialBalance} aria-describedby={form.formState.errors.initialBalance ? "initialBalance-error" : undefined} {...form.register("initialBalance", { valueAsNumber: true })} />
            {form.formState.errors.initialBalance && <span id="initialBalance-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.initialBalance.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="balance" className="block mb-1 font-medium">{t("saldo_actual")}</label>
            <Input id="balance" type="number" step="0.01" aria-invalid={!!form.formState.errors.balance} aria-describedby={form.formState.errors.balance ? "balance-error" : undefined} {...form.register("balance", { valueAsNumber: true })} />
            {form.formState.errors.balance && <span id="balance-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.balance.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="currency" className="block mb-1 font-medium">{t("moneda")}</label>
            <Input id="currency" aria-invalid={!!form.formState.errors.currency} aria-describedby={form.formState.errors.currency ? "currency-error" : undefined} {...form.register("currency")} />
            {form.formState.errors.currency && <span id="currency-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.currency.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="notes" className="block mb-1 font-medium">{t("notas")}</label>
            <Input id="notes" {...form.register("notes")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("cancelar")}</Button>
            <Button type="submit" disabled={loading}>{loading ? t("guardando") : t("guardar")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 