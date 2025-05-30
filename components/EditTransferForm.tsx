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

interface EditTransferFormProps {
  transfer: any;
  onTransferUpdated: (updatedTransfer: any) => void;
}

const formSchema = z.object({
  date: z.string().min(1, { message: "campo_obligatorio" }),
  fromAccount: z.string().min(1, { message: "campo_obligatorio" }),
  toAccount: z.string().min(1, { message: "campo_obligatorio" }),
  amount: z.preprocess((val) => typeof val === "string" ? Number(val) : val, z.number({ invalid_type_error: "campo_obligatorio" })),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const EditTransferForm: React.FC<EditTransferFormProps> = ({ transfer, onTransferUpdated }) => {
  const { spreadsheetId, accessToken } = useGoogleApi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: transfer.date,
      fromAccount: transfer.fromAccount,
      toAccount: transfer.toAccount,
      amount: transfer.amount,
      notes: transfer.notes,
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
      const range = "Transfers!A2:F";
      const sheetData = await getSheetData(accessToken, spreadsheetId, range);
      if (!sheetData || !sheetData.values) throw new Error(t("no_se_pudo_leer_hoja_transferencias"));
      const rowIndex = sheetData.values.findIndex((row: string[]) => row[4] === transfer.id);
      if (rowIndex === -1) throw new Error(t("no_se_encontro_transferencia_editar"));
      // La fila real en la hoja es rowIndex + 2 (por el encabezado y base 1)
      const targetRange = `Transfers!A${rowIndex + 2}:F${rowIndex + 2}`;
      const values = [[
        data.date,
        data.fromAccount,
        data.toAccount,
        data.amount.toString(),
        transfer.id,
        data.notes || "",
      ]];
      await updateSheetData(accessToken, spreadsheetId, targetRange, values);
      toast({
        title: t("exito"),
        description: t("transferencia_actualizada"),
        variant: "default",
      });
      setOpen(false);
      onTransferUpdated({
        ...transfer,
        date: data.date,
        fromAccount: data.fromAccount,
        toAccount: data.toAccount,
        amount: data.amount,
        notes: data.notes,
      });
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err.message || t("error_editar_transferencia"),
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
          <DialogTitle>{t("editar_transferencia")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-label={t("formulario_editar_transferencia")}>
          <div>
            <label htmlFor="date" className="block mb-1 font-medium">{t("fecha")}</label>
            <Input id="date" type="date" aria-invalid={!!form.formState.errors.date} aria-describedby={form.formState.errors.date ? "date-error" : undefined} {...form.register("date")} />
            {form.formState.errors.date && <span id="date-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.date.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="fromAccount" className="block mb-1 font-medium">{t("cuenta_origen")}</label>
            <Input id="fromAccount" aria-invalid={!!form.formState.errors.fromAccount} aria-describedby={form.formState.errors.fromAccount ? "fromAccount-error" : undefined} {...form.register("fromAccount")} />
            {form.formState.errors.fromAccount && <span id="fromAccount-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.fromAccount.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="toAccount" className="block mb-1 font-medium">{t("cuenta_destino")}</label>
            <Input id="toAccount" aria-invalid={!!form.formState.errors.toAccount} aria-describedby={form.formState.errors.toAccount ? "toAccount-error" : undefined} {...form.register("toAccount")} />
            {form.formState.errors.toAccount && <span id="toAccount-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.toAccount.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="amount" className="block mb-1 font-medium">{t("monto")}</label>
            <Input id="amount" type="number" step="0.01" aria-invalid={!!form.formState.errors.amount} aria-describedby={form.formState.errors.amount ? "amount-error" : undefined} {...form.register("amount", { valueAsNumber: true })} />
            {form.formState.errors.amount && <span id="amount-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.amount.message as string)}</span>}
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