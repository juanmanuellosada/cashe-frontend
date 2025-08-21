import {
  // Trabajo y Profesión
  Briefcase,
  Laptop,
  Laptop2,
  Clock,
  Building,
  Monitor,
  Code,
  // Finanzas
  PiggyBank,
  CreditCard,
  Wallet,
  Banknote,
  Coins,
  Database,
  TrendingUp,
  DollarSign,
  Euro,
  // Alimentación y Bebidas
  Utensils,
  Coffee,
  Pizza,
  Cookie,
  Wine,
  Egg,
  // Transporte
  Car,
  Bus,
  Bike,
  Plane,
  Train,
  Truck,
  // Hogar y Vida
  Home,
  Sofa,
  Umbrella,
  Key,
  Lightbulb,
  Flame,
  // Entretenimiento
  Gamepad2,
  Gamepad,
  Music,
  Tv,
  Film,
  Camera,
  Headphones,
  Speaker,
  Radio,
  // Salud y Deporte
  Heart,
  Dumbbell,
  Activity,
  Thermometer,
  // Educación y Libros
  GraduationCap,
  Book,
  Library,
  Pencil,
  // Compras y Regalos
  ShoppingBag,
  Gift,
  Shirt,
  Gem,
  // Comunicación y Tecnología
  Phone,
  Smartphone,
  Wifi,
  Mail,
  Cloud,
  // Servicios
  Zap,
  Wrench,
  Hammer,
  Printer,
  // Naturaleza y Clima
  Trees,
  Flower,
  Leaf,
  Sun,
  Moon,
  Snowflake,
  Mountain,
  Earth,
  // Premios y Logros
  Award,
  Medal,
  Crown,
  Star,
  Target,
  // Formas
  Circle,
  Square,
  Triangle,
  Diamond,
  // Otros
  Tag,
  MoreHorizontal,
  User,
  Eye,
  Watch,
  Calendar,
  Map,
  Compass,
  Anchor,
  Rocket,
  Receipt,
  Calculator,
  Archive,
  Folder,
  FileText,
  Shield,
  Lock,
  Landmark,
  Building2,
  ShoppingCart,
} from "lucide-react"

// Mapeo completo de íconos
const iconMap = {
  // Trabajo y Profesión
  "briefcase": Briefcase,
  "laptop": Laptop,
  "laptop2": Laptop2,
  "clock": Clock,
  "building": Building,
  "monitor": Monitor,
  "code": Code,
  
  // Finanzas
  "piggy-bank": PiggyBank,
  "credit-card": CreditCard,
  "wallet": Wallet,
  "banknote": Banknote,
  "coins": Coins,
  "database": Database,
  "trending-up": TrendingUp,
  "dollar-sign": DollarSign,
  "euro": Euro,
  
  // Alimentación y Bebidas
  "utensils": Utensils,
  "coffee": Coffee,
  "pizza": Pizza,
  "cookie": Cookie,
  "wine": Wine,
  "egg": Egg,
  
  // Transporte
  "car": Car,
  "bus": Bus,
  "bike": Bike,
  "plane": Plane,
  "train": Train,
  "truck": Truck,
  
  // Hogar y Vida
  "home": Home,
  "sofa": Sofa,
  "umbrella": Umbrella,
  "key": Key,
  "lightbulb": Lightbulb,
  "flame": Flame,
  
  // Entretenimiento
  "gamepad2": Gamepad2,
  "gamepad-2": Gamepad2, // alias
  "gamepad": Gamepad,
  "music": Music,
  "tv": Tv,
  "film": Film,
  "camera": Camera,
  "headphones": Headphones,
  "speaker": Speaker,
  "radio": Radio,
  
  // Salud y Deporte
  "heart": Heart,
  "dumbbell": Dumbbell,
  "activity": Activity,
  "thermometer": Thermometer,
  
  // Educación y Libros
  "graduation-cap": GraduationCap,
  "book": Book,
  "library": Library,
  "pencil": Pencil,
  
  // Compras y Regalos
  "shopping-bag": ShoppingBag,
  "gift": Gift,
  "shirt": Shirt,
  "gem": Gem,
  
  // Comunicación y Tecnología
  "phone": Phone,
  "smartphone": Smartphone,
  "wifi": Wifi,
  "mail": Mail,
  "cloud": Cloud,
  
  // Servicios
  "zap": Zap,
  "wrench": Wrench,
  "hammer": Hammer,
  "printer": Printer,
  
  // Naturaleza y Clima
  "trees": Trees,
  "flower": Flower,
  "leaf": Leaf,
  "sun": Sun,
  "moon": Moon,
  "snowflake": Snowflake,
  "mountain": Mountain,
  "earth": Earth,
  
  // Premios y Logros
  "award": Award,
  "medal": Medal,
  "crown": Crown,
  "star": Star,
  "target": Target,
  
  // Formas
  "circle": Circle,
  "square": Square,
  "triangle": Triangle,
  "diamond": Diamond,
  
  // Otros
  "tag": Tag,
  "more-horizontal": MoreHorizontal,
  "user": User,
  "eye": Eye,
  "watch": Watch,
  "calendar": Calendar,
  "map": Map,
  "compass": Compass,
  "anchor": Anchor,
  "rocket": Rocket,
  "receipt": Receipt,
  "calculator": Calculator,
  "archive": Archive,
  "folder": Folder,
  "file-text": FileText,
  "shield": Shield,
  "lock": Lock,
  "landmark": Landmark,
  "building2": Building2,
  "shopping-cart": ShoppingCart,
}

