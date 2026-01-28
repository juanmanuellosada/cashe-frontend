import WhatsAppLinkSection from '../components/integrations/WhatsAppLinkSection';

function Integrations() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Integraciones
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Conectá servicios externos para gestionar tus finanzas de forma más cómoda
          </p>
        </div>

        {/* Integrations list */}
        <div className="space-y-6">
          {/* WhatsApp */}
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
                  Telegram, importación de extractos bancarios y más
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Integrations;
