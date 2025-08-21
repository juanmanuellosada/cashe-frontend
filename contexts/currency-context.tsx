"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Currency, CURRENCIES, convertCurrency, formatCurrency, ExchangeRates, EXCHANGE_RATES } from '@/lib/currency'

interface CurrencyContextType {
  displayCurrency: Currency
  setDisplayCurrency: (currency: Currency) => void
  convertToDisplayCurrency: (amount: number, fromCurrency: string) => number
  formatDisplayAmount: (amount: number, fromCurrency: string) => string
  formatOriginalAmount: (amount: number, currency: string) => string
  exchangeRates: ExchangeRates
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

interface CurrencyProviderProps {
  children: ReactNode
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [displayCurrency, setDisplayCurrencyState] = useState<Currency>(CURRENCIES[0]) // USD por defecto
  const [exchangeRates] = useState<ExchangeRates>(EXCHANGE_RATES)

  useEffect(() => {
    // Cargar moneda guardada del localStorage
    const savedCurrency = localStorage.getItem('cashe-display-currency')
    if (savedCurrency) {
      const currency = CURRENCIES.find(c => c.code === savedCurrency)
      if (currency) {
        setDisplayCurrencyState(currency)
      }
    }
  }, [])

  const setDisplayCurrency = (currency: Currency) => {
    setDisplayCurrencyState(currency)
    localStorage.setItem('cashe-display-currency', currency.code)
  }

  const convertToDisplayCurrency = (amount: number, fromCurrency: string): number => {
    return convertCurrency(amount, fromCurrency, displayCurrency.code, exchangeRates)
  }

  const formatDisplayAmount = (amount: number, fromCurrency: string): string => {
    const convertedAmount = convertToDisplayCurrency(amount, fromCurrency)
    return formatCurrency(convertedAmount, displayCurrency.code)
  }

  const formatOriginalAmount = (amount: number, currency: string): string => {
    return formatCurrency(amount, currency)
  }

  const value: CurrencyContextType = {
    displayCurrency,
    setDisplayCurrency,
    convertToDisplayCurrency,
    formatDisplayAmount,
    formatOriginalAmount,
    exchangeRates,
  }

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
