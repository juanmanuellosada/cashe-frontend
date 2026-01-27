import { useState, useRef } from 'react';
import { formatFileSize, isImageFile, downloadAttachment } from '../services/attachmentStorage';

/**
 * Modal para gestionar adjuntos de resúmenes de tarjeta
 * Permite adjuntar: PDF del resumen + Comprobante de pago
 */
export default function StatementAttachmentsModal({
  isOpen,
  onClose,
  statement, // { id (period), monthName, ... }
  attachments, // { statementUrl, statementName, receiptUrl, receiptName } | null
  onSave, // ({ statementFile, receiptFile }) => Promise
  onRemove, // (field: 'statement' | 'receipt') => Promise
  saving,
}) {
  const [statementFile, setStatementFile] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const statementInputRef = useRef(null);
  const receiptInputRef = useRef(null);

  if (!isOpen || !statement) return null;

  const handleFileSelect = (setter) => (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Maximo 5MB.');
        return;
      }
      setter(file);
    }
  };

  const handleSave = async () => {
    if (!statementFile && !receiptFile) return;
    await onSave({ statementFile, receiptFile });
    setStatementFile(null);
    setReceiptFile(null);
    if (statementInputRef.current) statementInputRef.current.value = '';
    if (receiptInputRef.current) receiptInputRef.current.value = '';
  };

  const handleRemove = async (field) => {
    await onRemove(field);
  };

  const hasExistingStatement = attachments?.statementUrl;
  const hasExistingReceipt = attachments?.receiptUrl;
  const hasNewFiles = statementFile || receiptFile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 animate-scale-in max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Adjuntos del Resumen
            </h3>
            <p className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
              {statement.monthName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Resumen PDF */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Resumen del banco (PDF)
            </span>
          </label>

          <input
            ref={statementInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect(setStatementFile)}
          />

          {hasExistingStatement && !statementFile ? (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <button
                type="button"
                onClick={() => downloadAttachment(attachments.statementUrl, attachments.statementName)}
                className="flex-1 text-sm font-medium truncate text-left hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                {attachments.statementName}
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => statementInputRef.current?.click()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Reemplazar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove('statement')}
                  disabled={saving}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  style={{ color: 'var(--accent-red)' }}
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : statementFile ? (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {statementFile.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatFileSize(statementFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStatementFile(null);
                  if (statementInputRef.current) statementInputRef.current.value = '';
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20"
                style={{ color: 'var(--accent-red)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => statementInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-colors hover:border-[var(--accent-primary)]"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Adjuntar resumen PDF
            </button>
          )}
        </div>

        {/* Comprobante de pago */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--text-primary)' }}>
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Comprobante de pago
            </span>
          </label>

          <input
            ref={receiptInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect(setReceiptFile)}
          />

          {hasExistingReceipt && !receiptFile ? (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                {isImageFile(attachments.receiptName) ? (
                  <img
                    src={attachments.receiptUrl}
                    alt="Receipt"
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <svg className="w-5 h-5" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <button
                type="button"
                onClick={() => downloadAttachment(attachments.receiptUrl, attachments.receiptName)}
                className="flex-1 text-sm font-medium truncate text-left hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                {attachments.receiptName}
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Reemplazar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove('receipt')}
                  disabled={saving}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  style={{ color: 'var(--accent-red)' }}
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : receiptFile ? (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {receiptFile.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatFileSize(receiptFile.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReceiptFile(null);
                  if (receiptInputRef.current) receiptInputRef.current.value = '';
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20"
                style={{ color: 'var(--accent-red)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => receiptInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed transition-colors hover:border-[var(--accent-primary)]"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Adjuntar comprobante
            </button>
          )}
        </div>

        {/* Texto de ayuda */}
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Maximo 5MB por archivo - Cualquier tipo de archivo
        </p>

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            Cerrar
          </button>
          {hasNewFiles && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
