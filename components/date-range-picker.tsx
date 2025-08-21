"use client"

import { useState } from "react"
import { addDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  value?: DateRange
  onValueChange?: (range: DateRange | undefined) => void
  className?: string
  placeholder?: string
}

export function DatePickerWithRange({
  value,
  onValueChange,
  className,
  placeholder = "Seleccionar período"
}: DatePickerWithRangeProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "dd/MM/yyyy", { locale: es })} -{" "}
                  {format(value.to, "dd/MM/yyyy", { locale: es })}
                </>
              ) : (
                format(value.from, "dd/MM/yyyy", { locale: es })
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={(range) => {
              onValueChange?.(range)
              if (range?.from && range?.to) {
                setOpen(false)
              }
            }}
            numberOfMonths={2}
            locale={es}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
