import { useState, useRef, useEffect } from 'react';
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

  // Drag to dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  // Reset drag state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Handle touch start
  const handleTouchStart = (e) => {
    if (e.target.closest('[data-drag-handle]')) {
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) setDragY(diff);
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (dragY > 100 && !saving) onClose();
    setDragY(0);
    setIsDragging(false);
  };

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

  const backdropOpacity = Math.max(0.6 - (dragY / 300), 0);
  const shouldClose = dragY > 100;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto sm:py-6">
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md sm:mx-4 mt-0 rounded-b-2xl sm:rounded-2xl p-4 sm:p-6 animate-slide-down max-h-[90vh] sm:max-h-[calc(100vh-48px)] overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          opacity: shouldClose ? 0.5 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator - mobile only */}
        <div className="sm:hidden flex justify-center -mt-2 mb-2" data-drag-handle>
          <div
            className="w-10 h-1 rounded-full transition-colors"
            style={{
              backgroundColor: shouldClose ? 'var(--accent-red)' : 'var(--border-medium)',
            }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-5" data-drag-handle>
          <div>
            <h3 className="text-base sm:text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Adjuntos del Resumen
            </h3>
            <p className="text-xs sm:text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
              {statement.monthName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={statementInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect(setStatementFile)}
        />
        <input
          ref={receiptInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect(setReceiptFile)}
        />

        {/* Two columns layout for attachments */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Resumen PDF */}
          <div>
            <label className="text-[10px] sm:text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-3 h-3" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Resumen
            </label>

            {hasExistingStatement && !statementFile ? (
              <div
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <button
                  type="button"
                  onClick={() => downloadAttachment(attachments.statementUrl, attachments.statementName)}
                  className="flex-1 text-[11px] font-medium truncate text-left hover:underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {attachments.statementName}
                </button>
                <button
                  type="button"
                  onClick={() => statementInputRef.current?.click()}
                  className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove('statement')}
                  disabled={saving}
                  className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  style={{ color: 'var(--accent-red)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : statementFile ? (
              <div
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {statementFile.name}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatFileSize(statementFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStatementFile(null);
                    if (statementInputRef.current) statementInputRef.current.value = '';
                  }}
                  className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
                  style={{ color: 'var(--accent-red)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => statementInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1 px-2 py-2.5 rounded-lg border border-dashed transition-colors hover:border-[var(--accent-primary)]"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[11px]">PDF</span>
              </button>
            )}
          </div>

          {/* Comprobante de pago */}
          <div>
            <label className="text-[10px] sm:text-xs font-medium mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-3 h-3" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Comprobante
            </label>

            {hasExistingReceipt && !receiptFile ? (
              <div
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                {isImageFile(attachments.receiptName) ? (
                  <img
                    src={attachments.receiptUrl}
                    alt="Receipt"
                    className="w-6 h-6 rounded object-cover flex-shrink-0"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => downloadAttachment(attachments.receiptUrl, attachments.receiptName)}
                  className="flex-1 text-[11px] font-medium truncate text-left hover:underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {attachments.receiptName}
                </button>
                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove('receipt')}
                  disabled={saving}
                  className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20 disabled:opacity-50"
                  style={{ color: 'var(--accent-red)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : receiptFile ? (
              <div
                className="flex items-center gap-1.5 px-2 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {receiptFile.name}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {formatFileSize(receiptFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptFile(null);
                    if (receiptInputRef.current) receiptInputRef.current.value = '';
                  }}
                  className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-red-500/20"
                  style={{ color: 'var(--accent-red)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => receiptInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-1 px-2 py-2.5 rounded-lg border border-dashed transition-colors hover:border-[var(--accent-primary)]"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[11px]">Imagen</span>
              </button>
            )}
          </div>
        </div>

        {/* Texto de ayuda - más compacto */}
        <p className="text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
          Máx. 5MB por archivo
        </p>

        {/* Acciones */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            Cerrar
          </button>
          {hasNewFiles && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 sm:py-3 rounded-xl text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
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
