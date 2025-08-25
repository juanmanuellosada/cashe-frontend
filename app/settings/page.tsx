"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { User, Bell, Globe, Shield, Palette, Download, Trash2, Save, Eye, EyeOff } from "lucide-react"

export default function SettingsPage() {
  const [showPassword, setShowPassword] = useState(false)
  
  const [settings, setSettings] = useState({
    // Perfil
    name: "Juan Pérez",
    email: "juan@email.com",

    // Preferencias
    language: "es",
    dateFormat: "DD/MM/YYYY",

    // Notificaciones
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    budgetAlerts: true,

    // Privacidad
    twoFactorAuth: false,
    sessionTimeout: "30",

    // Apariencia
    theme: "system",
  })

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    // Aquí iría la lógica para guardar la configuración
    console.log("[v0] Guardando configuración:", settings)
  }

  const handleExportData = () => {
    // Lógica para exportar datos
    console.log("[v0] Exportando datos...")
  }

  const handleDeleteAccount = () => {
    // Lógica para eliminar cuenta
    console.log("[v0] Eliminando cuenta...")
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Configuración</h1>
            <p className="text-muted-foreground">Gestiona tus preferencias y configuración de cuenta</p>
          </div>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>

        {/* Primera fila - Perfil, Preferencias, Notificaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Perfil de Usuario */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <User className="h-5 w-5" />
                Perfil de Usuario
              </CardTitle>
              <CardDescription>Información personal y de contacto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" value={settings.name} onChange={(e) => handleSettingChange("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleSettingChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Cambiar contraseña</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Nueva contraseña" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferencias */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Globe className="h-5 w-5" />
                Preferencias
              </CardTitle>
              <CardDescription>Configuración regional y de formato</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select value={settings.language} onValueChange={(value) => handleSettingChange("language", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="pt">Português</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Formato de fecha</Label>
                <Select value={settings.dateFormat} onValueChange={(value) => handleSettingChange("dateFormat", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notificaciones */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Bell className="h-5 w-5" />
                Notificaciones
              </CardTitle>
              <CardDescription>Controla cómo y cuándo recibir notificaciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones por email</Label>
                  <p className="text-sm text-muted-foreground">Recibir actualizaciones por correo</p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificaciones push</Label>
                  <p className="text-sm text-muted-foreground">Alertas en tiempo real</p>
                </div>
                <Switch
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => handleSettingChange("pushNotifications", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reportes semanales</Label>
                  <p className="text-sm text-muted-foreground">Resumen semanal de finanzas</p>
                </div>
                <Switch
                  checked={settings.weeklyReports}
                  onCheckedChange={(checked) => handleSettingChange("weeklyReports", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de presupuesto</Label>
                  <p className="text-sm text-muted-foreground">Avisos cuando superes límites</p>
                </div>
                <Switch
                  checked={settings.budgetAlerts}
                  onCheckedChange={(checked) => handleSettingChange("budgetAlerts", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segunda fila - Seguridad, Apariencia, Datos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seguridad y Privacidad */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Shield className="h-5 w-5" />
                Seguridad y Privacidad
              </CardTitle>
              <CardDescription>Configuración de seguridad de tu cuenta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticación de dos factores</Label>
                  <p className="text-sm text-muted-foreground">Seguridad adicional para tu cuenta</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.twoFactorAuth}
                    onCheckedChange={(checked) => handleSettingChange("twoFactorAuth", checked)}
                  />
                  {settings.twoFactorAuth && <Badge variant="secondary">Activo</Badge>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tiempo de sesión (minutos)</Label>
                <Select
                  value={settings.sessionTimeout}
                  onValueChange={(value) => handleSettingChange("sessionTimeout", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Apariencia */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Palette className="h-5 w-5" />
                Apariencia
              </CardTitle>
              <CardDescription>Personaliza la apariencia de la aplicación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select value={settings.theme} onValueChange={(value) => handleSettingChange("theme", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Claro</SelectItem>
                    <SelectItem value="dark">Oscuro</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Datos y Cuenta */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Download className="h-5 w-5" />
                Datos y Cuenta
              </CardTitle>
              <CardDescription>Gestiona tus datos y configuración de cuenta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 40,
                  duration: 0.15,
                }}
              >
                <Button variant="outline" className="w-full bg-transparent" onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar mis datos
                </Button>
              </motion.div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-destructive">Zona de peligro</Label>
                <p className="text-sm text-muted-foreground">
                  Esta acción no se puede deshacer. Se eliminarán permanentemente todos tus datos.
                </p>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 40,
                    duration: 0.15,
                  }}
                >
                  <Button variant="destructive" className="w-full" onClick={handleDeleteAccount}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar cuenta
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}