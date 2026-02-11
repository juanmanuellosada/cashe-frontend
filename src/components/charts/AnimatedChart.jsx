import { motion } from "framer-motion";

/**
 * Wrapper para animar la entrada de gráficos
 * Proporciona animaciones suaves de fade + slide
 */
const AnimatedChart = ({
  children,
  delay = 0,
  direction = "up",
  className = "",
}) => {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  const initial = {
    opacity: 0,
    ...directions[direction],
  };

  const animate = {
    opacity: 1,
    y: 0,
    x: 0,
  };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1], // Custom easing (ease-out-expo)
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Variante con stagger para animar múltiples gráficos en secuencia
 */
export const AnimatedChartGroup = ({ children, staggerDelay = 0.1 }) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Variante para usar dentro de AnimatedChartGroup
 */
export const AnimatedChartItem = ({ children, direction = "up" }) => {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  return (
    <motion.div
      variants={{
        hidden: {
          opacity: 0,
          ...directions[direction],
        },
        visible: {
          opacity: 1,
          y: 0,
          x: 0,
          transition: {
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Animación de scale para números/stats
 */
export const AnimatedNumber = ({ value, duration = 1, className = "" }) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration,
        ease: [0.34, 1.56, 0.64, 1], // Bounce easing
      }}
      className={className}
    >
      {value}
    </motion.span>
  );
};

/**
 * Animación de entrada con bounce para badges
 */
export const AnimatedBadge = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.34, 1.56, 0.64, 1],
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Hover animation para cards interactivos
 */
export const HoverCard = ({ children, className = "" }) => {
  return (
    <motion.div
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedChart;
