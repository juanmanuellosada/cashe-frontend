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
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large floating elements */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-orange-400/20 rounded-full animate-float"></div>
        <div className="absolute top-32 right-32 w-3 h-3 bg-blue-400/15 rounded-full animate-float-slow" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-40 left-40 w-2 h-2 bg-purple-400/20 rounded-full animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 right-20 w-4 h-4 bg-orange-300/10 rounded-full animate-float-slow" style={{animationDelay: '3s'}}></div>
        
        {/* Medium floating elements */}
        <div className="absolute top-3/4 left-1/6 w-1.5 h-1.5 bg-yellow-400/15 rounded-full animate-float" style={{animationDelay: '4s'}}></div>
        <div className="absolute top-1/6 right-2/3 w-2.5 h-2.5 bg-indigo-400/10 rounded-full animate-float-slow" style={{animationDelay: '5s'}}></div>
        
        {/* Small scattered dots */}
        <div className="absolute top-1/3 left-1/5 w-1 h-1 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-white/15 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute bottom-1/3 left-2/3 w-1 h-1 bg-white/10 rounded-full animate-pulse" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{animationDelay: '2.5s'}}></div>
        <div className="absolute top-1/5 left-3/4 w-1 h-1 bg-orange-300/20 rounded-full animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-1/5 right-1/5 w-1 h-1 bg-blue-300/15 rounded-full animate-pulse" style={{animationDelay: '5.5s'}}></div>
        
        {/* Geometric shapes */}
        <div className="absolute top-16 right-16 w-6 h-6 border border-orange-400/10 rotate-45 animate-spin" style={{animationDuration: '20s'}}></div>
        <div className="absolute bottom-16 left-16 w-8 h-8 border border-blue-400/8 rotate-12 animate-spin" style={{animationDuration: '25s', animationDirection: 'reverse'}}></div>
        <div className="absolute top-2/3 left-1/3 w-4 h-4 border border-purple-400/12 animate-spin" style={{animationDuration: '15s'}}></div>
        
        {/* Additional decorative elements */}
        <div className="absolute top-1/4 right-1/3 w-3 h-0.5 bg-gradient-to-r from-orange-400/20 to-transparent rotate-45 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/4 left-1/4 w-3 h-0.5 bg-gradient-to-r from-blue-400/15 to-transparent rotate-12 animate-pulse" style={{animationDelay: '3.5s'}}></div>
      </div>
      
      {/* Dynamic Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/[0.02] to-transparent animate-gradient-shift opacity-80"></div>
      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-purple-500/[0.015] to-transparent animate-gradient-shift opacity-60" style={{animationDelay: '4s'}}></div>
      
      {/* Radial gradient spotlight effect */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full bg-gradient-radial from-orange-500/5 via-transparent to-transparent opacity-60"></div>
      
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/3 left-1/3 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-yellow-400/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute bottom-1/3 right-1/3 w-40 h-40 bg-gradient-to-br from-purple-400/15 to-blue-400/10 rounded-full blur-xl animate-float-slow" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-2/3 right-1/4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-indigo-400/10 rounded-full blur-xl animate-float" style={{animationDelay: '1s'}}></div>
      </div>
      
      {/* Navegación */}
      <nav className="relative z-20 flex items-center justify-between p-4 sm:p-6 lg:px-8">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Image
            src="/cashe-logo.png"
            alt="Cashé Logo"
            width={32}
            height={32}
            className="rounded-lg sm:w-10 sm:h-10 flex-shrink-0"
          />
          <span className="text-xl sm:text-2xl font-bold text-white truncate">Cashé</span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/10 text-xs sm:text-sm px-2 sm:px-4" 
            onClick={() => setShowAuth(true)}
          >
            <span className="hidden sm:inline">Iniciar Sesión</span>
            <span className="sm:hidden">Entrar</span>
          </Button>
          <Button 
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm px-2 sm:px-4" 
            onClick={() => setShowAuth(true)}
          >
            <span className="hidden sm:inline">Registrarse</span>
            <span className="sm:hidden">Registro</span>
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
        
        <div className="grid md:grid-cols-2 gap-8">
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