"use client"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Notificaciones generales</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="budget-alerts">Alertas de presupuesto</Label>
              <p className="text-sm text-muted-foreground">
                Recibe notificaciones cuando te acerques al límite de un presupuesto
              </p>
            </div>
            <Switch id="budget-alerts" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="payment-reminders">Recordatorios de pago</Label>
              <p className="text-sm text-muted-foreground">Recibe recordatorios de pagos próximos</p>
            </div>
            <Switch id="payment-reminders" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="insights">Recomendaciones</Label>
              <p className="text-sm text-muted-foreground">Recibe consejos y análisis personalizados</p>
            </div>
            <Switch id="insights" defaultChecked />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Preferencias de recordatorios</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="reminder-time">Días de anticipación</Label>
            <Select defaultValue="3">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecciona días" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 día antes</SelectItem>
                <SelectItem value="3">3 días antes</SelectItem>
                <SelectItem value="5">5 días antes</SelectItem>
                <SelectItem value="7">7 días antes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h3 className="text-lg font-medium">Informes periódicos</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-report">Informe semanal</Label>
              <p className="text-sm text-muted-foreground">Recibe un resumen semanal de tus finanzas</p>
            </div>
            <Switch id="weekly-report" />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="monthly-report">Informe mensual</Label>
              <p className="text-sm text-muted-foreground">Recibe un resumen mensual de tus finanzas</p>
            </div>
            <Switch id="monthly-report" defaultChecked />
          </div>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button>Guardar cambios</Button>
      </div>
    </div>
  )
}
