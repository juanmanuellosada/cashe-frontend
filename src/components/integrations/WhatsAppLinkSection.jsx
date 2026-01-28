import { useState, useEffect, useCallback } from 'react';
import {
  getWhatsAppStatus,
  generateVerificationCode,
  checkWhatsAppVerification,
  unlinkWhatsApp,
  formatPhoneForDisplay
} from '../../services/whatsappApi';
import { useError } from '../../contexts/ErrorContext';
import ConfirmModal from '../ConfirmModal';

function WhatsAppLinkSection() {
  const { showError } = useError();
  const [status, setStatus] = useState('loading'); // loading | not_linked | code_generated | linked
  const [verificationCode, setVerificationCode] = useState(null);
  const [linkedPhone, setLinkedPhone] = useState(null);
  const [linkedAt, setLinkedAt] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  // Check WhatsApp status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Poll for verification when code is generated
  useEffect(() => {
    if (status === 'code_generated' || status === 'pending_verification') {
      const interval = setInterval(async () => {
        const result = await checkWhatsAppVerification();
        if (result.verified) {
          setStatus('linked');
          setLinkedPhone(result.phone);
          setLinkedAt(result.linkedAt);
          setVerificationCode(null);
        }
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [status]);

  // Countdown timer for code expiration
  useEffect(() => {
    if (!expiresAt || status !== 'code_generated') return;

    const checkExpiry = () => {
      if (new Date() > new Date(expiresAt)) {
        setStatus('not_linked');
        setVerificationCode(null);
        setExpiresAt(null);
      }
    };

    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  const checkStatus = async () => {
    try {
      const result = await getWhatsAppStatus();

      if (result.status === 'linked') {
        setStatus('linked');
        setLinkedPhone(result.phone);
        setLinkedAt(result.linkedAt);
      } else if (result.status === 'pending_verification' && result.verificationCode) {
        setStatus('code_generated');
        setVerificationCode(result.verificationCode);
        setExpiresAt(result.expiresAt);
      } else {
        setStatus('not_linked');
      }
    } catch (err) {
      console.error('Error checking WhatsApp status:', err);
      setStatus('not_linked');
    }
  };

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const result = await generateVerificationCode();
      setVerificationCode(result.code);
      setExpiresAt(result.expiresAt);
      setStatus('code_generated');
    } catch (err) {
      console.error('Error generating code:', err);
      showError('Error al generar el código. Por favor intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    try {
      await unlinkWhatsApp();
      setStatus('not_linked');
      setLinkedPhone(null);
      setLinkedAt(null);
      setShowUnlinkConfirm(false);
    } catch (err) {
      console.error('Error unlinking WhatsApp:', err);
      showError('Error al desvincular WhatsApp. Por favor intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = useCallback(() => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return null;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [expiresAt]);

  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (status !== 'code_generated') {
      setTimeRemaining(null);
      return;
    }

    const update = () => setTimeRemaining(getTimeRemaining());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status, getTimeRemaining]);

  // WhatsApp icon SVG
  const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );

  return (
    <>
      <div
        className="rounded-2xl p-6 border transition-all"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: status === 'linked' ? 'rgba(37, 211, 102, 0.3)' : 'var(--border-color)'
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: status === 'linked'
                ? 'rgba(37, 211, 102, 0.15)'
                : 'rgba(37, 211, 102, 0.1)',
              color: '#25D366'
            }}
          >
            <WhatsAppIcon />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              WhatsApp
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {status === 'linked'
                ? 'Vinculado - Registrá movimientos por mensaje'
                : 'Registrá gastos e ingresos por mensaje'}
            </p>
          </div>
          {status === 'linked' && (
            <div
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }}
            >
              Conectado
            </div>
          )}
        </div>

        {/* Content based on status */}
        {status === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {status === 'not_linked' && (
          <div className="mt-4">
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Vinculá tu WhatsApp para registrar gastos, ingresos y transferencias
              enviando mensajes de texto. Por ejemplo:
            </p>
            <ul className="text-sm mb-6 space-y-1" style={{ color: 'var(--text-muted)' }}>
              <li>"Gasté 5000 en el super con la visa"</li>
              <li>"Cobré 150000 de sueldo en Galicia"</li>
              <li>"¿Cuánto gasté este mes?"</li>
            </ul>
            <button
              onClick={handleGenerateCode}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#25D366',
                color: 'white',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generando código...</span>
                </>
              ) : (
                <span>Vincular WhatsApp</span>
              )}
            </button>
          </div>
        )}

        {status === 'code_generated' && (
          <div className="mt-4">
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Enviá este código al número de WhatsApp de Cashé:
            </p>

            {/* Large code display */}
            <div className="flex justify-center gap-2 mb-4">
              {verificationCode?.split('').map((digit, i) => (
                <span
                  key={i}
                  className="w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-bold"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--accent-primary)'
                  }}
                >
                  {digit}
                </span>
              ))}
            </div>

            {/* Waiting indicator */}
            <div
              className="flex items-center justify-center gap-2 text-sm mb-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#25D366', borderTopColor: 'transparent' }}
              />
              <span>Esperando verificación...</span>
            </div>

            {/* Timer */}
            {timeRemaining && (
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                El código expira en {timeRemaining}
              </p>
            )}

            {/* Cancel button */}
            <button
              onClick={() => {
                setStatus('not_linked');
                setVerificationCode(null);
                setExpiresAt(null);
              }}
              className="w-full mt-4 py-2 px-4 rounded-xl text-sm transition-all"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        {status === 'linked' && (
          <div className="mt-4">
            <div
              className="p-4 rounded-xl mb-4"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Número vinculado
                  </p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {formatPhoneForDisplay(linkedPhone) || linkedPhone}
                  </p>
                </div>
                {linkedAt && (
                  <div className="text-right">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Vinculado
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(linkedAt).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Ya podés enviar mensajes para registrar movimientos.
              Por ejemplo: "Gasté 3000 en taxi"
            </p>

            <button
              onClick={() => setShowUnlinkConfirm(true)}
              className="w-full py-2 px-4 rounded-xl text-sm transition-all"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              }}
            >
              Desvincular WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Unlink confirmation modal */}
      <ConfirmModal
        isOpen={showUnlinkConfirm}
        onClose={() => setShowUnlinkConfirm(false)}
        onConfirm={handleUnlink}
        title="Desvincular WhatsApp"
        message="¿Estás seguro de que querés desvincular tu WhatsApp? Ya no podrás registrar movimientos por mensaje."
        confirmText="Desvincular"
        variant="warning"
        loading={loading}
      />
    </>
  );
}

export default WhatsAppLinkSection;
