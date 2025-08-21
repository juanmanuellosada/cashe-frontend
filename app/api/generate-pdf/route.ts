import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import { createCanvas } from 'canvas'

export async function POST(request: NextRequest) {
  let browser = null

  try {
    console.log('Iniciando generación de PDF personalizado...')
    
    // Obtener datos del reporte
    const reportData = await request.json()
    console.log('Datos recibidos:', reportData)

    // Configuración mínima y más estable
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
    })

    const page = await browser.newPage()
    
    // Configuración básica
    await page.setViewport({ width: 1200, height: 800 })
    
    console.log('Generando HTML del reporte...')
    
    // Generar HTML personalizado con los datos
    const htmlContent = generateReportHTML(reportData)
    
    // Cargar el HTML
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' })
    
    console.log('Generando PDF...')
    
    // PDF con configuración profesional
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '20mm', 
        right: '20mm', 
        bottom: '35mm', 
        left: '20mm' 
      },
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      timeout: 30000,
    })

    await browser.close()
    console.log('PDF generado exitosamente')

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte-Financiero-Cashe-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error completo:', error)
    
    if (browser) {
      try {
        await browser.close()
      } catch (e) {
        console.error('Error cerrando browser:', e)
      }
    }

    return NextResponse.json({
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Función para generar gráfico de línea (evolución temporal - ingresos y gastos)
function generateLineChart(data: any, title: string): string {
  try {
    const canvas = createCanvas(600, 300)
    const ctx = canvas.getContext('2d')
    
    // Configuración del canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 600, 300)
    
    // Configuración de colores
    const incomeColor = '#43A047' // Verde para ingresos
    const expenseColor = '#F57C00' // Naranja para gastos
    const gridColor = '#e5e7eb'
    const textColor = '#374151'
    
    // Datos del gráfico
    const labels = data.labels || []
    const incomeData = data.datasets?.[0]?.data || []
    const expenseData = data.datasets?.[1]?.data || []
    
    if (labels.length === 0) {
      ctx.fillStyle = textColor
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Sin datos suficientes para mostrar', 300, 150)
      return canvas.toDataURL()
    }
    
    // Configuración del área del gráfico
    const margin = { top: 40, right: 100, bottom: 60, left: 80 }
    const chartWidth = 600 - margin.left - margin.right
    const chartHeight = 300 - margin.top - margin.bottom
    
    // Encontrar min y max valores
    const allValues = [...incomeData, ...expenseData]
    const maxValue = Math.max(...allValues, 0)
    const minValue = 0 // Empezar desde 0
    const range = maxValue - minValue || 1
    
    // Dibujar título
    ctx.fillStyle = textColor
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, 300, 25)
    
    // Dibujar grid y ejes
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1
    
    // Líneas horizontales del grid
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(margin.left, y)
      ctx.lineTo(margin.left + chartWidth, y)
      ctx.stroke()
      
      // Labels del eje Y
      const value = maxValue - (range / 5) * i
      ctx.fillStyle = textColor
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`$${value.toLocaleString('es-AR')}`, margin.left - 10, y + 4)
    }
    
    // Función para dibujar línea
    const drawLine = (data: number[], color: string, label: string) => {
      if (data.length === 0) return
      
      // Línea
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.beginPath()
      
      data.forEach((value: number, index: number) => {
        const x = margin.left + (chartWidth / (labels.length - 1)) * index
        const y = margin.top + chartHeight - ((value - minValue) / range) * chartHeight
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      
      ctx.stroke()
      
      // Puntos
      ctx.fillStyle = color
      data.forEach((value: number, index: number) => {
        const x = margin.left + (chartWidth / (labels.length - 1)) * index
        const y = margin.top + chartHeight - ((value - minValue) / range) * chartHeight
        
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      })
    }
    
    // Dibujar líneas
    drawLine(incomeData, incomeColor, 'Ingresos')
    drawLine(expenseData, expenseColor, 'Gastos')
    
    // Labels del eje X
    ctx.fillStyle = textColor
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    labels.forEach((label: string, index: number) => {
      const x = margin.left + (chartWidth / (labels.length - 1)) * index
      ctx.fillText(label, x, margin.top + chartHeight + 20)
    })
    
    // Leyenda
    const legendY = margin.top + 20
    ctx.fillStyle = incomeColor
    ctx.fillRect(margin.left + chartWidth + 10, legendY - 5, 15, 15)
    ctx.fillStyle = textColor
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Ingresos', margin.left + chartWidth + 30, legendY + 5)
    
    ctx.fillStyle = expenseColor
    ctx.fillRect(margin.left + chartWidth + 10, legendY + 20, 15, 15)
    ctx.fillStyle = textColor
    ctx.fillText('Gastos', margin.left + chartWidth + 30, legendY + 30)
    
    return canvas.toDataURL()
  } catch (error) {
    console.error('Error generando gráfico de línea:', error)
    return generateEmptyChart('Error generando gráfico')
  }
}

// Función para generar gráfico circular (pie chart)
function generatePieChart(data: Record<string, number>, title: string, colors: string[]): string {
  try {
    const canvas = createCanvas(600, 400)
    const ctx = canvas.getContext('2d')
    
    // Configuración del canvas
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 600, 400)
    
    const textColor = '#374151'
    
    // Convertir datos a arrays
    const categories = Object.keys(data)
    const values = Object.values(data)
    const total = values.reduce((sum, val) => sum + val, 0)
    
    if (categories.length === 0 || total === 0) {
      ctx.fillStyle = textColor
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Sin datos para mostrar', 300, 200)
      return canvas.toDataURL()
    }
    
    // Configuración del gráfico
    const centerX = 200
    const centerY = 220
    const radius = 120
    
    // Dibujar título
    ctx.fillStyle = textColor
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, 300, 25)
    
    // Dibujar gráfico circular
    let currentAngle = -Math.PI / 2 // Empezar desde arriba
    
    values.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI
      
      // Dibujar slice
      ctx.fillStyle = colors[index % colors.length]
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.closePath()
      ctx.fill()
      
      // Borde del slice
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
      
      currentAngle += sliceAngle
    })
    
    // Leyenda
    const legendX = 400
    let legendY = 80
    
    categories.forEach((category, index) => {
      const value = values[index]
      const percentage = ((value / total) * 100).toFixed(1)
      
      // Color de la leyenda
      ctx.fillStyle = colors[index % colors.length]
      ctx.fillRect(legendX, legendY - 10, 15, 15)
      
      // Texto de la leyenda
      ctx.fillStyle = textColor
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`${category}`, legendX + 20, legendY)
      ctx.fillText(`$${value.toLocaleString('es-AR')} (${percentage}%)`, legendX + 20, legendY + 15)
      
      legendY += 40
    })
    
    return canvas.toDataURL()
  } catch (error) {
    console.error('Error generando gráfico circular:', error)
    return generateEmptyChart('Error generando gráfico')
  }
}

