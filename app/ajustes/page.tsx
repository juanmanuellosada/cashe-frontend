import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppSettings } from "@/components/app-settings"
import { AccountSettings } from "@/components/account-settings"
import { NotificationSettings } from "@/components/notification-settings"

export default function AjustesPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        </div>

        <Tabs defaultValue="app">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="app">Aplicación</TabsTrigger>
            <TabsTrigger value="account">Cuenta</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          </TabsList>
          <TabsContent value="app" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Ajustes de la aplicación</CardTitle>
                <CardDescription>Personaliza la apariencia y comportamiento de Cashé</CardDescription>
              </CardHeader>
              <CardContent>
                <AppSettings />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="account" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Ajustes de cuenta</CardTitle>
                <CardDescription>Administra tu cuenta y datos personales</CardDescription>
              </CardHeader>
              <CardContent>
                <AccountSettings />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="notifications" className="pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Notificaciones</CardTitle>
                <CardDescription>Configura tus preferencias de notificaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationSettings />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
