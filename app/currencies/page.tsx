"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { motion } from "framer-motion"
import { CurrencyModal } from "@/components/currency-modal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Star, Trash2 } from "lucide-react"
import { useCurrencies } from "@/contexts/currencies-context"

interface Currency {
  code: string
  name: string
  rate: number
  isPrimary: boolean
  symbol?: string
}

export default function CurrenciesPage() {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<Currency | undefined>(undefined)
  
  const { 
    currencies, 
    addCurrency, 
    updateCurrency, 
    deleteCurrency, 
    setPrimaryCurrency 
  } = useCurrencies()

  const handleEditCurrency = (currency: Currency) => {
    setEditingCurrency(currency)
    setEditModalOpen(true)
  }
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
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 45,
                duration: 0.1,
              }}
              style={{ display: "inline-block" }}
            >
              <Button 
                className="gap-2 w-full sm:w-auto"
                onClick={() => setAddModalOpen(true)}
              >
                <DollarSign className="h-4 w-4" />
                <span className="sm:inline">Agregar Moneda</span>
              </Button>
            </motion.div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Monedas</CardTitle>
            <CardDescription>
              Administra las monedas disponibles para tu aplicación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currencies.map((currency) => (
                <div key={currency.code} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{currency.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {currency.code}
                        </Badge>
                        {currency.isPrimary && (
                          <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600">
                            <Star className="mr-1 h-3 w-3" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tasa: {currency.rate} {currency.symbol && `(${currency.symbol})`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!currency.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryCurrency(currency.code)}
                        className="text-xs"
                      >
                        <Star className="mr-1 h-3 w-3" />
                        Hacer Principal
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditCurrency(currency)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteCurrency(currency.code)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {currencies.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No hay monedas configuradas</p>
                  <p className="text-sm">Agrega tu primera moneda para comenzar</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modales */}
      <CurrencyModal
        mode="add"
        currencies={currencies}
        onSave={addCurrency}
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
      
      <CurrencyModal
        mode="edit"
        currency={editingCurrency}
        currencies={currencies}
        onSave={updateCurrency}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
      />
    </DashboardLayout>
  )
}