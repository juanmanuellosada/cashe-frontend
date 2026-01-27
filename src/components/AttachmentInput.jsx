import { useState, useRef, useEffect, useCallback } from 'react';
import { formatFileSize, isImageFile, downloadAttachment } from '../services/attachmentStorage';

/**
 * Componente para subir/ver/eliminar adjuntos con Drag & Drop
 *
 * Props:
 * - value: File | null (archivo nuevo seleccionado)
 * - existingAttachment: { url, name } | null (adjunto existente en DB)
 * - onChange: (File | null) => void
 * - onRemoveExisting: () => void (cuando se quiere eliminar el existente)
 * - disabled: boolean
 */
export default function AttachmentInput({
  value,
  existingAttachment,
  onChange,
  onRemoveExisting,
  disabled = false
}) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Crear URL de preview para archivos nuevos
  useEffect(() => {
    if (value && isImageFile(value.name)) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [value]);

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Maximo 5MB.');
      return;
    }
    onChange(file);
  };

  const handleInputChange = (e) => {
    handleFileSelect(e.target.files?.[0]);
  };

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  }, [disabled, onChange]);

  const handleRemove = () => {
    if (value) {
      onChange(null);
    } else if (existingAttachment && onRemoveExisting) {
      onRemoveExisting();
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const displayFile = value || existingAttachment;
  const fileName = value?.name || existingAttachment?.name;
  const fileSize = value?.size;
  const isImage = isImageFile(fileName);
  const imagePreview = previewUrl || (isImage && existingAttachment?.url);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Adjunto (opcional)
      </label>

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {!displayFile ? (
        // Zona de drop / boton para adjuntar
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          disabled={disabled}
          className={`w-full flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isDragging ? 'scale-[1.02]' : ''
          }`}
          style={{
            borderColor: isDragging ? 'var(--accent-primary)' : 'var(--border-subtle)',
            backgroundColor: isDragging ? 'rgba(20, 184, 166, 0.1)' : 'var(--bg-tertiary)',
            color: 'var(--text-secondary)'
          }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: isDragging ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragging ? 'Solta el archivo aqui' : 'Arrastra un archivo o hace click'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Maximo 5MB
            </p>
          </div>
        </button>
      ) : (
        // Mostrar archivo seleccionado o existente
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {/* Thumbnail o icono */}
          {isImage && imagePreview ? (
            <img
              src={imagePreview}
              alt="Preview"
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => existingAttachment?.url && window.open(existingAttachment.url, '_blank')}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <svg className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}

          {/* Info del archivo */}
          <div className="flex-1 min-w-0">
            {existingAttachment && !value ? (
              <button
                type="button"
                onClick={() => downloadAttachment(existingAttachment.url, existingAttachment.name)}
                className="text-sm font-medium truncate block hover:underline text-left"
                style={{ color: 'var(--accent-primary)' }}
              >
                {fileName}
              </button>
            ) : (
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {fileName}
              </p>
            )}
            {fileSize && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {formatFileSize(fileSize)}
              </p>
            )}
          </div>

          {/* Boton eliminar */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20 disabled:opacity-50"
            style={{ color: 'var(--accent-red)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
