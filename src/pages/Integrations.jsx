import WhatsAppLinkSection from '../components/integrations/WhatsAppLinkSection';
import TelegramLinkSection from '../components/integrations/TelegramLinkSection';
import PushNotificationSection from '../components/integrations/PushNotificationSection';

function Integrations() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          Integraciones
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Conectá servicios externos para gestionar tus finanzas
        </p>
      </div>

      {/* AI Bot Banner */}
      <div
        className="rounded-2xl p-5 border"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
          borderColor: 'rgba(20, 184, 166, 0.2)'
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(20, 184, 166, 0.2)' }}
          >
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Bots con Inteligencia Artificial
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Nuestros bots de Telegram y WhatsApp entienden <strong>lenguaje natural</strong>.
              Escribí como si chatearas con un amigo: <em>"gasté 500 en el super con mp"</em> y
              el bot lo entiende automáticamente.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)', color: 'var(--accent-primary)' }}
              >
                <span>✨</span> Español argentino
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)', color: 'var(--accent-primary)' }}
              >
                <span>🎯</span> Entiende aliases (mp, gal, bru)
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)', color: 'var(--accent-primary)' }}
              >
                <span>✅</span> Confirmación antes de guardar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations list */}
      <div className="space-y-4">
        {/* Push Notifications */}
        <PushNotificationSection />

        {/* Telegram - No restrictions, free to use */}
        <TelegramLinkSection />

        {/* WhatsApp - Requires access approval */}
        <WhatsAppLinkSection />

        {/* Future integrations placeholder */}
        <div
          className="rounded-2xl p-6 border border-dashed"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            opacity: 0.6
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--text-muted)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                Más integraciones próximamente
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Importación de extractos bancarios y más
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Integrations;
