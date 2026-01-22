import { useState } from 'react';
import { formatCurrency } from '../../utils/format';

function QuickStats({ ingresosMes, gastosMes, balanceMes, ingresosMesDolares = 0, gastosMesDolares = 0 }) {
  const [currency, setCurrency] = useState('ARS');

  const ingresos = currency === 'ARS' ? ingresosMes : ingresosMesDolares;
  const gastos = currency === 'ARS' ? gastosMes : gastosMesDolares;

  return (
    <div className="space-y-3">
      {/* Currency Selector */}
      <div className="flex justify-end">
        <div
          className="inline-flex rounded-lg p-0.5"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <button
            onClick={() => setCurrency('ARS')}
            className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: currency === 'ARS' ? 'var(--accent-primary)' : 'transparent',
              color: currency === 'ARS' ? 'white' : 'var(--text-secondary)',
            }}
          >
            Pesos
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: currency === 'USD' ? 'var(--accent-primary)' : 'transparent',
              color: currency === 'USD' ? 'white' : 'var(--text-secondary)',
            }}
          >
            Dólares
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Ingresos del mes */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-green-500/10 cursor-default"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {/* Gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, transparent 70%)'
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Ingresos
              </span>
            </div>
            <p className="text-xl font-bold mb-1" style={{ color: 'var(--accent-green)' }}>
              +{formatCurrency(Math.abs(ingresos), currency)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              este mes
            </p>
          </div>
        </div>

        {/* Gastos del mes */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-red-500/10 cursor-default"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {/* Gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, transparent 70%)'
            }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Gastos
              </span>
            </div>
            <p className="text-xl font-bold mb-1" style={{ color: 'var(--accent-red)' }}>
              -{formatCurrency(Math.abs(gastos), currency)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              este mes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickStats;
