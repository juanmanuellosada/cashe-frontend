/**
 * Servicio para gestionar íconos personalizados en Supabase Storage
 * Bucket: icons
 * Estructura: icons/{userId}/{filename}
 */

import { supabase } from '../config/supabase';

const BUCKET_NAME = 'icons';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];

/**
 * Sube un ícono personalizado al storage
 * @param {File} file - Archivo de imagen
 * @param {string} userId - ID del usuario
 * @returns {Promise<{url: string, path: string}>}
 */
export const uploadIcon = async (file, userId) => {
  // Validar archivo
  if (!file) {
    throw new Error('No se proporcionó ningún archivo');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido. Use PNG, JPG, GIF, WebP o SVG.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('El archivo es demasiado grande. Máximo 2MB.');
  }

  // Generar nombre único
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Subir archivo
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading icon:', error);
    throw new Error('Error al subir el ícono: ' + error.message);
  }

  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
};

/**
 * Elimina un ícono del storage
 * @param {string} path - Ruta del archivo (userId/filename)
 * @returns {Promise<void>}
 */
export const deleteIcon = async (path) => {
  if (!path) return;

  // No eliminar si es un ícono predefinido (data:image/svg+xml) o emoji
  if (path.startsWith('data:') || !path.includes('/')) {
    return;
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) {
    console.error('Error deleting icon:', error);
    throw new Error('Error al eliminar el ícono: ' + error.message);
  }
};

/**
 * Lista todos los íconos de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Array<{name: string, url: string, path: string}>>}
 */
export const listUserIcons = async (userId) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(userId, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error('Error listing icons:', error);
    throw new Error('Error al listar los íconos: ' + error.message);
  }

  // Filtrar archivos vacíos y obtener URLs
  return (data || [])
    .filter(file => file.name && file.metadata)
    .map(file => {
      const path = `${userId}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

      return {
        name: file.name,
        url: urlData.publicUrl,
        path: path,
        createdAt: file.created_at,
      };
    });
};

/**
 * Verifica si una URL es de un ícono subido (no predefinido ni emoji)
 * @param {string} iconValue - Valor del ícono
 * @returns {boolean}
 */
export const isUploadedIcon = (iconValue) => {
  if (!iconValue) return false;
  // Es un ícono subido si contiene la URL del storage de Supabase
  return iconValue.includes('supabase') && iconValue.includes('/storage/');
};

/**
 * Verifica si una URL es un ícono predefinido (del catálogo local)
 * @param {string} iconValue - Valor del ícono
 * @returns {boolean}
 */
export const isPredefinedIcon = (iconValue) => {
  if (!iconValue) return false;
  return iconValue.startsWith('/icons/catalog/') || iconValue.startsWith('data:image/svg+xml');
};

/**
 * Verifica si un valor es un emoji
 * @param {string} iconValue - Valor del ícono
 * @returns {boolean}
 */
export const isEmoji = (iconValue) => {
  if (!iconValue) return false;
  // Los emojis son strings cortos que no son URLs ni paths
  return iconValue.length <= 4 && !iconValue.startsWith('data:') && !iconValue.startsWith('http') && !iconValue.startsWith('/');
};

/**
 * Extrae el path del storage desde una URL pública
 * @param {string} url - URL pública del storage
 * @returns {string|null}
 */
export const getPathFromUrl = (url) => {
  if (!url || !isUploadedIcon(url)) return null;

  // La URL tiene formato: https://xxx.supabase.co/storage/v1/object/public/icons/userId/filename
  const match = url.match(/\/icons\/(.+)$/);
  return match ? match[1] : null;
};

export default {
  uploadIcon,
  deleteIcon,
  listUserIcons,
  isUploadedIcon,
  isPredefinedIcon,
  isEmoji,
  getPathFromUrl,
};
