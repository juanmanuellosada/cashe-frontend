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
import { useRefresh } from "@/contexts/RefreshContext";

interface AddAccountFormProps {
  onAccountAdded?: (newAccount: any) => void;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "campo_obligatorio" }),
  type: z.string().min(1, { message: "campo_obligatorio" }),
  initialBalance: z.preprocess((val) => typeof val === "string" ? Number(val) : val, z.number({ invalid_type_error: "campo_obligatorio" }).min(0, { message: "campo_obligatorio" })),
  currency: z.string().min(1, { message: "campo_obligatorio" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const AddAccountForm: React.FC<AddAccountFormProps> = ({ onAccountAdded }) => {
  const { spreadsheetId, accessToken } = useGoogleApi();
  const { triggerGlobalRefresh } = useRefresh();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();

  const form = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      initialBalance: 0,
      currency: "",
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
      const id = `acc-${Date.now()}`;
      const now = new Date().toISOString();
      const initialBalanceNum = Number(data.initialBalance);
      const values = [[
        data.name,
        data.type,
        initialBalanceNum.toString(),
        initialBalanceNum.toString(), // Saldo actual igual al inicial
        data.currency,
        data.notes,
        now,
        id,
      ]];
      await appendSheetData(accessToken, spreadsheetId, "Accounts!A2:H", values);
      toast({
        title: t("exito"),
        description: t("cuenta_agregada"),
        variant: "default",
      });
      form.reset();
      setOpen(false);
      
      const newAccountData = {
        name: data.name,
        type: data.type,
        initialBalance: initialBalanceNum,
        balance: initialBalanceNum,
        currency: data.currency,
        notes: data.notes,
        lastUpdated: now,
        id,
        icon: undefined, 
      };

      // Llamar a onAccountAdded si se proporcionó (para UI optimista o acciones locales)
      if (onAccountAdded) {
        onAccountAdded(newAccountData);
      }
      
      triggerGlobalRefresh(); // Disparar el refresco global

    } catch (err: any) {
      toast({
        title: t("error"),
        description: err.message || t("error_agregar_cuenta"),
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
          <span>{t("agregar_cuenta")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("nueva_cuenta")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" aria-label={t("formulario_nueva_cuenta")}>
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">{t("nombre")}</label>
            <Input id="name" aria-invalid={!!form.formState.errors.name} aria-describedby={form.formState.errors.name ? "name-error" : undefined} {...form.register("name")} placeholder={t("ejemplo_cuenta_nomina")} />
            {form.formState.errors.name && <span id="name-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.name.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="type" className="block mb-1 font-medium">{t("tipo")}</label>
            <Input id="type" aria-invalid={!!form.formState.errors.type} aria-describedby={form.formState.errors.type ? "type-error" : undefined} {...form.register("type")} placeholder={t("ejemplo_tipo_cuenta")} />
            {form.formState.errors.type && <span id="type-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.type.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="initialBalance" className="block mb-1 font-medium">{t("saldo_inicial")}</label>
            <Input id="initialBalance" type="number" step="0.01" aria-invalid={!!form.formState.errors.initialBalance} aria-describedby={form.formState.errors.initialBalance ? "initialBalance-error" : undefined} {...form.register("initialBalance", { valueAsNumber: true })} placeholder="0.00" />
            {form.formState.errors.initialBalance && <span id="initialBalance-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.initialBalance.message as string)}</span>}
          </div>
          <div>
            <label htmlFor="currency" className="block mb-1 font-medium">{t("moneda")}</label>
            <Input id="currency" aria-invalid={!!form.formState.errors.currency} aria-describedby={form.formState.errors.currency ? "currency-error" : undefined} {...form.register("currency")} placeholder={t("ejemplo_moneda")} />
            {form.formState.errors.currency && <span id="currency-error" className="text-red-600 text-xs" role="alert">{t(form.formState.errors.currency.message as string)}</span>}
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