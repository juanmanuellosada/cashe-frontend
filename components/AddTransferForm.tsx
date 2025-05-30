import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGoogleApi } from "@/hooks/useGoogleApi";
import { appendSheetData } from "@/lib/googleApi";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";

interface AddTransferFormProps {
  onTransferAdded: (newTransfer: any) => void;
}

const formSchema = z.object({
  date: z.string().min(1, { message: "campo_obligatorio" }),
  fromAccount: z.string().min(1, { message: "campo_obligatorio" }),
  toAccount: z.string().min(1, { message: "campo_obligatorio" }),
  amount: z.preprocess((val) => typeof val === "string" ? Number(val) : val, z.number({ invalid_type_error: "campo_obligatorio" })),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const AddTransferForm: React.FC<AddTransferFormProps> = ({ onTransferAdded }) => {
  const { spreadsheetId, accessToken } = useGoogleApi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      fromAccount: "",
      toAccount: "",
      amount: 0,
      notes: "",
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
      // Generar un ID único (timestamp)
      const id = `transfer-${Date.now()}`;
      const values = [[
        data.date,
        data.fromAccount,
        data.toAccount,
        data.amount.toString(),
        id,
        data.notes || "",
      ]];
      await appendSheetData(accessToken, spreadsheetId, "Transfers!A2:F", values);
      toast({
        title: t("exito"),
        description: t("transferencia_agregada"),
        variant: "default",
      });
      form.reset();
      setOpen(false);
      // Pasar la nueva transferencia al padre
      onTransferAdded({
        date: data.date,
        fromAccount: data.fromAccount,
        toAccount: data.toAccount,
        amount: data.amount,
        id,
        notes: data.notes || "",
      });
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err.message || t("error_agregar_transferencia"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1">
          <span>{t("nueva_transferencia")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("nueva_transferencia")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-label={t("formulario_nueva_transferencia")}>
          <div>
            <label htmlFor="date" className="block mb-1 font-medium">{t("fecha")}</label>
            <Input id="date" type="date" aria-invalid={!!form.formState.errors.date} aria-describedby={form.formState.errors.date ? "date-error" : undefined} {...form.register("date")} />
            {form.formState.errors.date && <span id="date-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.date.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="fromAccount" className="block mb-1 font-medium">{t("cuenta_origen")}</label>
            <Input id="fromAccount" aria-invalid={!!form.formState.errors.fromAccount} aria-describedby={form.formState.errors.fromAccount ? "fromAccount-error" : undefined} {...form.register("fromAccount")} placeholder={t("ejemplo_cuenta_origen")} />
            {form.formState.errors.fromAccount && <span id="fromAccount-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.fromAccount.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="toAccount" className="block mb-1 font-medium">{t("cuenta_destino")}</label>
            <Input id="toAccount" aria-invalid={!!form.formState.errors.toAccount} aria-describedby={form.formState.errors.toAccount ? "toAccount-error" : undefined} {...form.register("toAccount")} placeholder={t("ejemplo_cuenta_destino")} />
            {form.formState.errors.toAccount && <span id="toAccount-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.toAccount.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="amount" className="block mb-1 font-medium">{t("monto")}</label>
            <Input id="amount" type="number" step="0.01" aria-invalid={!!form.formState.errors.amount} aria-describedby={form.formState.errors.amount ? "amount-error" : undefined} {...form.register("amount", { valueAsNumber: true })} placeholder="0.00" />
            {form.formState.errors.amount && <span id="amount-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.amount.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="notes" className="block mb-1 font-medium">{t("notas")}</label>
            <Input id="notes" {...form.register("notes")} placeholder={t("opcional")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("cancelar")}</Button>
            <Button type="submit" disabled={loading}>{loading ? t("agregando") : t("agregar")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 