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
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Monedas</h1>
            <p className="text-muted-foreground">
              Gestiona las monedas disponibles en tu aplicación
            </p>
          </div>
          <CurrencyModal
            mode="add"
            currencies={currencies}
            onSave={addCurrency}
            trigger={
              <Button className="gap-2">
                <DollarSign className="h-4 w-4" />
                Agregar Moneda
              </Button>
            }
          />
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
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{currency.code}</h3>
                        {currency.isPrimary && (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {currency.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tasa: {currency.rate}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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