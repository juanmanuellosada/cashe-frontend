import { useState, useEffect } from 'react';
import { getStorageUsage, formatStorageSize } from '../services/attachmentStorage';
import { supabase } from '../config/supabase';

/**
 * Indicador de uso de storage
 * Props:
 * - variant: 'compact' | 'full' (default: 'compact')
 * - className: string adicional
 */
export default function StorageUsageIndicator({ variant = 'compact', className = '' }) {
  const [usage, setUsage] = useState({ used: 0, quota: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await getStorageUsage(user.id);
        setUsage(data);
      }
    } catch (err) {
      console.error('Error loading storage usage:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  const getBarColor = () => {
    if (usage.percentage >= 90) return 'var(--accent-red)';
    if (usage.percentage >= 70) return 'var(--accent-yellow, #eab308)';
    return 'var(--accent-primary)';
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(usage.percentage, 100)}%`,
              backgroundColor: getBarColor()
            }}
          />
        </div>
        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
          {formatStorageSize(usage.used)} / {formatStorageSize(usage.quota)}
        </span>
      </div>
    );
  }

  // Variant: full
  return (
    <div
      className={`p-4 rounded-xl ${className}`}
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Almacenamiento
        </span>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {usage.percentage}% usado
        </span>
      </div>
      <div
        className="h-3 rounded-full overflow-hidden mb-2"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(usage.percentage, 100)}%`,
            backgroundColor: getBarColor()
          }}
        />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {formatStorageSize(usage.used)} de {formatStorageSize(usage.quota)} utilizados
      </p>
      {usage.percentage >= 90 && (
        <p className="text-xs mt-2" style={{ color: 'var(--accent-red)' }}>
          Almacenamiento casi lleno. Elimina adjuntos para liberar espacio.
        </p>
      )}
    </div>
  );
}
