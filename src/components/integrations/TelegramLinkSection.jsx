import { useState, useEffect, useCallback } from 'react';
import {
  getTelegramStatus,
  generateTelegramVerificationCode,
  checkTelegramVerification,
  unlinkTelegram,
  formatTelegramUsername,
  getTelegramDeepLink,
  TELEGRAM_BOT_USERNAME
} from '../../services/telegramApi';
import { useError } from '../../contexts/ErrorContext';
import ConfirmModal from '../ConfirmModal';

function TelegramLinkSection() {
  const { showError } = useError();
  const [linkStatus, setLinkStatus] = useState('loading'); // loading | not_linked | code_generated | linked
  const [verificationCode, setVerificationCode] = useState(null);
  const [telegramInfo, setTelegramInfo] = useState({
    telegramId: null,
    telegramUsername: null,
    telegramFirstName: null
  });
  const [linkedAt, setLinkedAt] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  // Check Telegram status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  // Poll for verification when code is generated
  useEffect(() => {
    if (linkStatus === 'code_generated') {
      const interval = setInterval(async () => {
        const result = await checkTelegramVerification();
        if (result.verified) {
          setLinkStatus('linked');
          setTelegramInfo({
            telegramId: result.telegramId,
            telegramUsername: result.telegramUsername,
            telegramFirstName: result.telegramFirstName
          });
          setLinkedAt(result.linkedAt);
          setVerificationCode(null);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [linkStatus]);

  // Countdown timer for code expiration
  useEffect(() => {
    if (!expiresAt || linkStatus !== 'code_generated') return;

    const checkExpiry = () => {
      if (new Date() > new Date(expiresAt)) {
        setLinkStatus('not_linked');
        setVerificationCode(null);
        setExpiresAt(null);
      }
    };

    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, linkStatus]);

  const checkStatus = async () => {
    try {
      const statusResult = await getTelegramStatus();

      if (statusResult.status === 'linked') {
        setLinkStatus('linked');
        setTelegramInfo({
          telegramId: statusResult.telegramId,
          telegramUsername: statusResult.telegramUsername,
          telegramFirstName: statusResult.telegramFirstName
        });
        setLinkedAt(statusResult.linkedAt);
      } else if (statusResult.status === 'pending_verification' && statusResult.verificationCode) {
        setLinkStatus('code_generated');
        setVerificationCode(statusResult.verificationCode);
        setExpiresAt(statusResult.expiresAt);
      } else {
        setLinkStatus('not_linked');
      }
    } catch (err) {
      console.error('Error checking status:', err);
      setLinkStatus('not_linked');
    }
  };

  const handleGenerateCode = async () => {
    setLoading(true);
    try {
      const result = await generateTelegramVerificationCode();
      setVerificationCode(result.code);
      setExpiresAt(result.expiresAt);
      setLinkStatus('code_generated');
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
      await unlinkTelegram();
      setLinkStatus('not_linked');
      setTelegramInfo({ telegramId: null, telegramUsername: null, telegramFirstName: null });
      setLinkedAt(null);
      setShowUnlinkConfirm(false);
    } catch (err) {
      console.error('Error unlinking Telegram:', err);
      showError('Error al desvincular Telegram. Por favor intentá de nuevo.');
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
    if (linkStatus !== 'code_generated') {
      setTimeRemaining(null);
      return;
    }

    const update = () => setTimeRemaining(getTimeRemaining());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [linkStatus, getTimeRemaining]);

  // Telegram icon SVG
  const TelegramIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );

  // Bot features
  const BotFeatures = () => (
    <div className="space-y-4 mb-4">
      {/* AI Feature highlight */}
      <div
        className="p-4 rounded-xl border"
        style={{
          backgroundColor: 'rgba(0, 136, 204, 0.08)',
          borderColor: 'rgba(0, 136, 204, 0.2)'
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'rgba(0, 136, 204, 0.15)' }}
          >
            <span className="text-xl">🤖</span>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1" style={{ color: '#0088cc' }}>
              Con Inteligencia Artificial
            </h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Chateá naturalmente como si hablaras con una persona. El bot entiende lenguaje natural en español argentino.
            </p>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div
        className="p-4 rounded-xl"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <h4 className="font-medium text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
          Ejemplos de lo que podés decir:
        </h4>
        <div className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <span>💬</span>
            <code className="text-xs" style={{ color: '#0088cc' }}>"Gasté 500 en comida con galicia"</code>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <span>💬</span>
            <code className="text-xs" style={{ color: '#0088cc' }}>"Cobré 50000 de sueldo en santander"</code>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <span>💬</span>
            <code className="text-xs" style={{ color: '#0088cc' }}>"Transferí 10k de mp a brubank"</code>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <span>💬</span>
            <code className="text-xs" style={{ color: '#0088cc' }}>"Cuánto gasté en comida este mes?"</code>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <span>💬</span>
            <code className="text-xs" style={{ color: '#0088cc' }}>"Saldo mercadopago"</code>
          </div>
        </div>
      </div>

      {/* Features list */}
      <div
        className="p-4 rounded-xl"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <h4 className="font-medium text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
          Funcionalidades
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex items-center gap-2">
            <span style={{ color: '#0088cc' }}>💸</span>
            <span>Gastos</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#0088cc' }}>💰</span>
            <span>Ingresos</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#0088cc' }}>🔄</span>
            <span>Transferencias</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#0088cc' }}>📊</span>
            <span>Saldos</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#0088cc' }}>📈</span>
            <span>Resumen mensual</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: '#0088cc' }}>🕐</span>
            <span>Últimos movimientos</span>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          También podés usar los botones del menú si preferís
        </p>
      </div>
    </div>
  );

  return (
    <>
      <div
        className="rounded-2xl p-6 border transition-all"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: linkStatus === 'linked' ? 'rgba(0, 136, 204, 0.3)' : 'var(--border-color)'
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: linkStatus === 'linked'
                ? 'rgba(0, 136, 204, 0.15)'
                : 'rgba(0, 136, 204, 0.1)',
              color: '#0088cc'
            }}
          >
            <TelegramIcon />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
              Bot de Telegram
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {linkStatus === 'linked'
                ? 'Vinculado - Registrá movimientos por mensaje'
                : 'Registrá gastos e ingresos por mensaje'}
            </p>
          </div>
          {linkStatus === 'linked' && (
            <div
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: 'rgba(0, 136, 204, 0.15)', color: '#0088cc' }}
            >
              Conectado
            </div>
          )}
        </div>

        {/* Bot features */}
        <BotFeatures />

        {/* Content based on status */}
        {linkStatus === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* Not linked - show link button */}
        {linkStatus === 'not_linked' && (
          <div className="mt-2">
            <button
              onClick={handleGenerateCode}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#0088cc',
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
                <span>Vincular Telegram</span>
              )}
            </button>
          </div>
        )}

        {/* Code generated - waiting for verification */}
        {linkStatus === 'code_generated' && (
          <div className="mt-2">
            <p className="text-sm mb-3 text-center" style={{ color: 'var(--text-secondary)' }}>
              Copiá el comando y pegalo en el chat del bot
            </p>

            {/* Command to copy */}
            <div
              className="flex items-center justify-between p-4 rounded-xl mb-4"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <code
                className="text-lg font-mono font-semibold"
                style={{ color: '#0088cc' }}
              >
                /start {verificationCode}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`/start ${verificationCode}`);
                  // Optional: show feedback
                  const btn = document.getElementById('copy-btn-telegram');
                  if (btn) {
                    btn.textContent = '¡Copiado!';
                    setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
                  }
                }}
                id="copy-btn-telegram"
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: '#0088cc',
                  color: 'white'
                }}
              >
                Copiar
              </button>
            </div>

            {/* Open Telegram button */}
            <a
              href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mb-4"
              style={{
                backgroundColor: '#0088cc',
                color: 'white'
              }}
            >
              <TelegramIcon />
              <span>Abrir chat en Telegram</span>
            </a>

            {/* Waiting indicator */}
            <div
              className="flex items-center justify-center gap-2 text-sm mb-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: '#0088cc', borderTopColor: 'transparent' }}
              />
              <span>Esperando vinculación...</span>
            </div>

            {/* Timer */}
            {timeRemaining && (
              <p className="text-xs text-center mb-4" style={{ color: 'var(--text-muted)' }}>
                El código expira en {timeRemaining}
              </p>
            )}

            {/* Cancel button */}
            <button
              onClick={() => {
                setLinkStatus('not_linked');
                setVerificationCode(null);
                setExpiresAt(null);
              }}
              className="w-full py-2 px-4 rounded-xl text-sm transition-all"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Linked */}
        {linkStatus === 'linked' && (
          <div className="mt-2">
            <div
              className="p-4 rounded-xl mb-4"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Cuenta vinculada
                  </p>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {telegramInfo.telegramFirstName || 'Usuario'}
                    {telegramInfo.telegramUsername && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {' '}({formatTelegramUsername(telegramInfo.telegramUsername)})
                      </span>
                    )}
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

            {/* Open chat button */}
            <a
              href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mb-3"
              style={{
                backgroundColor: '#0088cc',
                color: 'white'
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              <span>Abrir chat con el bot</span>
            </a>

            <button
              onClick={() => setShowUnlinkConfirm(true)}
              className="w-full py-2 px-4 rounded-xl text-sm transition-all"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)'
              }}
            >
              Desvincular Telegram
            </button>
          </div>
        )}
      </div>

      {/* Unlink confirmation modal */}
      <ConfirmModal
        isOpen={showUnlinkConfirm}
        onClose={() => setShowUnlinkConfirm(false)}
        onConfirm={handleUnlink}
        title="Desvincular Telegram"
        message="¿Estás seguro de que querés desvincular tu Telegram? Ya no podrás registrar movimientos por mensaje."
        confirmText="Desvincular"
        variant="warning"
        loading={loading}
      />
    </>
  );
}

export default TelegramLinkSection;
