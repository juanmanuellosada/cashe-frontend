/**
 * Servicio para gestionar adjuntos en Supabase Storage
 * Bucket: attachments
 * Estructura: {userId}/{type}/{filename}
 */

import { supabase } from '../config/supabase';

const BUCKET_NAME = 'attachments';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB por archivo
const DEFAULT_QUOTA = 100 * 1024 * 1024; // 100MB por usuario

// ============================================
// STORAGE QUOTA
// ============================================

/**
 * Obtiene el uso de storage del usuario
 * @param {string} userId
 * @returns {Promise<{used: number, quota: number, percentage: number}>}
 */
export const getStorageUsage = async (userId) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('storage_used_bytes, storage_quota_bytes')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error getting storage usage:', error);
    return { used: 0, quota: DEFAULT_QUOTA, percentage: 0 };
  }

  const used = data?.storage_used_bytes || 0;
  const quota = data?.storage_quota_bytes || DEFAULT_QUOTA;
  const percentage = Math.round((used / quota) * 100);

  return { used, quota, percentage };
};

/**
 * Actualiza el uso de storage (suma o resta bytes)
 * @param {string} userId
 * @param {number} bytesChange - positivo para sumar, negativo para restar
 */
export const updateStorageUsage = async (userId, bytesChange) => {
  const { data } = await supabase
    .from('user_settings')
    .select('storage_used_bytes')
    .eq('user_id', userId)
    .single();

  const currentUsed = data?.storage_used_bytes || 0;
  const newUsed = Math.max(0, currentUsed + bytesChange);

  await supabase
    .from('user_settings')
    .update({ storage_used_bytes: newUsed })
    .eq('user_id', userId);
};

/**
 * Verifica si el usuario puede subir un archivo
 * @param {string} userId
 * @param {number} fileSize - tamaño del archivo en bytes
 * @returns {Promise<{canUpload: boolean, message?: string}>}
 */
export const canUploadFile = async (userId, fileSize) => {
  const { used, quota } = await getStorageUsage(userId);

  if (used + fileSize > quota) {
    const quotaMB = Math.round(quota / (1024 * 1024));
    const usedMB = (used / (1024 * 1024)).toFixed(1);
    return {
      canUpload: false,
      message: `Sin espacio suficiente. Usados ${usedMB}MB de ${quotaMB}MB. Eliminá algunos adjuntos para continuar.`
    };
  }

  return { canUpload: true };
};

/**
 * Formatea bytes a texto legible (para indicador de storage)
 */
export const formatStorageSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

// ============================================
// IMAGE COMPRESSION
// ============================================

/**
 * Comprime una imagen si excede cierto tamaño
 * @param {File} file
 * @param {number} maxSizeKB - Tamaño máximo en KB (default 500KB)
 * @param {number} maxDimension - Dimensión máxima en px (default 1920)
 * @returns {Promise<File>}
 */
export const compressImage = async (file, maxSizeKB = 500, maxDimension = 1920) => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  if (file.size <= maxSizeKB * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.8
        );
      };
    };
  });
};

// ============================================
// UPLOAD / DELETE
// ============================================

/**
 * Sube un adjunto al storage
 * @param {File} file - Archivo a subir
 * @param {string} userId - ID del usuario
 * @param {string} type - Tipo: 'movements' | 'transfers'
 * @returns {Promise<{url: string, name: string, path: string, size: number}>}
 */
