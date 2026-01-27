import { getIconCatalogUrl } from '../hooks/useIconCatalog';
import { isEmoji } from '../services/iconStorage';

/**
 * Renderiza el ícono de una categoría.
 * Prioridad: icon_catalog > icon field > emoji del nombre > fallback
 */
export default function CategoryIcon({ category, size = 'md', className = '' }) {
  const sizeMap = {
    sm: { container: 'w-6 h-6', text: 'text-sm', img: 'w-6 h-6' },
    md: { container: 'w-10 h-10', text: 'text-xl', img: 'w-10 h-10' },
    lg: { container: 'w-12 h-12', text: 'text-2xl', img: 'w-12 h-12' },
  };

  const s = sizeMap[size] || sizeMap.md;

  // 1. Check icon_catalog (joined data)
  if (category?.icon_catalog?.filename) {
    const url = getIconCatalogUrl(category.icon_catalog.filename);
    return (
      <img
        src={url}
        alt={category.icon_catalog.name || ''}
        className={`${s.img} rounded-lg object-contain flex-shrink-0 ${className}`}
      />
    );
  }

  // 2. Check icon field (emoji or uploaded URL)
  if (category?.icon) {
    if (isEmoji(category.icon)) {
      return (
        <span className={`flex items-center justify-center ${s.container} ${s.text} flex-shrink-0 ${className}`}>
          {category.icon}
        </span>
      );
    }
    // URL-based icon (uploaded)
    return (
      <img
        src={category.icon}
        alt=""
        className={`${s.img} rounded-lg object-contain flex-shrink-0 ${className}`}
      />
    );
  }

  // 3. Try emoji from name
  const emojiMatch = category?.nombre?.match?.(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u)
    || category?.name?.match?.(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u);
  if (emojiMatch) {
    return (
      <span className={`flex items-center justify-center ${s.container} ${s.text} flex-shrink-0 ${className}`}>
        {emojiMatch[0]}
      </span>
    );
  }

  // 4. Fallback
  const isIncome = category?.tipo === 'Ingreso' || category?.type === 'income';
  return (
    <span className={`flex items-center justify-center ${s.container} ${s.text} flex-shrink-0 ${className}`}>
      {isIncome ? '💰' : '💸'}
    </span>
  );
}
