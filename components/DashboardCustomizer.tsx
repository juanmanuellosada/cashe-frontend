"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Settings, Eye, EyeOff, RotateCcw, GripVertical } from "lucide-react"
import { useDashboard } from "./DashboardContext"
import { motion, AnimatePresence } from "framer-motion"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableWidgetItemProps {
  widget: {
    id: string
    title: string
    visible: boolean
    category: string
  }
  onVisibilityChange: (id: string, visible: boolean) => void
}

function SortableWidgetItem({ widget, onVisibilityChange }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }


  const categoryColors = {
    summary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    charts: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    lists: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    actions: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
  }

  const categoryLabels: Record<string, string> = {
    summary: 'Resumen',
    charts: 'Gráficos',
    lists: 'Listas',
    actions: 'Acciones'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      
      <Checkbox
        checked={widget.visible}
        onCheckedChange={(checked) => onVisibilityChange(widget.id, !!checked)}
      />
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{widget.title}</span>
          <Badge variant="secondary" className={`text-xs ${categoryColors[widget.category as keyof typeof categoryColors]}`}>
            {categoryLabels[widget.category] || widget.category}
          </Badge>
        </div>
      </div>
      
      <div className="text-muted-foreground">
        {widget.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </div>
    </div>
  )
}

export function DashboardCustomizer() {
  const { widgets, updateWidgetVisibility, updateWidgetOrder, resetToDefault } = useDashboard()
  const [isOpen, setIsOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = widgets.findIndex(widget => widget.id === active.id)
      const newIndex = widgets.findIndex(widget => widget.id === over?.id)
      
      const newWidgets = arrayMove(widgets, oldIndex, newIndex).map((widget, index) => ({
        ...widget,
        order: index + 1
      }))
      
      updateWidgetOrder(newWidgets)
    }
  }

  const visibleCount = widgets.filter(w => w.visible).length
  const totalCount = widgets.length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
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
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Personalizar
            <Badge variant="secondary" className="ml-1">
              {visibleCount}/{totalCount}
            </Badge>
          </Button>
        </motion.div>
      </DialogTrigger>
      <AnimatePresence mode="wait">
        {isOpen && (
          <DialogContent className="max-w-4xl w-[90vw] max-h-[80vh] overflow-hidden flex flex-col p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 45,
                duration: 0.1 
              }}
            >
              <DialogHeader className="mb-6">
                <DialogTitle className="flex items-center gap-2 mb-4">
                  <Settings className="h-5 w-5" />
                  Personalizar Dashboard
                </DialogTitle>
              </DialogHeader>
              
              <motion.div 
                className="flex-1 overflow-auto space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {/* Quick actions */}
                <motion.div 
                  className="flex gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      widgets.forEach(widget => updateWidgetVisibility(widget.id, true))
                    }}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Mostrar todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      widgets.forEach(widget => updateWidgetVisibility(widget.id, false))
                    }}
                    className="flex-1"
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Ocultar todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetToDefault}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restablecer
                  </Button>
                </motion.div>

                {/* Widgets list */}
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3 className="text-lg font-semibold">Widgets disponibles</h3>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={widgets.map(w => w.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {widgets.map((widget) => (
                        <SortableWidgetItem
                          key={widget.id}
                          widget={widget}
                          onVisibilityChange={updateWidgetVisibility}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </motion.div>
              </motion.div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  )
}
