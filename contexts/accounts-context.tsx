"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Account {
  id: string
  name: string
  balance: number
  currency: string
  type: 'checking' | 'savings' | 'credit' | 'cash'
  isActive: boolean
  description?: string
  color: string
  icon: string
  image?: string | null
  createdAt: string
}

interface AccountsContextType {
  accounts: Account[]
  addAccount: (account: Omit<Account, 'id' | 'createdAt'>) => void
  updateAccount: (id: string, account: Partial<Account>) => void
  deleteAccount: (id: string) => void
  getAccountById: (id: string) => Account | undefined
  getActiveAccounts: () => Account[]
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined)

// Cuentas por defecto
const defaultAccounts: Account[] = [
  {
    id: '1',
    name: 'Cuenta Sueldo',
    balance: 125000,
    currency: 'ARS',
    type: 'checking',
    isActive: true,
    description: 'Cuenta principal para recibir el sueldo',
    color: '#3B82F6',
    icon: 'landmark',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Tarjeta Crédito',
    balance: -15000,
    currency: 'ARS',
    type: 'credit',
    isActive: true,
    description: 'Tarjeta de crédito Visa',
    color: '#EF4444',
    icon: 'credit-card',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Efectivo',
    balance: 8500,
    currency: 'ARS',
    type: 'cash',
    isActive: true,
    description: 'Dinero en efectivo',
    color: '#10B981',
    icon: 'banknote',
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Ahorros USD',
    balance: 1200,
    currency: 'USD',
    type: 'savings',
    isActive: true,
    description: 'Cuenta de ahorros en dólares',
    color: '#8B5CF6',
    icon: 'piggy-bank',
    createdAt: new Date().toISOString()
  }
]

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([])

  // Cargar cuentas desde localStorage al inicializar
  useEffect(() => {
    const savedAccounts = localStorage.getItem('cashe-accounts')
    if (savedAccounts) {
      try {
        const parsed = JSON.parse(savedAccounts)
        setAccounts(parsed)
      } catch (error) {
        console.error('Error parsing saved accounts:', error)
        setAccounts(defaultAccounts)
        localStorage.setItem('cashe-accounts', JSON.stringify(defaultAccounts))
      }
    } else {
      setAccounts(defaultAccounts)
      localStorage.setItem('cashe-accounts', JSON.stringify(defaultAccounts))
    }
  }, [])

  // Guardar cuentas en localStorage cuando cambien
  useEffect(() => {
    if (accounts.length > 0) {
      localStorage.setItem('cashe-accounts', JSON.stringify(accounts))
    }
  }, [accounts])

  const addAccount = (accountData: Omit<Account, 'id' | 'createdAt'>) => {
    const newAccount: Account = {
      ...accountData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    }
    setAccounts(prev => [...prev, newAccount])
  }

  const updateAccount = (id: string, accountData: Partial<Account>) => {
    setAccounts(prev =>
      prev.map(account =>
        account.id === id ? { ...account, ...accountData } : account
      )
    )
  }

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(account => account.id !== id))
  }

  const getAccountById = (id: string): Account | undefined => {
    return accounts.find(account => account.id === id)
  }

  const getActiveAccounts = (): Account[] => {
    return accounts.filter(account => account.isActive)
  }

  const contextValue: AccountsContextType = {
    accounts,
    addAccount,
    updateAccount,
    deleteAccount,
    getAccountById,
    getActiveAccounts
  }

  return (
    <AccountsContext.Provider value={contextValue}>
      {children}
    </AccountsContext.Provider>
  )
}

export function useAccounts() {
  const context = useContext(AccountsContext)
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountsProvider')
  }
  return context
}
