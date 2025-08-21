"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { toast } from "sonner"

export interface Currency {
  code: string
  name: string
  rate: number
  isPrimary: boolean
  symbol?: string
}

interface CurrenciesContextType {
  currencies: Currency[]
  setCurrencies: React.Dispatch<React.SetStateAction<Currency[]>>
  addCurrency: (currency: Currency) => void
  updateCurrency: (currency: Currency) => void
  deleteCurrency: (code: string) => void
  setPrimaryCurrency: (code: string) => void
  getPrimaryCurrency: () => Currency | undefined
}

const CurrenciesContext = createContext<CurrenciesContextType | undefined>(undefined)

interface CurrenciesProviderProps {
  children: ReactNode
}

export function CurrenciesProvider({ children }: CurrenciesProviderProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([
    { code: "ARS", name: "Peso Argentino", rate: 1, isPrimary: true, symbol: "$" },
    { code: "USD", name: "Dólar Estadounidense", rate: 0.0011, isPrimary: false, symbol: "U$S" },
    { code: "EUR", name: "Euro", rate: 0.0010, isPrimary: false, symbol: "€" },
    { code: "BRL", name: "Real Brasileño", rate: 0.0057, isPrimary: false, symbol: "R$" },
  ])

  const addCurrency = (newCurrency: Currency) => {
    try {
      if (newCurrency.isPrimary) {
        setCurrencies(prev => [
          ...prev.map(c => ({ ...c, isPrimary: false })),
          newCurrency
        ])
      } else {
        setCurrencies(prev => [...prev, newCurrency])
      }
      
      // Mostrar notificación de éxito
      toast.success("Moneda agregada exitosamente", {
        description: `${newCurrency.name} (${newCurrency.code}) ha sido agregada`,
      })
    } catch (error) {
      toast.error("Error al agregar la moneda", {
        description: "Hubo un problema al guardar la moneda. Inténtalo de nuevo.",
      })
    }
  }

  const updateCurrency = (editedCurrency: Currency) => {
    try {
      setCurrencies(prev => prev.map(currency => {
        if (currency.code === editedCurrency.code) {
          return editedCurrency
        }
        if (editedCurrency.isPrimary) {
          return { ...currency, isPrimary: false }
        }
        return currency
      }))
      
      // Mostrar notificación de éxito
      toast.success("Moneda actualizada exitosamente", {
        description: `${editedCurrency.name} ha sido modificada`,
      })
    } catch (error) {
      toast.error("Error al actualizar la moneda", {
        description: "Hubo un problema al actualizar la moneda. Inténtalo de nuevo.",
      })
    }
  }

  const deleteCurrency = (code: string) => {
    try {
      const currency = currencies.find(c => c.code === code)
      setCurrencies(prev => prev.filter(currency => currency.code !== code))
      
      // Mostrar notificación de éxito
      toast.success("Moneda eliminada exitosamente", {
        description: currency ? `${currency.name} (${currency.code}) ha sido eliminada` : "La moneda ha sido eliminada",
      })
    } catch (error) {
      toast.error("Error al eliminar la moneda", {
        description: "Hubo un problema al eliminar la moneda. Inténtalo de nuevo.",
      })
    }
  }

  const setPrimaryCurrency = (code: string) => {
    try {
      const currency = currencies.find(c => c.code === code)
      setCurrencies(prev => prev.map(currency => ({
        ...currency,
        isPrimary: currency.code === code
      })))
      
      // Mostrar notificación de éxito
      toast.success("Moneda principal actualizada", {
        description: currency ? `${currency.name} (${currency.code}) es ahora la moneda principal` : "Moneda principal cambiada",
      })
    } catch (error) {
      toast.error("Error al cambiar la moneda principal", {
        description: "Hubo un problema al cambiar la moneda principal. Inténtalo de nuevo.",
      })
    }
  }

  const getPrimaryCurrency = () => {
    return currencies.find(currency => currency.isPrimary)
  }

  const value = {
    currencies,
    setCurrencies,
    addCurrency,
    updateCurrency,
    deleteCurrency,
    setPrimaryCurrency,
    getPrimaryCurrency
  }

  return (
    <CurrenciesContext.Provider value={value}>
      {children}
    </CurrenciesContext.Provider>
  )
}

export function useCurrencies() {
  const context = useContext(CurrenciesContext)
  if (context === undefined) {
    throw new Error('useCurrencies must be used within a CurrenciesProvider')
  }
  return context
}
