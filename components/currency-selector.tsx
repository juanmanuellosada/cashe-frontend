"use client"

import { Check, ChevronDown } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/contexts/currency-context"
import { useCurrencies } from "@/contexts/currencies-context"

export function CurrencySelector() {
  const { displayCurrency, setDisplayCurrency } = useCurrency()
  const { currencies } = useCurrencies()
  const [open, setOpen] = useState(false)

  const handleCurrencySelect = (currency: any) => {
    // Convertir el formato de Currency del contexto al formato esperado por useCurrency
    const currencyForDisplay = {
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol || currency.code
    }
    setDisplayCurrency(currencyForDisplay)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-auto justify-between gap-2 px-3"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{displayCurrency.symbol}</span>
            <span className="text-sm text-muted-foreground">{displayCurrency.code}</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="max-h-60 overflow-y-auto">
          <div className="px-2 py-2">
            <div className="text-sm font-medium text-muted-foreground px-2 py-1">
              Moneda de visualización
            </div>
            {currencies.map((currency) => (
              <button
                key={currency.code}
                onClick={() => handleCurrencySelect(currency)}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors border-2 border-transparent",
                  displayCurrency.code === currency.code && "border-primary"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium w-6">{currency.symbol}</span>
                  <div className="text-left">
                    <div className="font-medium">{currency.code}</div>
                    <div className="text-xs text-muted-foreground">{currency.name}</div>
                  </div>
                </div>
                {displayCurrency.code === currency.code && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
          <div className="border-t px-2 py-2">
            <div className="text-xs text-muted-foreground px-2">
              Los totales se muestran en {displayCurrency.name}.
              <br />
              Las transacciones mantienen su moneda original.
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
