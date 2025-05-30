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

interface EditTransactionFormProps {
  transaction: any;
  onTransactionUpdated: (updatedTransaction: any) => void;
}

const formSchema = z.object({
  date: z.string().min(1, { message: "campo_obligatorio" }),
  type: z.string().min(1, { message: "campo_obligatorio" }),
  description: z.string().min(1, { message: "campo_obligatorio" }),
  category: z.string().min(1, { message: "campo_obligatorio" }),
  amount: z.preprocess((val) => typeof val === "string" ? Number(val) : val, z.number({ invalid_type_error: "campo_obligatorio" })),
  account: z.string().min(1, { message: "campo_obligatorio" }),
});

type FormValues = z.infer<typeof formSchema>;

export const EditTransactionForm: React.FC<EditTransactionFormProps> = ({ transaction, onTransactionUpdated }) => {
  const { spreadsheetId, accessToken } = useGoogleApi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: transaction.date,
      type: transaction.type,
      description: transaction.description,
      category: transaction.category,
      amount: transaction.amount,
      account: transaction.account,
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
      const range = "Transactions!A2:J";
      const sheetData = await getSheetData(accessToken, spreadsheetId, range);
      if (!sheetData || !sheetData.values) throw new Error(t("no_se_pudo_leer_hoja_transacciones"));
      const rowIndex = sheetData.values.findIndex((row: string[]) => row[9] === transaction.id);
      if (rowIndex === -1) throw new Error(t("no_se_encontro_transaccion_editar"));
      // La fila real en la hoja es rowIndex + 2 (por el encabezado y base 1)
      const targetRange = `Transactions!A${rowIndex + 2}:J${rowIndex + 2}`;
      const values = [[
        data.date,
        data.type,
        data.description,
        data.category,
        data.amount.toString(),
        data.account,
        "", // Tags
        "No", // Recurring
        "", // Notes
        transaction.id,
      ]];
      await updateSheetData(accessToken, spreadsheetId, targetRange, values);
      toast({
        title: t("exito"),
        description: t("transaccion_actualizada"),
        variant: "default",
      });
      setOpen(false);
      onTransactionUpdated({
        ...transaction,
        date: data.date,
        type: data.type,
        description: data.description,
        category: data.category,
        amount: data.amount,
        account: data.account,
      });
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err.message || t("error_editar_transaccion"),
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
          <DialogTitle>{t("editar_transaccion")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-label={t("formulario_editar_transaccion")}>
          <div>
            <label htmlFor="date" className="block mb-1 font-medium">{t("fecha")}</label>
            <Input id="date" type="date" aria-invalid={!!form.formState.errors.date} aria-describedby={form.formState.errors.date ? "date-error" : undefined} {...form.register("date")} />
            {form.formState.errors.date && <span id="date-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.date.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="type" className="block mb-1 font-medium">{t("tipo")}</label>
            <Input id="type" aria-invalid={!!form.formState.errors.type} aria-describedby={form.formState.errors.type ? "type-error" : undefined} {...form.register("type")} />
            {form.formState.errors.type && <span id="type-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.type.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="description" className="block mb-1 font-medium">{t("descripcion")}</label>
            <Input id="description" aria-invalid={!!form.formState.errors.description} aria-describedby={form.formState.errors.description ? "description-error" : undefined} {...form.register("description")} />
            {form.formState.errors.description && <span id="description-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.description.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="category" className="block mb-1 font-medium">{t("categoria")}</label>
            <Input id="category" aria-invalid={!!form.formState.errors.category} aria-describedby={form.formState.errors.category ? "category-error" : undefined} {...form.register("category")} />
            {form.formState.errors.category && <span id="category-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.category.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="amount" className="block mb-1 font-medium">{t("monto")}</label>
            <Input id="amount" type="number" step="0.01" aria-invalid={!!form.formState.errors.amount} aria-describedby={form.formState.errors.amount ? "amount-error" : undefined} {...form.register("amount", { valueAsNumber: true })} />
            {form.formState.errors.amount && <span id="amount-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.amount.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="account" className="block mb-1 font-medium">{t("cuenta")}</label>
            <Input id="account" aria-invalid={!!form.formState.errors.account} aria-describedby={form.formState.errors.account ? "account-error" : undefined} {...form.register("account")} />
            {form.formState.errors.account && <span id="account-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.account.message as string)}</span>}
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