// Función para obtener el componente de ícono
export const getIconComponent = (iconName: string) => {
  const IconComponent = iconMap[iconName as keyof typeof iconMap] || Tag
  return IconComponent
}

// Exportar iconMap para usar en selectores
export { iconMap }

// Función para obtener opciones de iconos para categorías
export const getCategoryIconOptions = () => {
  const categoryIcons = [
    // Trabajo y Profesión
    "briefcase", "laptop", "clock", "building", "monitor", "code",
    // Finanzas  
    "piggy-bank", "credit-card", "wallet", "banknote", "coins", "trending-up", "dollar-sign",
    // Alimentación
    "utensils", "coffee", "pizza", "cookie", "wine", "egg",
    // Transporte
    "car", "bus", "bike", "plane", "train", "truck",
    // Hogar
    "home", "sofa", "key", "lightbulb", "flame",
    // Entretenimiento
    "gamepad-2", "music", "tv", "film", "camera", "headphones",
    // Salud y Deporte
    "heart", "dumbbell", "activity", "thermometer",
    // Educación
    "graduation-cap", "book", "library", "pencil",
    // Compras
    "shopping-bag", "gift", "shirt", "gem",
    // Comunicación
    "phone", "wifi", "mail", "cloud",
    // Servicios
    "zap", "wrench", "hammer", "printer",
    // Naturaleza
    "trees", "flower", "leaf", "sun", "moon", "mountain",
    // Otros
    "tag", "star", "target", "award", "more-horizontal"
  ]
  
  return categoryIcons.map(icon => ({ name: icon, component: getIconComponent(icon) }))
}

// Función para renderizar ícono de categoría con imagen/ícono
export const renderCategoryIcon = (category: any, size: string = "h-4 w-4") => {
  if (category.image) {
    return (
      <div className={`${size === "h-4 w-4" ? "w-4 h-4" : size === "h-5 w-5" ? "w-5 h-5" : "w-6 h-6"} rounded-full overflow-hidden flex-shrink-0`}>
        <img 
          src={category.image} 
          alt={category.name}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }
  
  if (category.icon) {
    const IconComponent = getIconComponent(category.icon)
    return (
      <div 
        className={`${size === "h-4 w-4" ? "w-4 h-4" : size === "h-5 w-5" ? "w-5 h-5" : "w-6 h-6"} rounded-full flex items-center justify-center flex-shrink-0`}
        style={{
          backgroundColor: category.color ? `${category.color}20` : undefined,
          color: category.color || undefined
        }}
      >
        <IconComponent className={size === "h-4 w-4" ? "h-3 w-3" : size === "h-5 w-5" ? "h-4 w-4" : "h-5 w-5"} />
      </div>
    )
  }
  
  // Fallback
  return (
    <div className={`${size === "h-4 w-4" ? "w-4 h-4" : size === "h-5 w-5" ? "w-5 h-5" : "w-6 h-6"} rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
      <Tag className={size === "h-4 w-4" ? "h-3 w-3" : size === "h-5 w-5" ? "h-4 w-4" : "h-5 w-5"} />
    </div>
  )
}

// Función para renderizar ícono de cuenta con imagen/ícono
export const renderAccountIcon = (account: any, size: string = "h-4 w-4") => {
  if (account.image) {
    return (
      <div className={`${size === "h-4 w-4" ? "w-4 h-4" : size === "h-5 w-5" ? "w-5 h-5" : "w-6 h-6"} rounded-full overflow-hidden flex-shrink-0`}>
        <img 
          src={account.image} 
          alt={account.name}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }
  
  if (account.icon) {
    const IconComponent = getIconComponent(account.icon)
    return (
      <div 
        className={`${size === "h-4 w-4" ? "w-4 h-4" : size === "h-5 w-5" ? "w-5 h-5" : "w-6 h-6"} rounded-full flex items-center justify-center flex-shrink-0`}
        style={{
          backgroundColor: account.color ? `${account.color}20` : undefined,
          color: account.color || undefined
        }}
      >
        <IconComponent className={size === "h-4 w-4" ? "h-3 w-3" : size === "h-5 w-5" ? "h-4 w-4" : "h-5 w-5"} />
      </div>
    )
  }
  
  // Fallback basado en tipo de cuenta
  let IconComponent = Wallet
  switch (account.type) {
    case "checking":
      IconComponent = CreditCard
      break
    case "savings":
      IconComponent = Wallet
      break
    case "credit":
      IconComponent = CreditCard
      break
    case "cash":
      IconComponent = DollarSign
      break
  }
  
  return (
    <div className={`${size === "h-4 w-4" ? "w-4 h-4" : size === "h-5 w-5" ? "w-5 h-5" : "w-6 h-6"} rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
      <IconComponent className={size === "h-4 w-4" ? "h-3 w-3" : size === "h-5 w-5" ? "h-4 w-4" : "h-5 w-5"} />
    </div>
  )
}
