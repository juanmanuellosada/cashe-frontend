import { Variants } from "framer-motion"

// Animaciones para modals y diálogos
export const modalVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20 
  },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      duration: 0.2
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: {
      duration: 0.15
    }
  }
}

// Animaciones para headers de modals
export const headerVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: -10 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      delay: 0.1,
      duration: 0.3
    }
  }
}

// Animaciones para contenido de modals
export const contentVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 20 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      delay: 0.2,
      duration: 0.4
    }
  }
}

// Animaciones para formularios
export const formVariants: Variants = {
  initial: { 
    opacity: 0 
  },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
}

// Animaciones para elementos de formulario
export const formItemVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: 15 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
}

// Animaciones para elementos en lista
export const listItemVariants: Variants = {
  initial: { 
    opacity: 0, 
    x: -20 
  },
  animate: (index: number) => ({
    opacity: 1, 
    x: 0,
    transition: {
      delay: 0.1 + (index * 0.05),
      duration: 0.3,
      type: "spring",
      stiffness: 200
    }
  }),
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2
    }
  }
}

// Animaciones para hovering en elementos interactivos
export const hoverVariants: Variants = {
  hover: { 
    scale: 1.02, 
    x: 5,
    transition: {
      type: "spring",
      stiffness: 400
    }
  },
  tap: { 
    scale: 0.98 
  }
}

// Animaciones para botones flotantes
export const floatingButtonVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0, 
    y: 100 
  },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
      delay: 0.1
    }
  },
  hover: { 
    scale: 1.1,
    transition: {
      type: "spring",
      stiffness: 400
    }
  },
  tap: { 
    scale: 0.95 
  }
}

// Animaciones para tooltips
export const tooltipVariants: Variants = {
  initial: { 
    opacity: 0, 
    x: 10, 
    scale: 0.9 
  },
  animate: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    x: 10, 
    scale: 0.9,
    transition: {
      duration: 0.15
    }
  }
}

// Animaciones para dropdowns
export const dropdownVariants: Variants = {
  initial: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95 
  },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
      duration: 0.15
    }
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95,
    transition: {
      duration: 0.1
    }
  }
}

// Animaciones para páginas/screens
export const pageVariants: Variants = {
  initial: { 
    opacity: 0, 
    x: 20 
  },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: {
      duration: 0.2
    }
  }
}

// Animaciones para iconos con hover
export const iconHoverVariants: Variants = {
  hover: { 
    scale: 1.1, 
    rotate: 5,
    transition: {
      type: "spring",
      stiffness: 400
    }
  }
}

// Configuraciones predeterminadas
export const defaultTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30
}

export const fastTransition = {
  duration: 0.15,
  ease: "easeOut"
}

export const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30
}
