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

interface AddCardFormProps {
  onCardAdded: (newCard: any) => void;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "campo_obligatorio" }),
  bank: z.string().min(1, { message: "campo_obligatorio" }),
  lastDigits: z.string().min(3, { message: "campo_obligatorio_digitos" }).max(4, { message: "campo_obligatorio_digitos" }),
  limit: z.preprocess((val) => typeof val === "string" ? Number(val) : val, z.number({ invalid_type_error: "campo_obligatorio" })),
  balance: z.preprocess((val) => typeof val === "string" ? Number(val) : val, z.number({ invalid_type_error: "campo_obligatorio" })),
  dueDate: z.string().min(1, { message: "campo_obligatorio" }),
  daysLeft: z.preprocess((val) => typeof val === "string" ? Number(val) : val, z.number({ invalid_type_error: "campo_obligatorio" })),
});

type FormValues = z.infer<typeof formSchema>;

export const AddCardForm: React.FC<AddCardFormProps> = ({ onCardAdded }) => {
  const { spreadsheetId, accessToken } = useGoogleApi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      bank: "",
      lastDigits: "",
      limit: 0,
      balance: 0,
      dueDate: "",
      daysLeft: 0,
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
      const id = `card-${Date.now()}`;
      const values = [[
        data.name,
        data.bank,
        data.lastDigits,
        data.limit.toString(),
        data.balance.toString(),
        data.dueDate,
        data.daysLeft.toString(),
        id,
      ]];
      await appendSheetData(accessToken, spreadsheetId, "Cards!A2:H", values);
      toast({
        title: t("exito"),
        description: t("tarjeta_agregada"),
        variant: "default",
      });
      form.reset();
      setOpen(false);
      // Pasar la nueva tarjeta al padre
      onCardAdded({
        name: data.name,
        bank: data.bank,
        lastDigits: data.lastDigits,
        limit: data.limit,
        balance: data.balance,
        dueDate: data.dueDate,
        daysLeft: data.daysLeft,
        id,
      });
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err.message || t("error_agregar_tarjeta"),
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
          <span>{t("agregar_tarjeta")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("nueva_tarjeta")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-label={t("formulario_nueva_tarjeta")}>
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">{t("nombre")}</label>
            <Input id="name" aria-invalid={!!form.formState.errors.name} aria-describedby={form.formState.errors.name ? "name-error" : undefined} {...form.register("name")} placeholder={t("ejemplo_tarjeta_nombre")} />
            {form.formState.errors.name && <span id="name-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.name.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="bank" className="block mb-1 font-medium">{t("banco")}</label>
            <Input id="bank" aria-invalid={!!form.formState.errors.bank} aria-describedby={form.formState.errors.bank ? "bank-error" : undefined} {...form.register("bank")} placeholder={t("ejemplo_banco")} />
            {form.formState.errors.bank && <span id="bank-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.bank.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="lastDigits" className="block mb-1 font-medium">{t("ultimos_digitos")}</label>
            <Input id="lastDigits" aria-invalid={!!form.formState.errors.lastDigits} aria-describedby={form.formState.errors.lastDigits ? "lastDigits-error" : undefined} {...form.register("lastDigits")} placeholder={t("ejemplo_ultimos_digitos")} />
            {form.formState.errors.lastDigits && <span id="lastDigits-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.lastDigits.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="limit" className="block mb-1 font-medium">{t("limite")}</label>
            <Input id="limit" type="number" step="0.01" aria-invalid={!!form.formState.errors.limit} aria-describedby={form.formState.errors.limit ? "limit-error" : undefined} {...form.register("limit", { valueAsNumber: true })} placeholder="0.00" />
            {form.formState.errors.limit && <span id="limit-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.limit.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="balance" className="block mb-1 font-medium">{t("saldo_actual")}</label>
            <Input id="balance" type="number" step="0.01" aria-invalid={!!form.formState.errors.balance} aria-describedby={form.formState.errors.balance ? "balance-error" : undefined} {...form.register("balance", { valueAsNumber: true })} placeholder="0.00" />
            {form.formState.errors.balance && <span id="balance-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.balance.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="dueDate" className="block mb-1 font-medium">{t("fecha_vencimiento")}</label>
            <Input id="dueDate" aria-invalid={!!form.formState.errors.dueDate} aria-describedby={form.formState.errors.dueDate ? "dueDate-error" : undefined} {...form.register("dueDate")} placeholder={t("ejemplo_fecha_vencimiento")} />
            {form.formState.errors.dueDate && <span id="dueDate-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.dueDate.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="daysLeft" className="block mb-1 font-medium">{t("dias_restantes")}</label>
            <Input id="daysLeft" type="number" aria-invalid={!!form.formState.errors.daysLeft} aria-describedby={form.formState.errors.daysLeft ? "daysLeft-error" : undefined} {...form.register("daysLeft", { valueAsNumber: true })} placeholder="5" />
            {form.formState.errors.daysLeft && <span id="daysLeft-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.daysLeft.message as string)}</span>}
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