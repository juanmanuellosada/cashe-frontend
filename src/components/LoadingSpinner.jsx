function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const borderWidths = {
    sm: '2px',
    md: '3px',
    lg: '4px',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        {/* Background ring */}
        <div
          className={`${sizeClasses[size]} rounded-full`}
          style={{ 
            border: `${borderWidths[size]} solid var(--border-subtle)`,
          }}
        />
        {/* Spinning gradient ring */}
        <div
          className={`${sizeClasses[size]} absolute inset-0 rounded-full animate-spin`}
          style={{ 
            borderWidth: borderWidths[size],
            borderStyle: 'solid',
            borderColor: 'transparent',
            borderTopColor: 'var(--accent-primary)',
            borderRightColor: 'var(--accent-primary)',
            filter: 'drop-shadow(0 0 8px var(--accent-primary-glow))'
          }}
        />
      </div>
    </div>
  );
}

export default LoadingSpinner;