export const uploadAttachment = async (file, userId, type = 'movements') => {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo');
  }

  // Comprimir si es imagen grande
  let fileToUpload = file;
  if (file.type.startsWith('image/') && file.size > 500 * 1024) {
    fileToUpload = await compressImage(file);
  }

  if (fileToUpload.size > MAX_FILE_SIZE) {
    throw new Error('El archivo es demasiado grande. Máximo 5MB.');
  }

  // Verificar cuota antes de subir
  const { canUpload, message } = await canUploadFile(userId, fileToUpload.size);
  if (!canUpload) {
    throw new Error(message);
  }

  // Generar nombre único
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${userId}/${type}/${fileName}`;

  // Subir archivo
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileToUpload, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading attachment:', error);
    throw new Error('Error al subir el archivo: ' + error.message);
  }

  // Actualizar uso de storage
  await updateStorageUsage(userId, fileToUpload.size);

  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    name: file.name,
    path: data.path,
    size: fileToUpload.size,
  };
};

/**
 * Sube un adjunto de resumen de tarjeta al storage
 * @param {File} file - Archivo a subir
 * @param {string} userId - ID del usuario
 * @param {string} type - Tipo: 'statement' | 'receipt'
 * @returns {Promise<{url: string, name: string, path: string, size: number}>}
 */
export const uploadStatementAttachment = async (file, userId, type = 'statement') => {
  if (!file) {
    throw new Error('No se proporcionó ningún archivo');
  }

  // Comprimir si es imagen grande
  let fileToUpload = file;
  if (file.type.startsWith('image/') && file.size > 500 * 1024) {
    fileToUpload = await compressImage(file);
  }

  if (fileToUpload.size > MAX_FILE_SIZE) {
    throw new Error('El archivo es demasiado grande. Máximo 5MB.');
  }

  // Verificar cuota
  const { canUpload, message } = await canUploadFile(userId, fileToUpload.size);
  if (!canUpload) {
    throw new Error(message);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${userId}/statements/${type}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, fileToUpload, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading statement attachment:', error);
    throw new Error('Error al subir el archivo: ' + error.message);
  }

  // Actualizar uso
  await updateStorageUsage(userId, fileToUpload.size);

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    name: file.name,
    path: data.path,
    size: fileToUpload.size,
  };
};

/**
 * Elimina un adjunto del storage y actualiza el uso
 * @param {string} url - URL pública del adjunto
 */
export const deleteAttachment = async (url) => {
  if (!url || !isAttachmentUrl(url)) return;

  const path = getPathFromAttachmentUrl(url);
  if (!path) return;

  // Obtener userId del path (primer segmento)
  const userId = path.split('/')[0];

  // Intentar obtener tamaño del archivo antes de eliminar
  let fileSize = 0;
  try {
    const dirPath = path.substring(0, path.lastIndexOf('/'));
    const fileName = path.split('/').pop();
    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .list(dirPath, { search: fileName });
    fileSize = data?.[0]?.metadata?.size || 0;
  } catch (e) {
    console.warn('Could not get file size before delete:', e);
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Error deleting attachment:', error);
    throw new Error('Error al eliminar el archivo: ' + error.message);
  }

  // Actualizar uso de storage (restar)
  if (fileSize > 0 && userId) {
    await updateStorageUsage(userId, -fileSize);
  }
};

// ============================================
// HELPERS
// ============================================

/**
 * Verifica si una URL es de un adjunto del storage
 */
export const isAttachmentUrl = (url) => {
  if (!url) return false;
  return url.includes('supabase') && url.includes('/attachments/');
};

/**
 * Extrae el path del storage desde una URL pública
 * @param {string} url - URL pública del storage
 * @returns {string|null}
 */
export const getPathFromAttachmentUrl = (url) => {
  if (!url || !isAttachmentUrl(url)) return null;
  // La URL tiene formato: https://xxx.supabase.co/storage/v1/object/public/attachments/userId/type/filename
  const match = url.match(/\/attachments\/(.+)$/);
  return match ? match[1] : null;
};

/**
 * Verifica si el archivo es una imagen (para mostrar thumbnail)
 */
export const isImageFile = (filename) => {
  if (!filename) return false;
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
};

/**
 * Formatea el tamaño del archivo para mostrar
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

/**
 * Descarga un archivo con su nombre original
 * @param {string} url - URL del archivo
 * @param {string} originalName - Nombre original del archivo
 */
export const downloadAttachment = async (url, originalName) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    // Crear un enlace temporal para descargar
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalName || 'archivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    // Fallback: abrir en nueva pestaña
    window.open(url, '_blank');
  }
};

export default {
  uploadAttachment,
  uploadStatementAttachment,
  deleteAttachment,
  isAttachmentUrl,
  getPathFromAttachmentUrl,
  isImageFile,
  formatFileSize,
  formatStorageSize,
  downloadAttachment,
  getStorageUsage,
  updateStorageUsage,
  canUploadFile,
  compressImage,
};
