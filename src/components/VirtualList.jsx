import { useRef, useCallback, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

/**
 * VirtualList - Virtualized list wrapper for large datasets
 * Only renders items currently visible in the viewport
 */
const VirtualList = memo(function VirtualList({
  items,
  renderItem,
  itemHeight = 88, // Default height for movement items
  threshold = 50, // Only virtualize if more than this many items
  className = '',
  overscanCount = 5, // Number of items to render above/below visible area
}) {
  const listRef = useRef(null);

  // If below threshold, render normally without virtualization
  if (items.length <= threshold) {
    return (
      <div className={className}>
        {items.map((item, index) => renderItem({ item, index, style: {} }))}
      </div>
    );
  }

  // Row renderer for react-window
  const Row = useCallback(({ index, style }) => {
    const item = items[index];
    return (
      <div style={style}>
        {renderItem({ item, index, style: {} })}
      </div>
    );
  }, [items, renderItem]);

  return (
    <div className={className} style={{ height: '100%', minHeight: 400 }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height || 600}
            width={width || '100%'}
            itemCount={items.length}
            itemSize={itemHeight}
            overscanCount={overscanCount}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

export default VirtualList;
