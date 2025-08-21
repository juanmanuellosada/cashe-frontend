"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { CurrencyModal } from "@/components/currency-modal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Star, Trash2 } from "lucide-react"
import { useCurrencies } from "@/contexts/currencies-context"

export default function CurrenciesPage() {
  const { 
    currencies, 
    addCurrency, 
    updateCurrency, 
    deleteCurrency, 
    setPrimaryCurrency 
  } = useCurrencies()

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Monedas</h1>
            <p className="text-muted-foreground">
              Gestiona las monedas disponibles en tu aplicación
            </p>
          </div>
          <div className="flex-shrink-0">
            <CurrencyModal
              mode="add"
              currencies={currencies}
              onSave={addCurrency}
              trigger={
                <Button className="gap-2 w-full sm:w-auto">
                  <DollarSign className="h-4 w-4" />
                  <span className="sm:inline">Agregar Moneda</span>
                </Button>
              }
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Monedas</CardTitle>
            <CardDescription>
              Configura las monedas que estarán disponibles y sus tasas de cambio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currencies.map((currency) => (
                <div
                  key={currency.code}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{currency.code}</h3>
                        {currency.isPrimary && (
                          <Badge variant="default" className="gap-1 flex-shrink-0">
                            <Star className="h-3 w-3" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {currency.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tasa: {currency.rate}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-end sm:justify-start flex-shrink-0">
                    {!currency.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryCurrency(currency.code)}
                        className="gap-1"
                      >
                        <Star className="h-3 w-3" />
                        Hacer Principal
                      </Button>
                    )}
                    <CurrencyModal
                      mode="edit"
                      currency={currency}
                      currencies={currencies}
                      onSave={updateCurrency}
                      trigger={
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      }
                    />
                    {!currency.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteCurrency(currency.code)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}