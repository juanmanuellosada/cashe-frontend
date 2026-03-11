import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import AnimatedChart from './AnimatedChart';
import { formatCurrency } from '../../utils/format';
import { isEmoji, resolveIconPath } from '../../services/iconStorage';

const ACC_COLORS = [
  '#14b8a6', '#8b5cf6', '#f97316', '#0ea5e9', '#10b981', '#ec4899',
];
const CAT_COLORS = [
  '#f43f5e', '#eab308', '#6366f1', '#84cc16', '#a855f7',
  '#22d3ee', '#fb923c', '#4ade80', '#60a5fa', '#f97316',
];

const MAX_ACCOUNTS   = 6;
const MAX_CATEGORIES = 10;
const LABEL_PAD  = 120;
const NODE_W     = 10;
const NODE_GAP   = 12;
const MARGIN_TOP = 24;
const MARGIN_BOT = 8;
const ICON_SIZE  = 13;
const ICON_GAP   = 4;

const stripEmoji = (s) =>
  (s || '').replace(/^[\p{Emoji}\p{Emoji_Presentation}\u200d\uFE0F\s]+/u, '').trim() || s;

// SVG icon — emoji as <text>, image URL as <image>
function SvgIcon({ icon, cx, cy }) {
  if (!icon) return null;
  const x = cx - ICON_SIZE / 2;
  const y = cy - ICON_SIZE / 2;
  if (isEmoji(icon)) {
    return (
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontFamily="inherit"
      >{icon}</text>
    );
  }
  const src = resolveIconPath(icon);
  if (!src) return null;
  return (
    <>
      <clipPath id={`ic-${cx}-${cy}`}>
        <rect x={x} y={y} width={ICON_SIZE} height={ICON_SIZE} rx={2} />
      </clipPath>
      <image
        href={src}
        x={x} y={y}
        width={ICON_SIZE} height={ICON_SIZE}
        clipPath={`url(#ic-${cx}-${cy})`}
        preserveAspectRatio="xMidYMid slice"
      />
    </>
  );
}

// Bezier band: from (x1, sy)→(sy+sh) to (x2, ty)→(ty+th)
function BandPath({ x1, sy, sh, x2, ty, th, color, onEnter, onLeave }) {
  const cx = (x1 + x2) / 2;
  const d = [
    `M ${x1},${sy}`,
    `C ${cx},${sy} ${cx},${ty} ${x2},${ty}`,
    `L ${x2},${ty + th}`,
    `C ${cx},${ty + th} ${cx},${sy + sh} ${x1},${sy + sh}`,
    'Z',
  ].join(' ');
  return (
    <path
      d={d}
      fill={color}
      fillOpacity={0.38}
      stroke={color}
      strokeOpacity={0.15}
      strokeWidth={0.5}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{ cursor: 'default' }}
    />
  );
}

