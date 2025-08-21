"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  BarChart3,
  CreditCard,
  Target,
  Monitor
} from "lucide-react";

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleDemo = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Efectos de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-500/5 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/3 rounded-full blur-3xl"></div>
      
      {/* Navegación */}
      <nav className="relative z-20 flex items-center justify-between p-6 lg:px-8">
        <div className="flex items-center space-x-3">
          <Image
            src="/cashe-logo.png"
            alt="Cashé Logo"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <span className="text-2xl font-bold text-white">Cashé</span>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setShowAuth(true)}>
            Iniciar Sesión
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setShowAuth(true)}>
            Registrarse
          </Button>
        </div>
      </nav>

      {/* Modal de Autenticación */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-slate-800 border-slate-700">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Image
                  src="/cashe-logo.png"
                  alt="Cashé Logo"
                  width={48}
                  height={48}
                  className="rounded-lg"
                />
              </div>
              <CardTitle className="text-white">
                {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {isLogin ? "Accede a tu cuenta de Cashé" : "Únete a Cashé y comienza a gestionar tus finanzas"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={isLogin ? "login" : "register"} onValueChange={(value) => setIsLogin(value === "login")}>
                <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                  <TabsTrigger value="login" className="text-white data-[state=active]:bg-orange-500">
                    Iniciar Sesión
                  </TabsTrigger>
                  <TabsTrigger value="register" className="text-white data-[state=active]:bg-orange-500">
                    Registrarse
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    onClick={handleDemo}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Iniciar Sesión
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </TabsContent>
                
                <TabsContent value="register" className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Nombre completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Tu nombre"
                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-white">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="tu@email.com"
                        className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-white">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    onClick={handleDemo}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Crear Cuenta
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </TabsContent>
              </Tabs>
              
              <div className="mt-6 text-center">
                <Button
                  variant="ghost"
                  onClick={() => setShowAuth(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-20">
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <Image
              src="/cashe-logo.png"
              alt="Cashé Logo"
              width={128}
              height={128}
              className="rounded-2xl shadow-2xl"
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
            Toma el control de tus
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
              finanzas personales
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-xl text-gray-300 leading-relaxed">
            Cashé te ayuda a integrar y sincronizar tus gastos e ingresos con una interfaz simple e
            intuitiva para el control total de tus finanzas personales.
          </p>

          <div className="flex justify-center">
            <Button
              onClick={handleDemo}
              className="bg-orange-500 hover:bg-orange-600 text-white text-lg px-8 py-6 rounded-xl group"
            >
              <span className="mr-2">🎯</span>
              Probar Demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* Características principales */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Todo lo que necesitas para gestionar tus finanzas
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Herramientas poderosas y intuitivas diseñadas para hacer tu vida financiera más simple
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-orange-400" />
              </div>
              <CardTitle className="text-white">Reportes Detallados</CardTitle>
              <CardDescription className="text-gray-400">
                Genera reportes detallados con gráficos y análisis de tus gastos e ingresos
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-slate-500/20 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-slate-400" />
              </div>
              <CardTitle className="text-white">Múltiples Cuentas</CardTitle>
              <CardDescription className="text-gray-400">
                Gestiona todas tus cuentas bancarias y tarjetas de crédito desde un solo lugar
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">Categorización</CardTitle>
              <CardDescription className="text-gray-400">
                Organiza tus transacciones en categorías personalizables para mejor control
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Call to action final */}
      <div className="relative z-10 text-center py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            ¿Listo para transformar tus finanzas?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Comienza a tomar el control de tu futuro financiero con Cashé
          </p>
          <div className="flex justify-center">
            <Button
              onClick={handleDemo}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xl px-12 py-6 rounded-xl group"
            >
              <span className="mr-2">🎯</span>
              Ver Demo
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Sin compromiso • Configuración en minutos • Prueba todas las funciones
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <Image
                src="/cashe-logo.png"
                alt="Cashé Logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-white">Cashé</span>
            </div>
            <div className="flex items-center space-x-6 text-gray-400">
              <span>© 2024 Cashé. Todos los derechos reservados.</span>
              <div className="flex space-x-4">
                <button className="hover:text-white transition-colors">Privacidad</button>
                <button className="hover:text-white transition-colors">Términos</button>
                <button className="hover:text-white transition-colors">Soporte</button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}