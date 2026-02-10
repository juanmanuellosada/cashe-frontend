import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllDollarRates, fetchInflationData, fetchRiesgoPais, updateExchangeRateType, getExchangeRate } from '../../services/supabaseApi';
import { formatNumberAR } from '../../utils/format';

// Mapeo de tipos de dólar
const DOLLAR_TYPES = {
  oficial: { nombre: 'Oficial', descripcion: 'Banco Nación' },
  blue: { nombre: 'Blue', descripcion: 'Informal' },
  bolsa: { nombre: 'MEP', descripcion: 'Bolsa/MEP' },
  contadoconliqui: { nombre: 'CCL', descripcion: 'Contado con liquidación' },
};

const CACHE_KEY = 'cashe_economic_indicators';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

// Nombres de meses en español
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Formatear fecha ISO a "Enero 2025"
const formatMonthYear = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

// Formatear fecha ISO a "4 de Febrero 2025"
const formatFullDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
};

// Componente de tooltip para inflación
function InflationTooltip({ children, title, description, details }) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow(!show)}
    >
      {children}

      {/* Tooltip */}
      {show && (
        <div
          className="absolute left-0 bottom-full mb-2 w-56 p-3 rounded-xl shadow-lg z-[9999] animate-scale-in"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {title}
          </p>
          <p className="text-[11px] leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
          {details && (
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {details}
            </p>
          )}
          {/* Arrow */}
          <div
            className="absolute left-4 -bottom-1.5 w-3 h-3 rotate-45"
            style={{ backgroundColor: 'var(--bg-elevated)', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}
          />
        </div>
      )}
    </div>
  );
}

