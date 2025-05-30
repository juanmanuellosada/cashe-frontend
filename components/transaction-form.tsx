"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { appendSheetData } from "@/lib/googleApi"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "react-i18next"
import React from "react"
import { useRefresh } from "@/contexts/RefreshContext"

const formSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().min(1, "campo_obligatorio"),
  description: z.string().min(1, "campo_obligatorio"),
  category: z.string().min(1, "campo_obligatorio"),
  account: z.string().min(1, "campo_obligatorio"),
  date: z.date(),
})

interface TransactionFormProps {
  spreadsheetId?: string;
  accessToken?: string;
  onSuccess?: (newTransaction: any) => void;
  type?: "income" | "expense";
  hideTypeSelector?: boolean;
}

export function TransactionForm({ spreadsheetId, accessToken, onSuccess, type, hideTypeSelector }: TransactionFormProps) {
  const [date, setDate] = useState<Date>(new Date())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation()
  const { triggerGlobalRefresh } = useRefresh()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: type || "expense",
      amount: "",
      description: "",
      category: "",
      account: "",
      date: new Date(),
    },
  })

  // Si cambia la prop 'type', actualizar el valor en el formulario
  // (esto es útil si el usuario cambia de tab)
  useEffect(() => {
    if (type) {
      form.setValue("type", type)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Validar que tenemos acceso a Google Sheets
    if (!spreadsheetId || !accessToken) {
      toast({
        title: t("error_guardar_transaccion"),
        description: t("necesario_google_guardar"),
        variant: "destructive",
      })
      return;
    }

    try {
      setIsSubmitting(true)
      
      // Formatear la fecha como YYYY-MM-DD
      const formattedDate = format(values.date, "yyyy-MM-dd");
      
      // Formatear el monto (asegurando que sea un número)
      const amount = parseFloat(values.amount);
      
      // Generar un ID único para la transacción
      const transactionId = `tx-${Date.now()}`;
      
      // Preparar los datos según la estructura de la hoja Transactions
      // [Date, Type, Description, Category, Amount, Account, Tags, Recurring, Notes, ID]
      const rowData = [
        formattedDate,
        values.type,
        values.description,
        values.category,
        amount.toString(),
        values.account,
        "", // Tags (vacío por ahora)
        "No", // Recurring (No por defecto)
        "", // Notes (vacío por ahora)
        transactionId
      ];
      
      // Guardar en la hoja de cálculo
      await appendSheetData(accessToken, spreadsheetId, "Transactions!A:J", [rowData]);
      
      toast({
        title: t("transaccion_guardada"),
        description: t("transaccion_guardada_exito"),
        variant: "default",
      })

      // Resetear el formulario
      form.reset({
        type: "expense",
        amount: "",
        description: "",
        category: "",
        account: "",
        date: new Date(),
      });
      
      // Llamar al callback de éxito si existe
      if (onSuccess) {
        onSuccess({
          id: transactionId,
          date: formattedDate,
          type: values.type,
          description: values.description,
          category: values.category,
          amount: amount,
          account: values.account,
        });
      }

      triggerGlobalRefresh()

    } catch (error) {
      console.error("Error guardando la transacción:", error);
      toast({
        title: t("error_guardar"),
        description: error instanceof Error ? error.message : t("error_inesperado"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false);
    }
  }

  // Categorías de ejemplo
  const expenseCategories = [
    t("alimentacion"),
    t("transporte"),
    t("ocio"),
    t("vivienda"),
    t("salud"),
    t("servicios"),
    t("educacion"),
    t("ropa"),
    t("regalos"),
    t("otros"),
  ]

  const incomeCategories = [t("salario"), t("freelance"), t("inversiones"), t("regalos"), t("reembolsos"), t("otros")]

  // Cuentas de ejemplo
  const accounts = [t("cuenta_corriente"), t("cuenta_ahorros"), t("efectivo"), t("tarjeta_visa"), t("tarjeta_mastercard")]

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6" aria-label={t("formulario_nueva_transaccion")}>
        {!hideTypeSelector && (
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel>{t("tipo_transaccion")}</FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-2">
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="expense" id="expense" />
                      <FormLabel htmlFor="expense" className="cursor-pointer font-normal">
                        {t("gasto")}
                      </FormLabel>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="income" id="income" />
                      <FormLabel htmlFor="income" className="cursor-pointer font-normal">
                        {t("ingreso")}
                      </FormLabel>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("monto")}</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input type="number" step="0.01" placeholder="0.00" className="pl-7" aria-label={t("monto")} {...field} />
                </div>
              </FormControl>
              <FormMessage>{form.formState.errors.amount && t(form.formState.errors.amount.message as string)}</FormMessage>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("descripcion")}</FormLabel>
              <FormControl>
                <Input placeholder={t("ejemplo_descripcion")} aria-label={t("descripcion")} {...field} />
              </FormControl>
              <FormMessage>{form.formState.errors.description && t(form.formState.errors.description.message as string)}</FormMessage>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("categoria")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger aria-label={t("categoria")}> 
                    <SelectValue placeholder={t("selecciona_categoria")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(form.watch("type") === "expense" ? expenseCategories : incomeCategories).map((category) => (
                    <SelectItem key={category} value={category} aria-label={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage>{form.formState.errors.category && t(form.formState.errors.category.message as string)}</FormMessage>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="account"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("cuenta")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger aria-label={t("cuenta")}> 
                    <SelectValue placeholder={t("selecciona_cuenta")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account} value={account} aria-label={account}>
                      {account}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage>{form.formState.errors.account && t(form.formState.errors.account.message as string)}</FormMessage>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("fecha")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      aria-label={t("fecha")}
                    >
                      {field.value ? format(field.value, "PPP", { locale: es }) : <span>{t("selecciona_fecha")}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      if (date) {
                        field.onChange(date)
                        setDate(date)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting} aria-label={t("guardar_transaccion")}> 
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("guardando")}
            </>
          ) : (
            t("guardar_transaccion")
          )}
        </Button>

        {!spreadsheetId || !accessToken ? (
          <p className="text-center text-sm text-red-500 mt-2" role="alert" aria-live="polite">
            {t("necesario_google_guardar")}
          </p>
        ) : null}
      </form>
    </Form>
  )
}
