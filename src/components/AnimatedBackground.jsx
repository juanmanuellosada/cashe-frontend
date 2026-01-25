import { useEffect, useRef } from 'react';

/**
 * Animated background component for public pages (landing, login, register, etc.)
 * Features floating finance icons that bounce off edges
 */
function AnimatedBackground() {
  const containerRef = useRef(null);
  const iconsRef = useRef([]);
  const animationRef = useRef(null);

  // Finance icons from catalog
  const icons = [
    { src: 'icons/catalog/banco-ciudad.svg', size: 28 },
    { src: 'icons/catalog/banco-galicia.svg', size: 28 },
    { src: 'icons/catalog/banco-nacion.svg', size: 30 },
    { src: 'icons/catalog/banco-provincia.svg', size: 28 },
    { src: 'icons/catalog/banco-supervielle.svg', size: 26 },
    { src: 'icons/catalog/belo.svg', size: 26 },
    { src: 'icons/catalog/brubank.svg', size: 28 },
    { src: 'icons/catalog/buenbit.svg', size: 26 },
    { src: 'icons/catalog/cocos.svg', size: 28 },
    { src: 'icons/catalog/cuenta-dni.svg', size: 28 },
    { src: 'icons/catalog/HSBC.svg', size: 28 },
    { src: 'icons/catalog/ieb.svg', size: 26 },
    { src: 'icons/catalog/lemon.svg', size: 28 },
    { src: 'icons/catalog/mercadopago.svg', size: 30 },
    { src: 'icons/catalog/modo.svg', size: 28 },
    { src: 'icons/catalog/naranja-x.svg', size: 28 },
    { src: 'icons/catalog/uala.svg', size: 28 },
  ];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const bounds = container.getBoundingClientRect();

    // Initialize icon states with random positions and velocities
    const iconStates = icons.map((icon, index) => ({
      x: Math.random() * (bounds.width - icon.size - 100) + 50,
      y: Math.random() * (bounds.height - icon.size - 100) + 50,
      vx: (Math.random() - 0.5) * 0.8, // Velocity X (-0.4 to 0.4)
      vy: (Math.random() - 0.5) * 0.8, // Velocity Y (-0.4 to 0.4)
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      size: icon.size,
    }));

    const animate = () => {
      const currentBounds = container.getBoundingClientRect();

      iconStates.forEach((state, index) => {
        const iconEl = iconsRef.current[index];
        if (!iconEl) return;

        // Update position
        state.x += state.vx;
        state.y += state.vy;
        state.rotation += state.rotationSpeed;

        // Bounce off edges
        if (state.x <= 0 || state.x >= currentBounds.width - state.size) {
          state.vx *= -1;
          state.x = Math.max(0, Math.min(state.x, currentBounds.width - state.size));
        }
        if (state.y <= 0 || state.y >= currentBounds.height - state.size) {
          state.vy *= -1;
          state.y = Math.max(0, Math.min(state.y, currentBounds.height - state.size));
        }

        // Apply transform
        iconEl.style.transform = `translate(${state.x}px, ${state.y}px) rotate(${state.rotation}deg)`;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const setIconRef = (index) => (el) => {
    iconsRef.current[index] = el;
  };

  const basePath = import.meta.env.BASE_URL;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient Orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)',
          top: '-200px',
          right: '-200px',
          animation: 'float-slow 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, var(--accent-green) 0%, transparent 70%)',
          bottom: '-150px',
          left: '-150px',
          animation: 'float-slow 25s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[80px]"
        style={{
          background: 'radial-gradient(circle, var(--accent-blue) 0%, transparent 70%)',
          top: '40%',
          left: '50%',
          animation: 'pulse-soft 15s ease-in-out infinite',
        }}
      />

      {/* Floating Finance Icons */}
      {icons.map((icon, index) => (
        <img
          key={index}
          ref={setIconRef(index)}
          src={`${basePath}${icon.src}`}
          alt=""
          className="absolute select-none rounded-lg"
          style={{
            width: icon.size,
            height: icon.size,
            opacity: 0.15,
            top: 0,
            left: 0,
            willChange: 'transform',
          }}
        />
      ))}

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(var(--text-primary) 1px, transparent 1px),
            linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

export default AnimatedBackground;
