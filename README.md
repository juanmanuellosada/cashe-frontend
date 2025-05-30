# Cashé 💰

Una aplicación moderna de gestión de finanzas personales construida con React/Next.js e integrada con Google Sheets para el almacenamiento de datos.

## ✨ Características

- **Panel de Control**: Obtén una vista integral de tu salud financiera con gráficos interactivos e insights
- **Gestión de Transacciones**: Agrega, edita y categoriza tus ingresos y gastos
- **Integración con Google Sheets**: Sincronización perfecta de datos con Google Sheets para persistencia
- **Actualización de Datos en Tiempo Real**: Actualizaciones automáticas de la interfaz cuando se agregan nuevas transacciones
- **Seguimiento de Presupuestos**: Monitorea tus gastos contra los presupuestos establecidos
- **Categorías de Gastos**: Organiza las transacciones por categorías personalizables
- **Insights Financieros**: Análisis de tendencias de gasto e insights potenciados por IA
- **Diseño Responsivo**: Funciona perfectamente en dispositivos de escritorio y móviles
- **Tema Oscuro/Claro**: Alterna entre modos oscuro y claro
- **Soporte Multiidioma**: Disponible en múltiples idiomas (i18n)

## 🚀 Stack Tecnológico

- **Frontend**: Next.js 15, React 19, TypeScript
- **Autenticación**: NextAuth.js con Google OAuth
- **Estilos**: Tailwind CSS con componentes shadcn/ui
- **Gráficos**: Chart.js y Recharts para visualización de datos
- **Formularios**: React Hook Form con validación Zod
- **Almacenamiento de Datos**: Integración con API de Google Sheets
- **Gestión de Estado**: React Context API con hooks personalizados
- **Iconos**: Lucide React
- **Internacionalización**: i18next

## 📋 Prerrequisitos

Antes de ejecutar este proyecto, asegúrate de tener:

- Node.js 18+ instalado
- Un proyecto de Google Cloud Console con la API de Sheets habilitada
- Credenciales de Google OAuth configuradas
- Git instalado

## 🛠️ Instalación

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/juanmanuellosada/cashe-frontend.git
   cd cashe-frontend
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   # o
   yarn install
   # o
   pnpm install
   ```

3. **Configuración del Entorno**

   Crea un archivo `.env.local` en el directorio raíz con las siguientes variables:

   ```env
   # Configuración de NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=tu-nextauth-secret-aqui

   # Google OAuth
   GOOGLE_CLIENT_ID=tu-google-client-id
   GOOGLE_CLIENT_SECRET=tu-google-client-secret

   # Google Sheets
   GOOGLE_SHEETS_PRIVATE_KEY=tu-google-sheets-private-key
   GOOGLE_SHEETS_CLIENT_EMAIL=tu-google-sheets-client-email
   GOOGLE_SPREADSHEET_ID=tu-google-spreadsheet-id
   ```

4. **Configuración de Google Sheets**

   - Crea una nueva hoja de cálculo de Google
   - Configura las siguientes hojas con los encabezados de columna apropiados:
     - `Transactions`: Date, Amount, Category, Description, Type
     - `Categories`: Name, Type, Color
     - `Budgets`: Category, Amount, Period
   - Comparte la hoja de cálculo con el email de tu cuenta de servicio
   - Copia el ID de la hoja de cálculo a tus variables de entorno

5. **Ejecutar el servidor de desarrollo**

   ```bash
   npm run dev
   # o
   yarn dev
   # o
   pnpm dev
   ```

6. **Abrir tu navegador**

   Navega a [http://localhost:3000](http://localhost:3000) para ver la aplicación.

## 📁 Estructura del Proyecto

```
cashe-frontend/
├── app/                    # Directorio de Next.js app
│   ├── api/               # Rutas de API
│   ├── auth/              # Páginas de autenticación
│   ├── dashboard/         # Páginas de panel de control
│   └── page.tsx           # Página de inicio
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes base de UI (shadcn/ui)
│   ├── charts/           # Componentes de gráficos
│   ├── forms/            # Componentes de formularios
│   └── layout/           # Componentes de diseño
├── hooks/                # Hooks personalizados de React
│   ├── data-refresh-context.tsx
│   └── use-*.ts          # Varios hooks personalizados
├── lib/                  # Librerías de utilidades
│   ├── auth.ts           # Configuración de NextAuth
│   ├── google-sheets.ts  # API de Google Sheets
│   └── utils.ts          # Utilidades generales
├── contexts/             # Contextos de React
├── public/               # Activos estáticos
├── styles/               # Estilos globales
└── types/                # Definiciones de tipos TypeScript
```

## 🔧 Implementación de Características Clave

### Sistema de Actualización de Datos

La aplicación incluye un sistema sofisticado de actualización de datos que actualiza automáticamente todos los componentes cuando se agregan nuevos datos:

```typescript
// Hook personalizado para actualización global de datos
const { triggerRefresh } = useDataRefresh();

