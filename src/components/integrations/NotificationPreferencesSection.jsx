import { useState, useEffect } from 'react';
import { getNotificationPreferences, updateNotificationPreferences } from '../../services/supabaseApi';
import { getPushSubscriptionStatus } from '../../services/pushNotifications';

function NotificationPreferencesSection() {
  const [preferences, setPreferences] = useState({
    notifyPush: true,
    notifyTelegram: false,
    notifyWhatsapp: false,
    notificationHour: 9,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Check linked services status
  const [linkedServices, setLinkedServices] = useState({
    push: false,
    telegram: false,
    whatsapp: false,
  });

  useEffect(() => {
    loadPreferences();
    checkLinkedServices();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await getNotificationPreferences();
      setPreferences(prefs);
    } catch (err) {
      console.error('Error loading notification preferences:', err);
      setError('No se pudieron cargar las preferencias');
    } finally {
      setLoading(false);
    }
  };

  const checkLinkedServices = async () => {
    try {
      // Check push subscription status
      const pushStatus = await getPushSubscriptionStatus();
      setLinkedServices(prev => ({ ...prev, push: pushStatus.subscribed }));

      // Check telegram and whatsapp from supabase - we'll just enable the toggles
      // The actual check happens in the edge function
      // For now, we enable the toggles if user has any linked service
    } catch (err) {
      console.error('Error checking linked services:', err);
    }
  };

  const handleToggle = async (field) => {
    const newValue = !preferences[field];
    const newPreferences = { ...preferences, [field]: newValue };
    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const handleHourChange = async (hour) => {
    const newPreferences = { ...preferences, notificationHour: hour };
    setPreferences(newPreferences);
    await savePreferences(newPreferences);
  };

  const savePreferences = async (prefs) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await updateNotificationPreferences(prefs);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving notification preferences:', err);
      setError('No se pudieron guardar las preferencias');
      // Revert changes
      await loadPreferences();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-tertiary)', width: '60%' }} />
            <div className="h-3 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-tertiary)', width: '80%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--accent-yellow-dim)' }}
        >
          <span className="text-2xl">💳</span>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Vencimiento de Tarjetas
            </h3>
            {success && (
              <span
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}
              >
                Guardado
              </span>
            )}
          </div>

          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Recibí un recordatorio un día antes del vencimiento de tus tarjetas de crédito con el monto a pagar.
          </p>

          {/* Error message */}
          {error && (
            <p className="text-sm mt-2" style={{ color: 'var(--accent-red)' }}>
              {error}
            </p>
          )}

          {/* Toggles */}
          <div className="mt-4 space-y-3">
            {/* Push notifications toggle */}
            <ToggleRow
              label="Notificaciones Push"
              description="En el navegador o app instalada"
              enabled={preferences.notifyPush}
              onToggle={() => handleToggle('notifyPush')}
              disabled={saving}
            />

            {/* Telegram toggle */}
            <ToggleRow
              label="Telegram"
              description="Requiere vincular tu cuenta"
              enabled={preferences.notifyTelegram}
              onToggle={() => handleToggle('notifyTelegram')}
              disabled={saving}
            />

            {/* WhatsApp toggle */}
            <ToggleRow
              label="WhatsApp"
              description="Requiere vincular tu cuenta"
              enabled={preferences.notifyWhatsapp}
              onToggle={() => handleToggle('notifyWhatsapp')}
              disabled={saving}
            />
          </div>

          {/* Notification hour selector */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Hora de notificación
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Hora Argentina (UTC-3)
                </p>
              </div>
              <select
                value={preferences.notificationHour}
                onChange={(e) => handleHourChange(parseInt(e.target.value))}
                disabled={saving}
                className="px-3 py-2 rounded-lg text-sm font-medium border-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info note */}
          <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Las notificaciones se envían un día antes del vencimiento. Asegurate de configurar el día de vencimiento en cada tarjeta de crédito.
          </p>
        </div>
      </div>
    </div>
  );
}

// Toggle row component
function ToggleRow({ label, description, enabled, onToggle, disabled }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="w-full flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
    >
      <div className="text-left">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {description && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      <div
        className="w-11 h-6 rounded-full transition-all duration-200 relative flex-shrink-0"
        style={{
          backgroundColor: enabled ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
        }}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${enabled ? 'left-6' : 'left-1'}`}
        />
      </div>
    </button>
  );
}

export default NotificationPreferencesSection;
