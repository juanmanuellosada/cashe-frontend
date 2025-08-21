"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Star, DollarSign } from "lucide-react"

interface Currency {
  code: string
  name: string
  rate: number
  isPrimary: boolean
  symbol?: string
}

interface CurrencyModalProps {
  mode: "add" | "edit"
  currency?: Currency
  currencies: Currency[]
  onSave: (currency: Currency) => void
  trigger?: React.ReactNode
}

export function CurrencyModal({ mode, currency, currencies, onSave, trigger }: CurrencyModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<Currency>({
    code: "",
    name: "",
    rate: 1,
    isPrimary: false,
    symbol: "",
  })

  const primaryCurrency = currencies.find(c => c.isPrimary)

  useEffect(() => {
    if (mode === "edit" && currency) {
      setFormData(currency)
    } else {
      setFormData({
        code: "",
        name: "",
        rate: 1,
        isPrimary: false,
      })
    }
  }, [mode, currency, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.code || !formData.name || (formData.rate <= 0 && !formData.isPrimary)) {
      return
    }

    // Si se marca como principal, el rate debe ser 1
    const finalData = {
      ...formData,
      code: formData.code.toUpperCase(),
      rate: formData.isPrimary ? 1 : formData.rate,
    }

    onSave(finalData)
    setOpen(false)
  }

  const handleIsPrimaryChange = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      isPrimary: checked,
      rate: checked ? 1 : prev.rate
    }))
  }

  const defaultTrigger = mode === "add" ? (
    <Button className="bg-primary hover:bg-primary/90">
      <Plus className="h-4 w-4 mr-2" />
      Agregar Moneda
    </Button>
  ) : (
    <Button variant="ghost" size="sm" className="h-8 px-2" title="Editar moneda">
      <Edit className="h-3 w-3" />
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {mode === "add" ? "Agregar Nueva Moneda" : "Editar Moneda"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add" 
              ? "Configura una nueva moneda para el sistema"
              : "Modifica los datos de la moneda seleccionada"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código de moneda */}
          <div className="space-y-2">
            <Label htmlFor="currency-code">Código de moneda</Label>
            <Input
              id="currency-code"
              placeholder="USD"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              className="uppercase"
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">
              Código de 3 letras (ej: USD, EUR, ARS)
            </p>
          </div>

          {/* Nombre de moneda */}
          <div className="space-y-2">
            <Label htmlFor="currency-name">Nombre de la moneda</Label>
            <Input
              id="currency-name"
              placeholder="Dólar Estadounidense"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Símbolo de moneda */}
          <div className="space-y-2">
            <Label htmlFor="currency-symbol">Símbolo de la moneda</Label>
            <Input
              id="currency-symbol"
              placeholder="U$S"
              value={formData.symbol || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value }))}
              maxLength={5}
            />
            <p className="text-xs text-muted-foreground">
              Símbolo para mostrar (ej: $, U$S, €, R$)
            </p>
          </div>

          {/* Moneda principal */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Moneda principal
              </Label>
              <p className="text-sm text-muted-foreground">
                La moneda base para todos los cálculos
              </p>
            </div>
            <Switch
              checked={formData.isPrimary}
              onCheckedChange={handleIsPrimaryChange}
              disabled={mode === "edit" && currency?.isPrimary}
            />
          </div>

          {/* Tipo de cambio */}
          {!formData.isPrimary && (
            <div className="space-y-2">
              <Label htmlFor="currency-rate">
                Tipo de cambio
                {primaryCurrency && (
                  <span className="text-muted-foreground ml-1">
                    (1 {formData.code || "XXX"} = ? {primaryCurrency.code})
                  </span>
                )}
              </Label>
              <Input
                id="currency-rate"
                type="number"
                step="0.0001"
                placeholder="0.0011"
                value={formData.rate}
                onChange={(e) => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Valor de 1 {formData.code || "XXX"} expresado en {primaryCurrency?.code || "moneda principal"}
              </p>
            </div>
          )}

          {/* Información adicional */}
          {formData.isPrimary && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Moneda Principal
                </p>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Esta será la moneda base del sistema. Su tipo de cambio siempre será 1.
                {primaryCurrency && primaryCurrency.code !== formData.code && (
                  <span className="block mt-1">
                    Esto cambiará la moneda principal de {primaryCurrency.code} a {formData.code}.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.code || !formData.name || (formData.rate <= 0 && !formData.isPrimary)}
            >
              {mode === "add" ? "Agregar" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