// Actualiza automáticamente los datos después de agregar transacciones
const onSubmit = async (data) => {
  await saveTransaction(data);
  triggerRefresh(); // Actualiza todos los componentes conectados
};
```

### Integración con Google Sheets

Integración perfecta con Google Sheets para persistencia de datos:

```typescript
// Sincronización de datos en tiempo real
const syncWithSheets = async () => {
  const data = await fetchFromGoogleSheets();
  updateLocalState(data);
};
```

### Diseño Responsivo

Construido con enfoque mobile-first usando Tailwind CSS:

- Diseños adaptativos para todos los tamaños de pantalla
- Interacciones amigables al tacto
- Rendimiento optimizado en dispositivos móviles

## 🎨 Componentes de UI

La aplicación usa componentes shadcn/ui para una interfaz consistente y hermosa:

- **Gráficos**: Gráficos financieros interactivos
- **Formularios**: Componentes de formulario elegantes con validación
- **Navegación**: Barra lateral y navegación intuitiva
- **Modales**: Interacciones suaves de diálogos y modales
- **Temas**: Soporte de modo oscuro/claro

## 🔐 Autenticación

Autenticación segura potenciada por NextAuth.js:

- Integración con Google OAuth
- Gestión de sesiones
- Actualización automática de tokens
- Protección segura de rutas de API

## 📊 Visualización de Datos

Visualización rica de datos con múltiples tipos de gráficos:

- **Balance Mensual**: Rastrea el balance de cuenta a lo largo del tiempo
- **Categorías de Gastos**: Gráficos de pastel para desglose de gastos
- **Tendencias de Gasto**: Gráficos de líneas para patrones de gasto
- **Progreso de Presupuesto**: Barras de progreso para seguimiento de presupuesto

## 🌍 Internacionalización

Soporte multiidioma usando i18next:

- Soporte para inglés y español
- Cambio dinámico de idioma
- Formatos localizados de fecha y números

## 🚀 Despliegue

### Vercel (Recomendado)

1. **Conecta tu repositorio de GitHub a Vercel**
2. **Configura las variables de entorno** en el panel de Vercel
3. **Despliega** - Vercel construirá y desplegará automáticamente tu aplicación

### Otras Plataformas

La aplicación puede desplegarse en cualquier plataforma que soporte Next.js:

- Netlify
- Railway
- AWS Amplify
- Google Cloud Platform

## 🤝 Contribuir

1. Haz fork del repositorio
2. Crea una rama de característica (`git checkout -b feature/CaracteristicaIncreible`)
3. Confirma tus cambios (`git commit -m 'Agregar alguna CaracteristicaIncreible'`)
4. Sube a la rama (`git push origin feature/CaracteristicaIncreible`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo [LICENSE](LICENSE) para más detalles.

## 🐛 Problemas Conocidos

- Las notificaciones toast pueden no aparecer consistentemente (trabajando en la solución)
- Dependencia de Docker Desktop para el entorno de desarrollo

## 🔮 Hoja de Ruta

- [ ] Aplicación móvil (React Native)
- [ ] Análisis avanzado y reportes
- [ ] Integración con cuentas bancarias
- [ ] Seguimiento de inversiones
- [ ] Recordatorios de facturas y automatización
- [ ] Funcionalidad de exportación (PDF, CSV)
- [ ] Soporte para múltiples monedas

## 💡 Soporte

Si tienes alguna pregunta o necesitas ayuda:

- Abre un issue en GitHub
- Contacta al mantenedor: Juan Manuel Losada

## 🙏 Reconocimientos

- [shadcn/ui](https://ui.shadcn.com/) por la hermosa librería de componentes
- [Next.js](https://nextjs.org/) por el increíble framework de React
- [Google Sheets API](https://developers.google.com/sheets/api) por el almacenamiento de datos
- [Vercel](https://vercel.com/) por el hosting y despliegue

---

Hecho con ❤️ por [Juan Manuel Losada](https://github.com/juanmanuellosada)
