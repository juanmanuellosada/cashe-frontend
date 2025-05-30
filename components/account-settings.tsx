"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AccountSettings() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
        <Avatar className="h-20 w-20">
          <AvatarImage src="/placeholder-user.jpg" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg font-medium">Foto de perfil</h3>
          <p className="text-sm text-muted-foreground">Esta foto se mostrará en tu perfil</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              Cambiar
            </Button>
            <Button variant="outline" size="sm">
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Información personal</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" defaultValue="Usuario" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" defaultValue="usuario@ejemplo.com" disabled />
            <p className="text-xs text-muted-foreground">Vinculado a tu cuenta de Google</p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Datos de Google</h3>
        <div className="rounded-md bg-muted p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M17.5 5.5C19 7 20.5 9 21 11c-2.5.5-5 .5-8.5-1" />
                <path d="M5.5 17.5C7 19 9 20.5 11 21c.5-2.5.5-5-1-8.5" />
                <path d="M16.5 11.5c1 2 1 3.5 1 6-2.5 0-4 0-6-1" />
                <path d="M20 11.5c1 1.5 2 3.5 2 4.5-1.5.5-3 0-4.5-.5" />
                <path d="M11.5 20c1.5 1 3.5 2 4.5 2 .5-1.5 0-3-.5-4.5" />
                <path d="M20.5 16.5c1 2 1.5 3.5 1.5 5.5-2 0-3.5-.5-5.5-1.5" />
                <path d="M4.783 4.782C8.493 1.072 14.5 1 18 5c-1 1-4.5 2-6.5 1.5 1 1.5 1 4 .5 5.5-1.5.5-4 .5-5.5-.5C7 13.5 6 17 5 18c-4-3.5-3.927-9.508-.217-13.218Z" />
                <path d="M4.5 4.5 3 3c-.184-.185-.184-.816 0-1 .185-.184.816-.184 1 0l1.5 1.5" />
                <path d="M3 7.5c-.393.393-.5 2-.5 2.5 0 .5 2.107.607 2.5.5.393-.107.5-2.5.5-3s-2.107-.393-2.5 0Z" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Conectado con Google</p>
              <p className="text-sm text-muted-foreground">Tus datos se almacenan en Google Sheets</p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Exportar datos</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">Exportar a CSV</Button>
          <Button variant="outline">Exportar a Excel</Button>
        </div>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button>Guardar cambios</Button>
      </div>
    </div>
  )
}