function EconomicIndicatorsCard({ onExchangeRateChange }) {
  const navigate = useNavigate();

  const [dollarRates, setDollarRates] = useState(null);
  const [inflation, setInflation] = useState(null);
  const [riesgoPais, setRiesgoPais] = useState(null);
  const [selectedType, setSelectedType] = useState('oficial');
  const [currentRate, setCurrentRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Verificar cache
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setDollarRates(data.dollarRates);
          setInflation(data.inflation);
          setRiesgoPais(data.riesgoPais);
          // Solo cargar tipo de usuario
          const exchangeData = await getExchangeRate();
          setSelectedType(exchangeData.tipoUsado || 'oficial');
          setCurrentRate(exchangeData.tipoCambio);
          setLoading(false);
          return;
        }
      }

      // Fetch paralelo de datos
      const [rates, inflationData, riesgoPaisData, exchangeData] = await Promise.all([
        fetchAllDollarRates(),
        fetchInflationData(),
        fetchRiesgoPais(),
        getExchangeRate(),
      ]);

      setDollarRates(rates);
      setInflation(inflationData);
      setRiesgoPais(riesgoPaisData);
      setSelectedType(exchangeData.tipoUsado || 'oficial');
      setCurrentRate(exchangeData.tipoCambio);

      // Guardar en cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: { dollarRates: rates, inflation: inflationData, riesgoPais: riesgoPaisData },
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error('Error loading economic data:', err);
      setError('No se pudieron cargar los indicadores');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar tipo de dólar
  const handleTypeChange = async (tipo) => {
    if (tipo === selectedType || updating) return;

    setUpdating(true);
    setShowTypeSelector(false);

    try {
      const result = await updateExchangeRateType(tipo);
      setSelectedType(tipo);
      setCurrentRate(result.tipoCambio);

      // Notificar al parent para refrescar dashboard
      if (onExchangeRateChange) {
        await onExchangeRateChange();
      }
    } catch (err) {
      console.error('Error updating exchange rate type:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Forzar refresh
  const handleRefresh = async () => {
    // Limpiar cache
    sessionStorage.removeItem(CACHE_KEY);
    await loadData();
  };

  // Obtener cotización actual del tipo seleccionado
  const selectedDollarRate = useMemo(() => {
    if (!dollarRates) return null;
    return dollarRates.find(r => r.casa === selectedType);
  }, [dollarRates, selectedType]);

  // Filtrar solo los tipos que queremos mostrar
  const displayRates = useMemo(() => {
    if (!dollarRates) return [];
    return dollarRates.filter(r => DOLLAR_TYPES[r.casa]);
  }, [dollarRates]);

  // Calcular brecha cambiaria (blue vs oficial)
  const brechaCambiaria = useMemo(() => {
    if (!dollarRates) return null;
    const oficial = dollarRates.find(r => r.casa === 'oficial');
    const blue = dollarRates.find(r => r.casa === 'blue');
    if (!oficial?.venta || !blue?.venta) return null;

    const brecha = ((blue.venta - oficial.venta) / oficial.venta) * 100;
    return {
      valor: brecha,
      oficialVenta: oficial.venta,
      blueVenta: blue.venta,
    };
  }, [dollarRates]);

  // Skeleton loading
  if (loading) {
    return (
      <div
        className="p-4 sm:p-5 rounded-xl sm:rounded-2xl animate-pulse"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-24 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="h-5 w-5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
        </div>
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
          <div className="h-32 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="h-32 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
        </div>
        <div className="h-12 rounded-xl mt-3" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
      </div>
    );
  }

  // Error state
  if (error && !dollarRates && !inflation) {
    return (
      <div
        className="p-4 sm:p-5 rounded-xl sm:rounded-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="p-4 sm:p-5 rounded-xl sm:rounded-2xl relative"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Economía
          </h3>
        </div>
        <button
          onClick={() => navigate('/configuracion')}
          className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
          title="Ir a configuración"
        >
          <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Main content - 2 columns */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 mb-3">
        {/* Columna izquierda: Inflación + Indicadores */}
        <div
          className="p-3 sm:p-4 rounded-xl flex flex-col"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {/* Inflación */}
          <div className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wide font-semibold mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Inflación
            </p>

            {inflation ? (
              <div className="space-y-2.5">
                {/* Mensual */}
                <InflationTooltip
                  title="Inflación Mensual"
                  description="Variación de precios respecto al mes anterior. Mide cuánto aumentaron los precios en un solo mes."
                  details={`Dato de ${formatMonthYear(inflation.mensual?.fecha)}`}
                >
                  <div className="flex items-center justify-between cursor-help py-0.5">
                    <span className="text-xs sm:text-sm flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Mensual
                      <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm sm:text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {inflation.mensual?.valor?.toFixed(1)}%
                      </span>
                      {inflation.mensualAnterior !== null && (
                        <span
                          className="text-xs flex items-center"
                          style={{
                            color: inflation.mensual?.valor < inflation.mensualAnterior
                              ? 'var(--accent-green)'
                              : 'var(--accent-red)'
                          }}
                        >
                          {inflation.mensual?.valor < inflation.mensualAnterior ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  </div>
                </InflationTooltip>

                {/* Interanual */}
                <InflationTooltip
                  title="Inflación Interanual"
                  description="Variación de precios respecto al mismo mes del año anterior. Muestra cuánto aumentaron los precios en los últimos 12 meses."
                  details={`Comparando ${formatMonthYear(inflation.interanual?.fecha)} con el mismo mes del año anterior`}
                >
                  <div className="flex items-center justify-between cursor-help py-0.5">
                    <span className="text-xs sm:text-sm flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                      Interanual
                      <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <span className="text-sm sm:text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {inflation.interanual?.valor?.toFixed(1)}%
                    </span>
                  </div>
                </InflationTooltip>
              </div>
            ) : (
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>No disponible</p>
            )}
          </div>

          {/* Indicadores: Riesgo País + Brecha */}
          <div className="flex-1">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wide font-semibold mb-2.5" style={{ color: 'var(--text-muted)' }}>
              Indicadores
            </p>

            <div className="space-y-2.5">
              {/* Riesgo País */}
              <InflationTooltip
                title="Riesgo País"
                description="Mide la diferencia de tasa que paga Argentina para endeudarse respecto a los bonos del Tesoro de EE.UU. A menor valor, mejor percepción de los mercados."
                details={riesgoPais?.fecha ? `Dato del ${formatFullDate(riesgoPais.fecha)}` : null}
              >
                <div className="flex items-center justify-between cursor-help py-0.5">
                  <span className="text-xs sm:text-sm flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Riesgo País
                    <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  {riesgoPais?.valor ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm sm:text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {riesgoPais.valor} pts
                      </span>
                      {riesgoPais.valorAnterior && riesgoPais.valor !== riesgoPais.valorAnterior && (
                        <span
                          className="text-xs flex items-center"
                          style={{
                            color: riesgoPais.valor < riesgoPais.valorAnterior
                              ? 'var(--accent-green)'
                              : 'var(--accent-red)'
                          }}
                        >
                          {riesgoPais.valor < riesgoPais.valorAnterior ? '↓' : '↑'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </div>
              </InflationTooltip>

              {/* Brecha Cambiaria */}
              <InflationTooltip
                title="Brecha Cambiaria"
                description="Diferencia porcentual entre el dólar blue y el oficial. Indica la distorsión del mercado cambiario."
                details={brechaCambiaria ? `Blue $${formatNumberAR(brechaCambiaria.blueVenta, 0)} vs Oficial $${formatNumberAR(brechaCambiaria.oficialVenta, 0)}` : null}
              >
                <div className="flex items-center justify-between cursor-help py-0.5">
                  <span className="text-xs sm:text-sm flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Brecha
                    <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  {brechaCambiaria ? (
                    <span
                      className="text-sm sm:text-base font-semibold"
                      style={{
                        color: brechaCambiaria.valor > 50
                          ? 'var(--accent-red)'
                          : brechaCambiaria.valor > 20
                            ? 'var(--accent-yellow)'
                            : 'var(--accent-green)'
                      }}
                    >
                      {brechaCambiaria.valor.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </div>
              </InflationTooltip>
            </div>
          </div>
        </div>

        {/* Columna derecha: Dólar */}
        <div
          className="p-3 sm:p-4 rounded-xl flex flex-col"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wide font-semibold mb-2.5" style={{ color: 'var(--text-muted)' }}>
            Dólar
          </p>

          {displayRates.length > 0 ? (
            <div className="flex-1 flex flex-col justify-between">
              {displayRates.slice(0, 4).map((rate) => {
                const isSelected = rate.casa === selectedType;
                return (
                  <div
                    key={rate.casa}
                    className="flex items-center justify-between py-1.5 sm:py-2 px-2 -mx-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-primary-dim)' : 'transparent',
                    }}
                  >
                    <span
                      className="text-xs sm:text-sm font-medium"
                      style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                    >
                      {DOLLAR_TYPES[rate.casa]?.nombre || rate.nombre}
                    </span>
                    <span className="text-xs sm:text-sm tabular-nums font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      ${formatNumberAR(rate.compra, 0)} / ${formatNumberAR(rate.venta, 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>No disponible</p>
          )}
        </div>
      </div>

      {/* Selector de tipo de cambio */}
      <div className="relative">
        <button
          onClick={() => setShowTypeSelector(!showTypeSelector)}
          disabled={updating}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl transition-colors overflow-hidden"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Usando:</span>
            <span className="text-sm font-medium truncate" style={{ color: 'var(--accent-primary)' }}>
              {DOLLAR_TYPES[selectedType]?.nombre || selectedType}
            </span>
            {currentRate && (
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                ${formatNumberAR(currentRate, 0)}/USD
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {updating ? (
              <div className="w-4 h-4 border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] rounded-full animate-spin" />
            ) : (
              <>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      handleRefresh();
                    }
                  }}
                  className="p-1 rounded hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                  title="Actualizar cotizaciones"
                >
                  <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${showTypeSelector ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--text-muted)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </div>
        </button>

        {/* Dropdown */}
        {showTypeSelector && (
          <div
            className="absolute bottom-full left-0 right-0 mb-1 p-2 rounded-xl shadow-lg z-[9998] animate-scale-in overflow-hidden"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            {Object.entries(DOLLAR_TYPES).map(([key, { nombre, descripcion }]) => {
              const rate = dollarRates?.find(r => r.casa === key);
              const isSelected = key === selectedType;

              return (
                <button
                  key={key}
                  onClick={() => handleTypeChange(key)}
                  className="w-full flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
                  style={{
                    backgroundColor: isSelected ? 'var(--accent-primary-dim)' : 'transparent',
                  }}
                >
                  <div className="text-left">
                    <p
                      className="text-sm font-medium"
                      style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}
                    >
                      {nombre}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {descripcion}
                    </p>
                  </div>
                  {rate && (
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      ${formatNumberAR(rate.venta, 0)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default EconomicIndicatorsCard;
