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
