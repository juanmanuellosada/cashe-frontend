import { useState, useEffect } from 'react';
import { Bell, CreditCard, Check, Calendar, Clock } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';

function CardReminderSection({ settings, onUpdate, loading }) {
  const [enabled, setEnabled] = useState(settings?.card_reminder_enabled ?? true);
  const [whatsapp, setWhatsapp] = useState(settings?.card_reminder_whatsapp ?? true);
  const [telegram, setTelegram] = useState(settings?.card_reminder_telegram ?? true);
  const [day, setDay] = useState(settings?.card_reminder_day ?? 10);
  const [hour, setHour] = useState(settings?.card_reminder_hour ?? 9);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEnabled(settings?.card_reminder_enabled ?? true);
    setWhatsapp(settings?.card_reminder_whatsapp ?? true);
    setTelegram(settings?.card_reminder_telegram ?? true);
    setDay(settings?.card_reminder_day ?? 10);
    setHour(settings?.card_reminder_hour ?? 9);
  }, [settings]);

  const handleToggle = (field, value) => {
    if (field === 'enabled') setEnabled(value);
    else if (field === 'whatsapp') setWhatsapp(value);
    else if (field === 'telegram') setTelegram(value);
    setHasChanges(true);
  };

  const handleDayChange = (e) => {
    const value = e.target.value;

    // Permitir vacío mientras escribe
    if (value === '') {
      setDay('');
      setHasChanges(true);
      return;
    }

    // Solo permitir números
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 28) {
      setDay(numValue);
      setHasChanges(true);
    }
  };

  const handleDayBlur = () => {
    // Si quedó vacío o inválido, volver al valor anterior o 10 por defecto
    if (day === '' || day < 1 || day > 28) {
      setDay(settings?.card_reminder_day ?? 10);
    }
  };

  const handleHourChange = (e) => {
    const newHour = parseInt(e.target.value);
    if (newHour >= 0 && newHour <= 23) {
      setHour(newHour);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        card_reminder_enabled: enabled,
        card_reminder_whatsapp: whatsapp,
        card_reminder_telegram: telegram,
        card_reminder_day: day,
        card_reminder_hour: hour,
      });
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl p-6 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Recordatorio de tarjetas
            </h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Te recordamos actualizar las fechas de cierre y vencimiento de tus tarjetas cada mes
          </p>
        </div>

        {/* Toggle principal */}
        <button
          onClick={() => handleToggle('enabled', !enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-teal-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* Explicación */}
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-medium)' }}
          >
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-primary)' }} />
              <div>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Las fechas de cierre y vencimiento son necesarias para calcular correctamente tus resúmenes de tarjeta.
                  Cada mes, te enviaremos un recordatorio para que las actualices.
                </p>
              </div>
            </div>
          </div>

          {/* Configuración de día y hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Día del mes */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Calendar className="w-4 h-4 inline mr-1" />
                Día del mes
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={day}
                onChange={handleDayChange}
                onBlur={handleDayBlur}
                placeholder="10"
                className="w-full px-3 py-2 rounded-xl text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Entre 1 y 28
              </p>
            </div>

            {/* Hora del día */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                <Clock className="w-4 h-4 inline mr-1" />
                Hora (Argentina)
              </label>
              <select
                value={hour}
                onChange={handleHourChange}
                className="w-full px-3 py-2 rounded-xl text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Zona horaria de Argentina
              </p>
            </div>
          </div>

          {/* Canales de notificación */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Recibir recordatorio por:
            </label>

            <div className="space-y-3">
              {/* WhatsApp */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsapp}
                  onChange={(e) => handleToggle('whatsapp', e.target.checked)}
                  className="w-4 h-4 rounded accent-teal-500"
                />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  WhatsApp
                </span>
              </label>

              {/* Telegram */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegram}
                  onChange={(e) => handleToggle('telegram', e.target.checked)}
                  className="w-4 h-4 rounded accent-teal-500"
                />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Telegram
                </span>
              </label>
            </div>

            <p className="text-xs mt-3" style={{ color: 'var(--text-tertiary)' }}>
              Solo recibirás notificaciones en los canales que tengas vinculados
            </p>
          </div>

          {/* Botón guardar */}
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: saving ? 'var(--text-tertiary)' : 'var(--accent-primary)',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <LoadingSpinner size="xs" color="white" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Guardar cambios
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default CardReminderSection;