// Función para generar gráfico vacío en caso de error
function generateEmptyChart(message: string): string {
  const canvas = createCanvas(600, 300)
  const ctx = canvas.getContext('2d')
  
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 600, 300)
  
  ctx.fillStyle = '#6b7280'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(message, 300, 150)
  
  return canvas.toDataURL()
}

function generateReportHTML(reportData: any) {
  const { period, accountsDisplay, categoriesDisplay, metrics, chartData } = reportData
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte Financiero</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          line-height: 1.6;
          color: #1a1a1a;
          background: #ffffff;
          margin: 0;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #f57c00;
          padding-bottom: 20px;
        }
        
        .header h1 {
          color: #1a1a1a;
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 10px 0;
        }
        
        .header .date {
          color: #6c757d;
          font-size: 14px;
          margin: 10px 0;
        }
        
        .section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        
        .section-title {
          color: #1a1a1a;
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 15px 0;
          border-left: 4px solid #f57c00;
          padding-left: 15px;
        }
        
        .filters-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .filter-item {
          background: #f8f9fa;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
        }
        
        .filter-label {
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 5px;
        }
        
        .filter-value {
          color: #6c757d;
          font-size: 14px;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }
        
        .metric-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .metric-title {
          font-size: 14px;
          color: #6c757d;
          margin-bottom: 10px;
        }
        
        .metric-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        
        .metric-value.positive {
          color: #16a34a;
        }
        
        .metric-value.negative {
          color: #dc2626;
        }
        
        .metric-value.neutral {
          color: #1a1a1a;
        }
        
        .metric-subtitle {
          font-size: 12px;
          color: #6c757d;
        }
        
        .chart-section {
          margin-bottom: 50px;
          page-break-inside: avoid;
        }
        
        .chart-placeholder {
          background: #f8f9fa;
          border: 2px dashed #e5e7eb;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          color: #6c757d;
          margin: 20px 0;
        }
        
        .categories-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 30px;
        }
        
        .category-list {
          background: #f8f9fa;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }
        
        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .category-item:last-child {
          border-bottom: none;
        }
        
        .category-name {
          font-weight: 500;
        }
        
        .category-amount {
          font-weight: 600;
        }
        
        .footer {
          margin-top: 60px;
          margin-bottom: 60px;
          padding-top: 30px;
          padding-bottom: 40px;
          border-top: 2px solid #e5e7eb;
          text-align: center;
          color: #6c757d;
          font-size: 12px;
        }
        
        @media print {
          body { margin: 0; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Reporte Financiero Detallado</h1>
        <div class="date">
          Generado el: ${new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Filtros Aplicados</h2>
        <div class="filters-grid">
          <div class="filter-item">
            <div class="filter-label">Período</div>
            <div class="filter-value">${period.display}</div>
          </div>
          <div class="filter-item">
            <div class="filter-label">Cuentas</div>
            <div class="filter-value">${accountsDisplay}</div>
          </div>
          <div class="filter-item">
            <div class="filter-label">Categorías</div>
            <div class="filter-value">${categoriesDisplay}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Resumen Financiero</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-title">Ingresos Totales</div>
            <div class="metric-value positive">$${metrics.totalIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
            <div class="metric-subtitle">Total de ingresos del período</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Gastos Totales</div>
            <div class="metric-value negative">$${metrics.totalExpenses.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
            <div class="metric-subtitle">Total de gastos del período</div>
          </div>
          <div class="metric-card">
            <div class="metric-title">Balance Neto</div>
            <div class="metric-value ${metrics.netIncome >= 0 ? 'positive' : 'negative'}">$${metrics.netIncome.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
            <div class="metric-subtitle">Diferencia ingresos - gastos</div>
          </div>
        </div>
      </div>

      <div class="chart-section">
        <h2 class="section-title">Evolución Temporal</h2>
        <div class="chart-placeholder">
          <img src="${generateLineChart(chartData.timeline, 'Evolución de Ingresos y Gastos')}" alt="Gráfico de evolución" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto;" />
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">Análisis por Categorías</h2>
        
        <div style="margin-bottom: 30px;">
          <h3 class="section-title">Ingresos por Categoría</h3>
          <img src="${generatePieChart(chartData.incomeByCategory || {}, 'Ingresos por Categoría', ['#43A047', '#2E7D32', '#66BB6A', '#388E3C', '#81C784', '#4CAF50'])}" alt="Gráfico de ingresos por categoría" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 10px auto;" />
        </div>
        
        <div>
          <h3 class="section-title">Gastos por Categoría</h3>
          <img src="${generatePieChart(chartData.expensesByCategory || {}, 'Gastos por Categoría', ['#F57C00', '#FF9800', '#E65100', '#FF8F00', '#FFB74D', '#FB8C00'])}" alt="Gráfico de gastos por categoría" style="width: 100%; max-width: 600px; height: auto; display: block; margin: 10px auto;" />
        </div>
      </div>

      <div class="footer">
        <p>Este reporte fue generado automáticamente por el sistema Cashé</p>
        <p>© ${new Date().getFullYear()} - Reporte confidencial</p>
      </div>
    </body>
    </html>
  `
}