import { formatCurrency, formatDate } from './format';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function generateMarkdownReport(data, monthLabel) {
  const {
    totalIngresos, totalGastos, balance, ahorroRate,
    prevMonthLabel, prevTotalIngresos, prevTotalGastos,
    gastosPorCategoria, ingresosPorCategoria,
    topGastos, gastoDiario, diaMasCaro, diasSinGastos, diasDelMes,
    transferencias, cuotasActivas,
    movimientos, cuentas, currency,
    proyeccion,
  } = data;

  const cur = currency || 'ARS';
  const fmt = (n) => formatCurrency(n, cur);
  const today = new Date().toLocaleDateString('es-AR');

  const pct = (actual, anterior) => {
    if (!anterior || anterior === 0) return 'N/A';
    const diff = ((actual - anterior) / Math.abs(anterior)) * 100;
    return (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
  };

  let md = `# Resumen Financiero — ${monthLabel}\n\n`;

  // Resumen ejecutivo
  md += `## Resumen Ejecutivo\n\n`;
  md += `| | ${cur === 'USD' ? 'USD' : 'ARS'} |\n|---|---|\n`;
  md += `| Total ingresos | ${fmt(totalIngresos)} |\n`;
  md += `| Total gastos | ${fmt(totalGastos)} |\n`;
  md += `| Balance neto | ${fmt(balance)} |\n`;
  md += `| Tasa de ahorro | ${ahorroRate}% |\n\n`;

  // Comparativa
  if (prevMonthLabel) {
    md += `## Comparativa vs ${prevMonthLabel}\n\n`;
    md += `| | ${prevMonthLabel} | ${monthLabel} | Variación |\n|---|---|---|---|\n`;
    md += `| Ingresos | ${fmt(prevTotalIngresos)} | ${fmt(totalIngresos)} | ${pct(totalIngresos, prevTotalIngresos)} |\n`;
    md += `| Gastos | ${fmt(prevTotalGastos)} | ${fmt(totalGastos)} | ${pct(totalGastos, prevTotalGastos)} |\n\n`;
  }

  // Balance por cuenta
  if (cuentas && cuentas.length > 0) {
    md += `## Balance por Cuenta\n\n`;
    md += `| Cuenta | Tipo | Saldo actual |\n|---|---|---|\n`;
    cuentas.forEach(c => {
      if (!c.ocultaDelBalance) {
        md += `| ${c.nombre} | ${c.tipo} | ${fmt(c.balanceActual)} |\n`;
      }
    });
    md += '\n';
  }

  // Gastos por categoría
  if (gastosPorCategoria && gastosPorCategoria.length > 0) {
    md += `## Gastos por Categoría\n\n`;
    md += `| Categoría | Monto | % |\n|---|---|---|\n`;
    gastosPorCategoria.forEach(c => {
      md += `| ${c.name} | ${fmt(c.value)} | ${c.percentage.toFixed(1)}% |\n`;
    });
    md += '\n';
  }

  // Ingresos por categoría
  if (ingresosPorCategoria && ingresosPorCategoria.length > 0) {
    md += `## Ingresos por Categoría\n\n`;
    md += `| Categoría | Monto | % |\n|---|---|---|\n`;
    ingresosPorCategoria.forEach(c => {
      md += `| ${c.name} | ${fmt(c.value)} | ${c.percentage.toFixed(1)}% |\n`;
    });
    md += '\n';
  }

  // Cuotas activas
  if (cuotasActivas && cuotasActivas.length > 0) {
    md += `## Cuotas Activas\n\n`;
    md += `| Descripción | Cuotas | Monto mensual |\n|---|---|---|\n`;
    cuotasActivas.forEach(c => {
      md += `| ${c.nota || 'Sin descripción'} | ${c.cuota} | ${fmt(c.monto)} |\n`;
    });
    md += '\n';
  }

  // Top 5 gastos
  if (topGastos && topGastos.length > 0) {
    md += `## Top 5 Gastos del Mes\n\n`;
    md += `| Fecha | Nota | Monto | Cuenta |\n|---|---|---|---|\n`;
    topGastos.forEach(g => {
      md += `| ${formatDate(g.fecha, 'short')} | ${g.nota || '-'} | ${fmt(g.monto)} | ${g.cuenta} |\n`;
    });
    md += '\n';
  }

  // Proyección mes siguiente
  if (proyeccion) {
    const { nextMonthLabel, totalIngresosEstimado, totalCuotasSiguiente, gastosRecurrentesEstimados, margenDisponible, cuotas } = proyeccion;
    const margenPct = totalIngresosEstimado > 0 ? Math.round((margenDisponible / totalIngresosEstimado) * 100) : 0;
    md += `## 🚀 Proyección para ${nextMonthLabel}\n\n`;
    md += `> Cuánto podés ahorrar o invertir en ${nextMonthLabel}, asumiendo que tus gastos se repiten igual que en ${monthLabel}.\n\n`;
    md += `| Concepto | Monto |\n|---|---|\n`;
    md += `| + Ingresos recurrentes *(se excluyen regalos, reintegros y otros ingresos puntuales)* | ${fmt(totalIngresosEstimado)} |\n`;
    md += `| − Cuotas de tarjeta comprometidas *(${cuotas?.length ?? 0} cuotas)* | ${fmt(totalCuotasSiguiente)} |\n`;
    md += `| − Gastos corrientes estimados *(base: gastos sin cuotas de ${monthLabel})* | ${fmt(gastosRecurrentesEstimados)} |\n`;
    md += `| **= Lo que podés ahorrar / invertir** | **${fmt(margenDisponible)} (${margenPct}% del ingreso)** |\n\n`;
    if (cuotas && cuotas.length > 0) {
      md += `### Cuotas comprometidas para ${nextMonthLabel}\n\n`;
      md += `| Descripción | Cuota | Monto |\n|---|---|---|\n`;
      cuotas.forEach(c => {
        md += `| ${c.nota || 'Sin descripción'} | ${c.cuota} | ${fmt(c.monto)} |\n`;
      });
      md += `| **Total cuotas** | | **${fmt(totalCuotasSiguiente)}** |\n\n`;
    }
  }

  // Estadísticas rápidas
  md += `## Estadísticas\n\n`;
  md += `- Gasto promedio diario: ${fmt(gastoDiario)}\n`;
  if (diaMasCaro) {
    md += `- Día más caro: ${formatDate(diaMasCaro.fecha, 'short')} (${fmt(diaMasCaro.total)})\n`;
  }
  md += `- Días sin gastos: ${diasSinGastos} de ${diasDelMes}\n\n`;

  // Transferencias del mes
  if (transferencias && transferencias.length > 0) {
    md += `## Transferencias del Mes\n\n`;
    md += `| Fecha | Desde | Hacia | Monto |\n|---|---|---|---|\n`;
    transferencias.forEach(t => {
      md += `| ${formatDate(t.fecha, 'short')} | ${t.cuentaSaliente} | ${t.cuentaEntrante} | ${fmt(t.montoSaliente)} |\n`;
    });
    md += '\n';
  }

  // Movimientos completos
  if (movimientos && movimientos.length > 0) {
    md += `## Movimientos del Mes\n\n`;
    md += `| Fecha | Tipo | Monto | Categoría | Cuenta | Nota |\n|---|---|---|---|---|---|\n`;
    movimientos.forEach(m => {
      const tipo = m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto';
      md += `| ${formatDate(m.fecha, 'short')} | ${tipo} | ${fmt(m.monto)} | ${m.categoria || '-'} | ${m.cuenta} | ${m.nota || '-'} |\n`;
    });
    md += '\n';
  }

  md += `---\n*Generado desde Cashé el ${today}*\n`;
  md += `*Para ver gráficos, usar "Exportar PDF" en la aplicación*\n`;

  return md;
}

export function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
