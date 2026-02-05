import { useMemo } from 'react';

/**
 * Sparkline SVG inline chart for summary cards.
 * Uses monotone cubic interpolation for smooth curves.
 */
function Sparkline({ data, color = 'var(--accent-primary)', width = 80, height = 30, gradientId }) {
  const pathData = useMemo(() => {
    if (!data || data.length < 2) return null;

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const range = maxVal - minVal || 1;
    const padding = 2;

    // Normalize points
    const points = data.map((val, i) => ({
      x: (i / (data.length - 1)) * width,
      y: padding + (1 - (val - minVal) / range) * (height - padding * 2),
    }));

    // Build monotone cubic spline path
    const lineSegments = [];
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        lineSegments.push(`M ${points[i].x},${points[i].y}`);
      } else {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        lineSegments.push(`C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`);
      }
    }

    const linePath = lineSegments.join(' ');

    // Area path: line path + close to bottom
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const areaPath = `${linePath} L ${lastPoint.x},${height} L ${firstPoint.x},${height} Z`;

    return { linePath, areaPath };
  }, [data, width, height]);

  if (!pathData) return null;

  const gId = gradientId || `sparkline-grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={pathData.areaPath} fill={`url(#${gId})`} />
      <path d={pathData.linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export default Sparkline;
