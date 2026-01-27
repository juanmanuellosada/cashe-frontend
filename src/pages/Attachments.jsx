import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../config/supabase';
import { isImageFile, downloadAttachment } from '../services/attachmentStorage';
import LoadingSpinner from '../components/LoadingSpinner';
import StorageUsageIndicator from '../components/StorageUsageIndicator';
import ImagePreviewModal from '../components/ImagePreviewModal';

export default function Attachments() {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    loadAttachments();
  }, []);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Cargar movimientos con adjuntos
      const { data: movements } = await supabase
        .from('movements')
        .select('id, type, date, amount, note, attachment_url, attachment_name, category_id, account_id')
        .eq('user_id', user.id)
        .not('attachment_url', 'is', null)
        .order('date', { ascending: false });

      // Cargar transferencias con adjuntos
      const { data: transfers } = await supabase
        .from('transfers')
        .select('id, date, from_amount, note, attachment_url, attachment_name, from_account_id, to_account_id')
        .eq('user_id', user.id)
        .not('attachment_url', 'is', null)
        .order('date', { ascending: false });

      // Cargar adjuntos de resumenes
      const { data: statements } = await supabase
        .from('card_statement_attachments')
        .select('id, period, statement_url, statement_name, receipt_url, receipt_name, account_id')
        .eq('user_id', user.id)
        .order('period', { ascending: false });

      // Cargar cuentas y categorias para nombres
      const [{ data: accounts }, { data: categories }] = await Promise.all([
        supabase.from('accounts').select('id, name').eq('user_id', user.id),
        supabase.from('categories').select('id, name').eq('user_id', user.id),
      ]);

      const accountMap = {};
      (accounts || []).forEach(a => { accountMap[a.id] = a.name; });
      const categoryMap = {};
      (categories || []).forEach(c => { categoryMap[c.id] = c.name; });

      // Mapear a formato uniforme
      const mapped = [];

      (movements || []).forEach(m => {
        mapped.push({
          id: m.id,
          type: m.type === 'income' ? 'incomes' : 'expenses',
          typeLabel: m.type === 'income' ? 'Ingreso' : 'Gasto',
          date: m.date,
          description: categoryMap[m.category_id] || m.note || 'Sin descripcion',
          account: accountMap[m.account_id],
          attachmentUrl: m.attachment_url,
          attachmentName: m.attachment_name,
        });
      });

      (transfers || []).forEach(t => {
        mapped.push({
          id: t.id,
          type: 'transfers',
          typeLabel: 'Transferencia',
          date: t.date,
          description: `${accountMap[t.from_account_id] || '?'} → ${accountMap[t.to_account_id] || '?'}`,
          attachmentUrl: t.attachment_url,
          attachmentName: t.attachment_name,
        });
      });

      (statements || []).forEach(s => {
        const [year, month] = s.period.split('-');
        const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: es });

        if (s.statement_url) {
          mapped.push({
            id: `${s.id}-statement`,
            type: 'statements',
            typeLabel: 'Resumen TC',
            date: `${s.period}-01`,
            description: `${accountMap[s.account_id] || 'Tarjeta'} - ${monthName}`,
            attachmentUrl: s.statement_url,
            attachmentName: s.statement_name,
          });
        }
        if (s.receipt_url) {
          mapped.push({
            id: `${s.id}-receipt`,
            type: 'statements',
            typeLabel: 'Comprobante TC',
            date: `${s.period}-01`,
            description: `${accountMap[s.account_id] || 'Tarjeta'} - ${monthName}`,
            attachmentUrl: s.receipt_url,
            attachmentName: s.receipt_name,
          });
        }
      });

      mapped.sort((a, b) => new Date(b.date) - new Date(a.date));
      setAttachments(mapped);
    } catch (err) {
      console.error('Error loading attachments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttachments = useMemo(() => {
    if (filter === 'all') return attachments;
    return attachments.filter(a => a.type === filter);
  }, [attachments, filter]);

  const filters = [
    { key: 'all', label: 'Todos' },
    { key: 'expenses', label: 'Gastos' },
    { key: 'incomes', label: 'Ingresos' },
    { key: 'transfers', label: 'Transferencias' },
    { key: 'statements', label: 'Tarjetas' },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case 'expenses': return 'var(--accent-red)';
      case 'incomes': return 'var(--accent-green)';
      case 'transfers': return 'var(--accent-blue, #3b82f6)';
      case 'statements': return 'var(--accent-primary)';
      default: return 'var(--text-secondary)';
    }
  };

  const handleClick = (attachment) => {
    if (isImageFile(attachment.attachmentName)) {
      setPreviewImage(attachment);
    } else {
      downloadAttachment(attachment.attachmentUrl, attachment.attachmentName);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Adjuntos
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {attachments.length} archivo{attachments.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Indicador de storage */}
      <StorageUsageIndicator variant="full" />

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.key ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: filter === f.key ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: filter === f.key ? 'white' : 'var(--text-secondary)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de adjuntos */}
      <div className="space-y-2">
        {filteredAttachments.length === 0 ? (
          <div
            className="text-center py-12 rounded-xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <p style={{ color: 'var(--text-secondary)' }}>
              {filter === 'all' ? 'No hay adjuntos' : 'No hay adjuntos en esta categoria'}
            </p>
          </div>
        ) : (
          filteredAttachments.map(attachment => (
            <div
              key={attachment.id}
              onClick={() => handleClick(attachment)}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              {/* Thumbnail o icono */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                {isImageFile(attachment.attachmentName) ? (
                  <img
                    src={attachment.attachmentUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-6 h-6" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {attachment.attachmentName}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {attachment.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${getTypeColor(attachment.type)} 20%, transparent)`,
                      color: getTypeColor(attachment.type)
                    }}
                  >
                    {attachment.typeLabel}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {format(new Date(attachment.date), "d MMM yyyy", { locale: es })}
                  </span>
                </div>
              </div>

              {/* Icono de abrir */}
              <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          ))
        )}
      </div>

      {/* Preview modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        imageUrl={previewImage?.attachmentUrl}
        imageName={previewImage?.attachmentName}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
