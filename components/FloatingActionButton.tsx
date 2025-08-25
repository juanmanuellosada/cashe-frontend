"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DollarSign, Minus, ArrowRightLeft, CreditCard, Tag, HelpCircle, Sparkles, Zap } from "lucide-react"
import { useHotkeys } from "react-hotkeys-hook"
import { motion, AnimatePresence } from "framer-motion"

interface FloatingActionButtonProps {
  onNewIncome: () => void
  onNewExpense: () => void
  onNewTransfer: () => void
  onNewAccount: () => void
  onNewCategory: () => void
  className?: string
}

export function FloatingActionButton({
  onNewIncome,
  onNewExpense,
  onNewTransfer,
  onNewAccount,
  onNewCategory,
  className
}: FloatingActionButtonProps) {
  const [showHelp, setShowHelp] = useState(false)
  const [forceTooltipOpen, setForceTooltipOpen] = useState(false)

  // Show tooltip automatically for 3 seconds when component mounts
  useEffect(() => {
    setForceTooltipOpen(true)
    const timer = setTimeout(() => {
      setForceTooltipOpen(false)
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [])

  // Keyboard shortcuts for direct actions
  useHotkeys('i', (e) => {
    e.preventDefault()
    onNewIncome()
  }, { enableOnFormTags: false })

  useHotkeys('g', (e) => {
    e.preventDefault()
    onNewExpense()
  }, { enableOnFormTags: false })

  useHotkeys('t', (e) => {
    e.preventDefault()
    onNewTransfer()
  }, { enableOnFormTags: false })

  useHotkeys('c', (e) => {
    e.preventDefault()
    onNewAccount()
  }, { enableOnFormTags: false })

  useHotkeys('a', (e) => {
    e.preventDefault()
    onNewCategory()
  }, { enableOnFormTags: false })

  // Help dialog shortcut
  useHotkeys('f1', (e) => {
    e.preventDefault()
    setShowHelp(true)
  }, { enableOnFormTags: false })

  useHotkeys('escape', (e) => {
    e.preventDefault()
    setShowHelp(false)
  }, { enableOnFormTags: false })

  const shortcuts = [
    { key: 'I', description: 'Nuevo Ingreso', icon: DollarSign },
    { key: 'G', description: 'Nuevo Gasto', icon: Minus },
    { key: 'T', description: 'Nueva Transferencia', icon: ArrowRightLeft },
    { key: 'C', description: 'Nueva Cuenta', icon: CreditCard },
    { key: 'A', description: 'Nueva Categoría', icon: Tag },
    { key: 'F1', description: 'Mostrar ayuda', icon: HelpCircle },
  ]

  return (
    <TooltipProvider delayDuration={200}>
      {/* Enhanced Help Dialog */}
      <AnimatePresence mode="wait">
        {showHelp && (
          <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border shadow-2xl overflow-hidden">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 40,
                  duration: 0.15 
                }}
              >
                <DialogHeader className="space-y-4">
                  <motion.div 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      Atajos de teclado
                    </DialogTitle>
                  </motion.div>
                </DialogHeader>
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  {shortcuts.map((shortcut, index) => {
                    const Icon = shortcut.icon
                    return (
                      <motion.div 
                        key={shortcut.key} 
                        className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-muted/50 transition-all duration-200 border"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 + (index * 0.05) }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-3">
                          <motion.div 
                            className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 flex items-center justify-center"
                            whileHover={{ scale: 1.1 }}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </motion.div>
                          <span className="font-medium text-foreground">{shortcut.description}</span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs bg-muted border-border text-muted-foreground">
                          {shortcut.key}
                        </Badge>
                      </motion.div>
                    )
                  })}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Separator className="bg-border" />
                  <p className="text-sm text-muted-foreground text-center bg-muted/30 p-3 rounded-lg">
                    <Zap className="w-4 h-4 inline mr-2 text-orange-500" />
                    Presiona <kbd className="px-2 py-1 bg-muted rounded text-foreground">Esc</kbd> para cerrar
                  </p>
                </motion.div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Simple Help Button */}
      <motion.div 
        className={`fixed bottom-6 right-6 z-50 ${className}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 25,
          delay: 0.3 
        }}
      >
        {forceTooltipOpen ? (
          <Tooltip open={true}>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Button
                  size="lg"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-white shadow-xl transition-all duration-300 border-2 border-orange-400 hover:border-orange-500 hover:shadow-[0_0_25px_rgba(251,146,60,0.5)] relative overflow-hidden"
                  onClick={() => setShowHelp(true)}
                >
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-orange-300/20 to-amber-300/20 rounded-full"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  <HelpCircle className="h-20 w-20 z-10 drop-shadow-lg" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-popover text-popover-foreground border-border shadow-lg" asChild>
              <motion.div
                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="flex items-center gap-2">
                  Ayuda
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground">F1</kbd>
                </div>
              </motion.div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Button
                  size="lg"
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-white shadow-xl transition-all duration-300 border-2 border-orange-400 hover:border-orange-500 hover:shadow-[0_0_25px_rgba(251,146,60,0.5)] relative overflow-hidden"
                  onClick={() => setShowHelp(true)}
                >
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-orange-300/20 to-amber-300/20 rounded-full"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                  <HelpCircle className="h-20 w-20 z-10 drop-shadow-lg" />
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-popover text-popover-foreground border-border shadow-lg" asChild>
              <motion.div
                initial={{ opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="flex items-center gap-2">
                  Ayuda
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground">F1</kbd>
                </div>
              </motion.div>
            </TooltipContent>
          </Tooltip>
        )}
      </motion.div>
    </TooltipProvider>
  )
}