export default function CategoryFlowChart({ movements = [], currency = 'ARS', accounts = [], categories = [] }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w > 0) setWidth(w);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Build icon lookup maps from props
  const accountIconMap = useMemo(() => {
    const m = {};
    for (const acc of accounts) {
      if (acc.nombre && acc.icon) m[acc.nombre] = acc.icon;
    }
    return m;
  }, [accounts]);

  const categoryIconMap = useMemo(() => {
    const m = {};
    for (const cat of categories) {
      // categories can have: label (clean), nombre, name, value (with emoji prefix)
      const name = cat.label || cat.nombre || cat.name;
      if (name && cat.icon) m[name] = cat.icon;
    }
    return m;
  }, [categories]);

  const { hasData, topCategory, totalGastos, layout } = useMemo(() => {
    const gastos = movements.filter(m => m.tipo === 'gasto' && m.cuenta && m.categoria);
    if (!gastos.length) {
      return { hasData: false, topCategory: null, totalGastos: 0, layout: null };
    }

    const accountTotals  = new Map();
    const categoryTotals = new Map();
    for (const m of gastos) {
      const val = m.montoPesos || (m.monedaOriginal !== 'USD' ? m.monto : 0) || 0;
      accountTotals.set(m.cuenta,    (accountTotals.get(m.cuenta)    || 0) + val);
      categoryTotals.set(m.categoria, (categoryTotals.get(m.categoria) || 0) + val);
    }

    const accs = [...accountTotals.entries()].sort((a,b) => b[1]-a[1]).slice(0, MAX_ACCOUNTS).map(([n]) => n);
    const cats = [...categoryTotals.entries()].sort((a,b) => b[1]-a[1]).slice(0, MAX_CATEGORIES).map(([n]) => n);

    const maxNodes = Math.max(accs.length, cats.length);
    const chartH = Math.max(220, Math.min(420, maxNodes * 44 + MARGIN_TOP + MARGIN_BOT)) - MARGIN_TOP - MARGIN_BOT;

    // Account nodes
    const accTotal  = accs.reduce((s, a) => s + (accountTotals.get(a) || 0), 0);
    const accPixels = chartH - (accs.length - 1) * NODE_GAP;
    let ay = 0;
    const accNodes = accs.map((acc, i) => {
      const h = Math.max(2, (accountTotals.get(acc) / accTotal) * accPixels);
      const node = { name: acc, y: ay, h, color: ACC_COLORS[i % ACC_COLORS.length], value: accountTotals.get(acc) };
      ay += h + NODE_GAP;
      return node;
    });

    // Category nodes
    const catTotal  = cats.reduce((s, c) => s + (categoryTotals.get(c) || 0), 0);
    const catPixels = chartH - (cats.length - 1) * NODE_GAP;
    let cy = 0;
    const catNodes = cats.map((cat, i) => {
      const h = Math.max(2, (categoryTotals.get(cat) / catTotal) * catPixels);
      const node = { name: cat, y: cy, h, color: CAT_COLORS[i % CAT_COLORS.length], value: categoryTotals.get(cat) };
      cy += h + NODE_GAP;
      return node;
    });

    // Left links: account → Gastos (stacked in account order → no crossings)
    let gastosLY = 0;
    const leftLinks = accs.map((acc, i) => {
      const flow = accountTotals.get(acc) || 0;
      const lh = Math.max(1, (flow / accTotal) * chartH);
      const link = {
        sy: accNodes[i].y, sh: accNodes[i].h,
        ty: gastosLY,      th: lh,
        color: accNodes[i].color,
        label: `${accNodes[i].name} → Gastos`,
        value: flow,
      };
      gastosLY += lh;
      return link;
    });

    // Right links: Gastos → category (stacked in category order → no crossings)
    let gastosRY = 0;
    const rightLinks = cats.map((cat, i) => {
      const flow = categoryTotals.get(cat) || 0;
      const lh = Math.max(1, (flow / catTotal) * chartH);
      const link = {
        sy: gastosRY,      sh: lh,
        ty: catNodes[i].y, th: catNodes[i].h,
        color: catNodes[i].color,
        label: `Gastos → ${catNodes[i].name}`,
        value: flow,
      };
      gastosRY += lh;
      return link;
    });

    const top = [...categoryTotals.entries()].sort((a,b) => b[1]-a[1])[0];

    return {
      hasData: true,
      topCategory: top ? { name: top[0], total: top[1] } : null,
      totalGastos: catTotal,
      layout: { accNodes, catNodes, leftLinks, rightLinks, chartH },
    };
  }, [movements]);

  const showTooltip = useCallback((e, label, value) => {
    const rect = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, label, value });
  }, []);
  const hideTooltip = useCallback(() => setTooltip(null), []);

  return (
    <AnimatedChart delay={0.15}>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>Flujo por categoría</CardTitle>
              <CardDescription>
                {hasData
                  ? `A dónde va el dinero · ${formatCurrency(totalGastos, currency)} total`
                  : 'Sin gastos en el período'}
              </CardDescription>
            </div>
            {topCategory && (
              <div
                className="text-right flex-shrink-0 px-2.5 py-1 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--accent-red-dim)', color: 'var(--accent-red)' }}
              >
                <p className="font-semibold">{stripEmoji(topCategory.name)}</p>
                <p className="font-medium opacity-80">{formatCurrency(topCategory.total, currency)}</p>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!hasData ? (
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ height: 200, backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            >
              <p className="text-sm">No hay datos para mostrar</p>
            </div>
          ) : (
            <div style={{ paddingLeft: LABEL_PAD, paddingRight: LABEL_PAD }}>
              <div ref={containerRef} style={{ width: '100%' }}>
                {width > 0 && layout && (() => {
                  const { accNodes, catNodes, leftLinks, rightLinks, chartH } = layout;
                  const svgH  = chartH + MARGIN_TOP + MARGIN_BOT;
                  const midX  = Math.round(width / 2 - NODE_W / 2);
                  const rightX = width - NODE_W;

                  return (
                    <svg
                      width={width}
                      height={svgH}
                      style={{ overflow: 'visible', display: 'block' }}
                    >
                      <g transform={`translate(0,${MARGIN_TOP})`}>

                        {/* Left bands: account → Gastos */}
                        {leftLinks.map((lk, i) => (
                          <BandPath
                            key={`ll-${i}`}
                            x1={NODE_W} sy={lk.sy} sh={lk.sh}
                            x2={midX}   ty={lk.ty} th={lk.th}
                            color={lk.color}
                            onEnter={e => showTooltip(e, lk.label, lk.value)}
                            onLeave={hideTooltip}
                          />
                        ))}

                        {/* Right bands: Gastos → category */}
                        {rightLinks.map((lk, i) => (
                          <BandPath
                            key={`rl-${i}`}
                            x1={midX + NODE_W} sy={lk.sy} sh={lk.sh}
                            x2={rightX}        ty={lk.ty} th={lk.th}
                            color={lk.color}
                            onEnter={e => showTooltip(e, lk.label, lk.value)}
                            onLeave={hideTooltip}
                          />
                        ))}

                        {/* Account nodes + labels (left side) */}
                        {accNodes.map((node, i) => {
                          const cy = node.y + node.h / 2;
                          const icon = accountIconMap[node.name];
                          const hasIcon = !!icon;
                          // Layout: [text][gap][icon][gap][node]
                          // icon right edge at x = -ICON_GAP, so icon at x = -ICON_GAP - ICON_SIZE
                          const iconRightX = -ICON_GAP;
                          const iconCx = iconRightX - ICON_SIZE / 2;
                          const textX  = hasIcon ? iconRightX - ICON_SIZE - ICON_GAP : -ICON_GAP;
                          return (
                            <g key={`acc-${i}`}>
                              <rect x={0} y={node.y} width={NODE_W} height={node.h} fill={node.color} rx={2} />
                              {hasIcon && (
                                <SvgIcon icon={icon} cx={iconCx} cy={cy} />
                              )}
                              <text
                                x={textX}
                                y={cy}
                                textAnchor="end"
                                dominantBaseline="middle"
                                fontSize={11}
                                fill="var(--text-secondary)"
                                fontFamily="inherit"
                              >
                                {stripEmoji(node.name)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Gastos node + label */}
                        <rect x={midX} y={0} width={NODE_W} height={chartH} fill="#4b5563" rx={2} />
                        <text
                          x={midX + NODE_W / 2}
                          y={-6}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={600}
                          fill="var(--text-secondary)"
                          fontFamily="inherit"
                        >
                          Gastos
                        </text>

                        {/* Category nodes + labels (right side) */}
                        {catNodes.map((node, i) => {
                          const cy = node.y + node.h / 2;
                          // node.name may have emoji prefix; strip it to match categoryIconMap keys
                          const icon = categoryIconMap[stripEmoji(node.name)] || categoryIconMap[node.name];
                          const hasIcon = !!icon;
                          // Layout: [node][gap][icon][gap][text]
                          const iconLeftX = rightX + NODE_W + ICON_GAP;
                          const iconCx = iconLeftX + ICON_SIZE / 2;
                          const textX  = hasIcon ? iconLeftX + ICON_SIZE + ICON_GAP : rightX + NODE_W + ICON_GAP;
                          return (
                            <g key={`cat-${i}`}>
                              <rect x={rightX} y={node.y} width={NODE_W} height={node.h} fill={node.color} rx={2} />
                              {hasIcon && (
                                <SvgIcon icon={icon} cx={iconCx} cy={cy} />
                              )}
                              <text
                                x={textX}
                                y={cy}
                                textAnchor="start"
                                dominantBaseline="middle"
                                fontSize={11}
                                fill="var(--text-secondary)"
                                fontFamily="inherit"
                              >
                                {stripEmoji(node.name)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Tooltip */}
                        {tooltip && (
                          <g transform={`translate(${tooltip.x + 12},${tooltip.y - 10})`}>
                            <rect
                              x={-6} y={-18}
                              width={Math.max(140, tooltip.label.length * 6.5 + 12)}
                              height={36}
                              rx={6}
                              fill="var(--bg-secondary)"
                              stroke="var(--border-subtle)"
                              strokeWidth={1}
                            />
                            <text x={0} y={-4} fontSize={10.5} fontWeight={600} fill="var(--text-primary)" fontFamily="inherit">
                              {stripEmoji(tooltip.label)}
                            </text>
                            <text x={0} y={12} fontSize={10.5} fill="var(--accent-red)" fontFamily="inherit">
                              {formatCurrency(tooltip.value, currency)}
                            </text>
                          </g>
                        )}

                      </g>
                    </svg>
                  );
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AnimatedChart>
  );
}
