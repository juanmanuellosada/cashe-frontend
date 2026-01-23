import { useState } from 'react';

function Avatar({ src, name, email, size = 'md', className = '' }) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const initial = (name || email)?.[0]?.toUpperCase() || '?';

  // Si hay src y no hubo error, mostrar la imagen
  if (src && !imageError) {
    return (
      <img 
        src={src} 
        alt={name || email || 'Avatar'}
        className={`${sizeClass} rounded-full object-cover ${className}`}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    );
  }

  // Fallback con inicial
  return (
    <div 
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold ${className}`}
      style={{ backgroundColor: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}
    >
      {initial}
    </div>
  );
}

export default Avatar;
