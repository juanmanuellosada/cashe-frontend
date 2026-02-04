/**
 * Ordena items poniendo primero los que coincidan con recentIds (en ese orden),
 * y después el resto en su orden original (alfabético).
 *
 * @param {Array} items - Array de objetos con propiedad 'id' o la key especificada
 * @param {Array} recentIds - Array de IDs ordenados por recencia (más reciente primero)
 * @param {string} idKey - Key para matchear ('id', 'value', etc.)
 * @returns {Array} items reordenados
 */
export const sortByRecency = (items, recentIds, idKey = 'id') => {
  if (!recentIds?.length || !items?.length) return items;

  const recentSet = new Map(recentIds.map((id, index) => [id, index]));

  const recientes = [];
  const resto = [];

  items.forEach(item => {
    const itemId = item[idKey];
    if (recentSet.has(itemId)) {
      recientes.push({ item, order: recentSet.get(itemId) });
    } else {
      resto.push(item);
    }
  });

  // Ordenar recientes por su orden de recencia
  recientes.sort((a, b) => a.order - b.order);

  return [...recientes.map(r => r.item), ...resto];
};
