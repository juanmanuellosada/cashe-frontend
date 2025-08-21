"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { renderCategoryIcon, renderAccountIcon } from "@/lib/icon-helpers"

interface Option {
  id: string
  name: string
  icon?: string
  color?: string
  image?: string
  type?: string // Para distinguir entre account/category
}

interface MultiSelectProps {
  options: Option[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  maxDisplay?: number
  className?: string
  type?: 'account' | 'category' // Para saber qué función de render usar
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Seleccionar...",
  maxDisplay = 2,
  className,
  type = 'account',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (optionId: string) => {
    const newValue = value.includes(optionId)
      ? value.filter(id => id !== optionId)
      : [...value, optionId]
    onValueChange(newValue)
  }

  const handleRemove = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange(value.filter(id => id !== optionId))
  }

  const selectedOptions = options.filter(option => value.includes(option.id))

  const renderIcon = (option: Option) => {
    if (type === 'category') {
      return renderCategoryIcon(option, "h-4 w-4")
    } else {
      return renderAccountIcon(option, "h-4 w-4")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-9 h-auto",
            className
          )}
        >
          <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
            {selectedOptions.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedOptions.length <= maxDisplay ? (
              selectedOptions.map((option) => (
                <Badge
                  key={option.id}
                  variant="outline"
                  className="flex items-center gap-1 px-2 py-1 border-primary text-primary"
                >
                  {renderIcon(option)}
                  <span className="text-xs">{option.name}</span>
                  <span
                    onClick={(e) => handleRemove(option.id, e)}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-sm p-0.5 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            ) : (
              <>
                {selectedOptions.slice(0, maxDisplay).map((option) => (
                  <Badge
                    key={option.id}
                    variant="outline"
                    className="flex items-center gap-1 px-2 py-1 border-primary text-primary"
                  >
                    {renderIcon(option)}
                    <span className="text-xs">{option.name}</span>
                    <span
                      onClick={(e) => handleRemove(option.id, e)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-sm p-0.5 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </Badge>
                ))}
                <Badge variant="outline" className="px-2 py-1 border-primary text-primary">
                  <span className="text-xs">+{selectedOptions.length - maxDisplay} más</span>
                </Badge>
              </>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="max-h-60 overflow-auto">
          {options.map((option, index) => {
            const isSelected = value.includes(option.id)
            const nextIsSelected = index < options.length - 1 && value.includes(options[index + 1].id)
            
            return (
              <div
                key={option.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground border-2 border-transparent",
                  isSelected && "border-primary",
                  isSelected && nextIsSelected && "border-b-transparent"
                )}
                onClick={() => handleSelect(option.id)}
              >
                <div className="flex items-center gap-2 flex-1">
                  {renderIcon(option)}
                  <span className="text-sm">{option.name}</span>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4" />
                )}
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
