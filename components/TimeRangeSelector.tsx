"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters, subYears } from "date-fns"
import { es } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { motion, AnimatePresence } from "framer-motion"

interface TimeRangeSelectorProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  className?: string
}

const timePresets = [
  {
    label: "Hoy",
    getValue: () => {
      const today = new Date()
      return { from: today, to: today }
    }
  },
  {
    label: "Ayer",
    getValue: () => {
      const yesterday = subDays(new Date(), 1)
      return { from: yesterday, to: yesterday }
    }
  },
  {
    label: "Esta semana",
    getValue: () => {
      const today = new Date()
      return { 
        from: startOfWeek(today, { weekStartsOn: 1 }), 
        to: endOfWeek(today, { weekStartsOn: 1 }) 
      }
    }
  },
  {
    label: "Semana pasada",
    getValue: () => {
      const lastWeek = subWeeks(new Date(), 1)
      return { 
        from: startOfWeek(lastWeek, { weekStartsOn: 1 }), 
        to: endOfWeek(lastWeek, { weekStartsOn: 1 }) 
      }
    }
  },
  {
    label: "Este mes",
    getValue: () => {
      const today = new Date()
      return { 
        from: startOfMonth(today), 
        to: endOfMonth(today) 
      }
    }
  },
  {
    label: "Mes pasado",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return { 
        from: startOfMonth(lastMonth), 
        to: endOfMonth(lastMonth) 
      }
    }
  },
  {
    label: "Este trimestre",
    getValue: () => {
      const today = new Date()
      return { 
        from: startOfQuarter(today), 
        to: endOfQuarter(today) 
      }
    }
  },
  {
    label: "Trimestre pasado",
    getValue: () => {
      const lastQuarter = subQuarters(new Date(), 1)
      return { 
        from: startOfQuarter(lastQuarter), 
        to: endOfQuarter(lastQuarter) 
      }
    }
  },
  {
    label: "Este año",
    getValue: () => {
      const today = new Date()
      return { 
        from: startOfYear(today), 
        to: endOfYear(today) 
      }
    }
  },
  {
    label: "Año pasado",
    getValue: () => {
      const lastYear = subYears(new Date(), 1)
      return { 
        from: startOfYear(lastYear), 
        to: endOfYear(lastYear) 
      }
    }
  },
  {
    label: "Últimos 7 días",
    getValue: () => {
      const today = new Date()
      return { 
        from: subDays(today, 6), 
        to: today 
      }
    }
  },
  {
    label: "Últimos 30 días",
    getValue: () => {
      const today = new Date()
      return { 
        from: subDays(today, 29), 
        to: today 
      }
    }
  },
  {
    label: "Últimos 90 días",
    getValue: () => {
      const today = new Date()
      return { 
        from: subDays(today, 89), 
        to: today 
      }
    }
  },
  {
    label: "Todo el tiempo",
    getValue: () => {
      return { 
        from: new Date(2020, 0, 1), 
        to: new Date() 
      }
    }
  }
]

export function TimeRangeSelector({ dateRange, onDateRangeChange, className }: TimeRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) {
      return "Seleccionar período"
    }
    if (!range.to) {
      return format(range.from, "dd MMM yyyy", { locale: es })
    }
    if (range.from.getTime() === range.to.getTime()) {
      return format(range.from, "dd MMM yyyy", { locale: es })
    }
    return `${format(range.from, "dd MMM", { locale: es })} - ${format(range.to, "dd MMM yyyy", { locale: es })}`
  }

  const handlePresetClick = (preset: typeof timePresets[0]) => {
    const range = preset.getValue()
    onDateRangeChange(range)
    setIsOpen(false)
  }

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 45,
              duration: 0.1
            }}
          >
            <Button
              variant="outline"
              size="sm"
              className="text-xs sm:text-sm bg-card hover:!border-orange-500 hover:!bg-card hover:!text-card-foreground dark:hover:!text-white transition-all duration-200"
            >
              <CalendarIcon className="h-4 w-4 mr-1 sm:mr-2" />
              {formatDateRange(dateRange)}
            </Button>
          </motion.div>
        </PopoverTrigger>
        <AnimatePresence mode="wait">
          {isOpen && (
            <PopoverContent 
              className="w-auto p-0" 
              align="center"
              alignOffset={-50}
              sideOffset={4}
              asChild
            >
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
                <div className="flex">
                  {/* Presets */}
                  <motion.div 
                    className="w-48 border-r"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="p-3 border-b">
                      <h4 className="text-sm font-medium">Períodos rápidos</h4>
                    </div>
                    <div className="p-2">
                      {timePresets.map((preset, index) => (
                        <motion.div
                          key={preset.label}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.05 * index }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs hover:bg-orange-50 hover:text-orange-700 dark:hover:bg-orange-950 dark:hover:text-orange-300"
                            onClick={() => handlePresetClick(preset)}
                          >
                            {preset.label}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                  
                  {/* Calendar */}
                  <motion.div 
                    className="p-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={onDateRangeChange}
                      numberOfMonths={2}
                      locale={es}
                      className="rounded-md"
                    />
                  </motion.div>
                </div>
              </motion.div>
            </PopoverContent>
          )}
        </AnimatePresence>
      </Popover>
    </div>
  )
}
