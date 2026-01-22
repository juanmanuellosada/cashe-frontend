// ============================================
// APPS SCRIPT COMPLETO - FINANZAS PERSONALES
// ============================================
// Versión 3.0 - Con soporte para CUOTAS automáticas
// ============================================


// ============================================
// PARTE 1: FUNCIONES DE UTILIDAD
// ============================================

/**
 * Obtiene cotizaciones de la API dolarapi.com
 * @customfunction
 */
function DOLARAPI(casa, tipo) {
  try {
    var url = "https://dolarapi.com/v1/dolares";
    var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
    var dataArray = JSON.parse(response.getContentText());
    
    for (var i = 0; i < dataArray.length; i++) {
      if (dataArray[i].casa === casa.toLowerCase()) {
        if (tipo.toLowerCase() === "compra") {
          return dataArray[i].compra;
        } else if (tipo.toLowerCase() === "venta") {
          return dataArray[i].venta;
        } else {
          return "Error: Usar 'compra' o 'venta'.";
        }
      }
    }
    return "Error: Casa '" + casa + "' no encontrada.";
  } catch (e) {
    return "Error al cargar API";
  }
}

/**
 * Actualiza el dólar oficial en la celda Monedas!D3
 */
function actualizarDolarOficial() {
  try {
    var url = "https://dolarapi.com/v1/dolares/oficial";
    var response = UrlFetchApp.fetch(url, {'muteHttpExceptions': true});
    var data = JSON.parse(response.getContentText());
    var valorCompra = data.compra;
    
    if (valorCompra) {
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = spreadsheet.getSheetByName("Monedas"); 
      if (sheet) {
        sheet.getRange("D3").setValue(valorCompra);
      }
    }
  } catch (e) {
    Logger.log("Error al actualizar el dólar: " + e);
  }
}

/**
 * Parsea fecha dd/mm/yyyy a Date
 */
function parseFechaDDMMYYYY(str) {
  if (!str) return new Date();
  var parts = str.split("/");
  if (parts.length !== 3) return new Date(str);
  var dia  = parseInt(parts[0], 10);
  var mes  = parseInt(parts[1], 10);
  var anio = parseInt(parts[2], 10);
  return new Date(anio, mes - 1, dia);
}

/**
 * Parsea fecha ISO (yyyy-mm-dd) a Date
 */
function parseFechaISO(str) {
  if (!str) return new Date();
  var parts = str.split('-');
  if (parts.length !== 3) return new Date(str);
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

/**
 * Aplica formato de fecha dd-MM-yyyy a una celda
 */
function setFormatoFecha(sheet, row, col) {
  sheet.getRange(row, col).setNumberFormat("dd-MM-yyyy");
}

/**
 * Genera un ID único para compras en cuotas
 */
function generarIdCompra() {
  var timestamp = new Date().getTime();
  var random = Math.floor(Math.random() * 1000);
  return 'C' + timestamp + random;
}

/**
 * Calcula la fecha de la primera cuota según el día de cierre de la tarjeta
 * @param {Date} fechaCompra - Fecha de la compra
 * @param {number} diaCierre - Día de cierre de la tarjeta (1-31)
 * @return {Date} - Fecha de la primera cuota
 */
function calcularFechaPrimeraCuota(fechaCompra, diaCierre) {
  var fecha = new Date(fechaCompra);
  var diaCompra = fecha.getDate();
  
  // Si la compra es antes del cierre, la primera cuota es el mes siguiente
  // Si la compra es después del cierre, la primera cuota es en 2 meses
  if (diaCompra <= diaCierre) {
    // Primera cuota el mes siguiente
    fecha.setMonth(fecha.getMonth() + 1);
  } else {
    // Primera cuota en 2 meses
    fecha.setMonth(fecha.getMonth() + 2);
  }
  
  // Setear el día de cierre como día de la cuota
  fecha.setDate(diaCierre);
  
  return fecha;
}

/**
 * Agrega N meses a una fecha
 */
function agregarMeses(fecha, meses) {
  var nuevaFecha = new Date(fecha);
  nuevaFecha.setMonth(nuevaFecha.getMonth() + meses);
  return nuevaFecha;
}


// ============================================
// PARTE 2: TRIGGER PARA GOOGLE FORMS
// ============================================

/**
 * Trigger "Al enviar formulario" (para Google Forms)
 */
function distribuirRespuesta(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    var r = e.namedValues;
    var tipo = r["Tipo de Movimiento"][0];

    switch (tipo) {
      case "Ingreso": {
        if (!r["Monto Ingreso"] || !r["Cuenta Ingreso"] || !r["Categoría Ingreso"]) {
          throw new Error("Intento de INGRESO fallido. Faltan datos.");
        }
        var hoja = ss.getSheetByName("Ingresos");
        var fecha = parseFechaDDMMYYYY(r["Fecha Ingreso"][0]);
        var monto = parseFloat(r["Monto Ingreso"][0].replace(",", "."));
        var cuenta = r["Cuenta Ingreso"][0];
        var categoria = r["Categoría Ingreso"][0];
        var nota = r["Nota Ingreso"] ? r["Nota Ingreso"][0] : "";
        var fila = hoja.getLastRow() + 1;
        hoja.getRange(fila, 1, 1, 4).setValues([[fecha, monto, cuenta, categoria]]);
        hoja.getRange(fila, 7).setValue(nota);
        setFormatoFecha(hoja, fila, 1);
        break;
      }

      case "Gasto": {
        if (!r["Monto Gasto"] || !r["Cuenta Gasto"] || !r["Categoría Gasto"]) {
          throw new Error("Intento de GASTO fallido. Faltan datos.");
        }
        var hoja = ss.getSheetByName("Gastos");
        var fecha = parseFechaDDMMYYYY(r["Fecha Gasto"][0]);
        var monto = parseFloat(r["Monto Gasto"][0].replace(",", "."));
        var cuenta = r["Cuenta Gasto"][0];
        var categoria = r["Categoría Gasto"][0];
        var nota = r["Nota Gasto"] ? r["Nota Gasto"][0] : "";
        var fila = hoja.getLastRow() + 1;
        hoja.getRange(fila, 1, 1, 4).setValues([[fecha, monto, cuenta, categoria]]);
        hoja.getRange(fila, 7).setValue(nota);
        setFormatoFecha(hoja, fila, 1);
        break;
      }

      case "Transferencia": {
        if (!r["Monto Saliente"] || !r["Cuenta Saliente"] || !r["Monto Entrante"] || !r["Cuenta Entrante"]) {
          throw new Error("Intento de TRANSFERENCIA fallido. Faltan datos.");
        }
        var hoja = ss.getSheetByName("Transferencias");
        var fecha = parseFechaDDMMYYYY(r["Fecha Transf"][0]);
        var montoSal = parseFloat(r["Monto Saliente"][0].replace(",", "."));
        var cuentaSal = r["Cuenta Saliente"][0];
        var montoEnt = parseFloat(r["Monto Entrante"][0].replace(",", "."));
        var cuentaEnt = r["Cuenta Entrante"][0];
        var nota = r["Nota Transf"] ? r["Nota Transf"][0] : "";
        hoja.appendRow([fecha, cuentaSal, cuentaEnt, montoSal, montoEnt, nota]);
        var fila = hoja.getLastRow();
        setFormatoFecha(hoja, fila, 1);
        break;
      }
    }
    
  } catch (err) {
    Logger.log("Error: " + err.message);
    MailApp.sendEmail(
      ss.getOwner().getEmail(),
      "Error en el Script de Finanzas",
      "Falló al procesar una respuesta de formulario.\n\n" +
      "Error: " + err.message + "\n\n" +
      "Datos recibidos: " + JSON.stringify(e.namedValues)
    );
  }
}


// ============================================
// PARTE 3: API REST (doGet y doPost)
// ============================================

/**
 * Maneja peticiones GET
 */
function doGet(e) {
  var output;
  
  try {
    var action = e.parameter.action;
    var result;
    
    switch(action) {
      case 'getAccounts':
        result = getAccounts();
        break;
      case 'getCategories':
        result = getCategories();
        break;
      case 'getDashboard':
        result = getDashboard();
        break;
      case 'getRecentMovements':
        var limit = e.parameter.limit || 10;
        result = getRecentMovements(parseInt(limit));
        break;
      case 'getAllMovements':
        result = getAllMovements();
        break;
      case 'getExchangeRate':
        result = getExchangeRate();
        break;
      case 'getInstallmentsByPurchase':
        var idCompra = e.parameter.idCompra;
        result = getInstallmentsByPurchase(idCompra);
        break;
      case 'getPendingInstallments':
        result = getPendingInstallments();
        break;
      default:
        result = { error: 'Acción GET no válida: ' + action };
    }
    
    output = ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
    output = ContentService.createTextOutput(JSON.stringify({ 
      error: err.message,
      stack: err.stack 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return output;
}

/**
 * Maneja peticiones POST
 */
function doPost(e) {
  var output;
  
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result;
    
    switch(action) {
      // CREATE
      case 'addIncome':
        result = addIncome(data);
        break;
      case 'addExpense':
        result = addExpense(data);
        break;
      case 'addExpenseWithInstallments':
        result = addExpenseWithInstallments(data);
        break;
      case 'addTransfer':
        result = addTransfer(data);
        break;
      
      // UPDATE
      case 'updateIncome':
        result = updateIncome(data);
        break;
      case 'updateExpense':
        result = updateExpense(data);
        break;
      case 'updateTransfer':
        result = updateTransfer(data);
        break;
      
      // DELETE
      case 'deleteIncome':
        result = deleteIncome(data);
        break;
      case 'deleteExpense':
        result = deleteExpense(data);
        break;
      case 'deleteTransfer':
        result = deleteTransfer(data);
        break;
      case 'deleteInstallmentsByPurchase':
        result = deleteInstallmentsByPurchase(data);
        break;
      
      default:
        result = { error: 'Acción POST no válida: ' + action };
    }
    
    output = ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(err) {
    output = ContentService.createTextOutput(JSON.stringify({ 
      error: err.message,
      stack: err.stack 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return output;
}


// ============================================
// PARTE 4: FUNCIONES GET (Lectura)
// ============================================

/**
 * Obtiene todas las cuentas (incluyendo info de tarjeta de crédito)
 * 
 * Estructura esperada de la hoja Cuentas:
 * A: Nombre
 * B: Balance inicial
 * C: Moneda
 * D: Número de cuenta
 * E: Tipo de cuenta (si es "Tarjeta de crédito" se considera tarjeta)
 * F: Día de cierre (1-31, solo para tarjetas)
 * G-L: Fórmulas (ingresos, gastos, etc.)
 */
function getAccounts() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Cuentas');
  var data = sheet.getDataRange().getValues();
  var accounts = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      // Detectar si es tarjeta de crédito basado en el Tipo de cuenta (columna E)
      var tipoCuenta = String(data[i][4] || '').toLowerCase().trim();
      var esTarjeta = (tipoCuenta === 'tarjeta de crédito' || tipoCuenta === 'tarjeta de credito');
      
      // Columna F: Día de cierre (solo relevante para tarjetas)
      var diaCierre = null;
      if (esTarjeta && data[i][5]) {
        diaCierre = parseInt(data[i][5]) || null;
      }
      
      accounts.push({
        nombre: data[i][0],
        balanceInicial: data[i][1] || 0,
        moneda: data[i][2],
        numeroCuenta: data[i][3] || '',
        tipo: data[i][4] || '',
        esTarjetaCredito: esTarjeta,
        diaCierre: diaCierre,
        totalIngresos: data[i][6] || 0,
        totalGastos: data[i][7] || 0,
        totalTransfEntrantes: data[i][8] || 0,
        totalTransfSalientes: data[i][9] || 0,
        balanceActual: data[i][10] || 0,
        balancePesos: data[i][11] || '',
        balanceDolares: data[i][12] || ''
      });
    }
  }
  
  return { success: true, accounts: accounts };
}

/**
 * Obtiene todas las categorías
 */
function getCategories() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Categorías');
  var data = sheet.getDataRange().getValues();
  
  var ingresos = [];
  var gastos = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1]) {
      var nombreCategoria = data[i][0];
      var tipoCategoria = data[i][1];
      
      if (tipoCategoria === 'Ingreso') {
        ingresos.push(nombreCategoria);
      } else if (tipoCategoria === 'Gasto') {
        gastos.push(nombreCategoria);
      }
    }
  }
  
  return { 
    success: true, 
    categorias: {
      ingresos: ingresos,
      gastos: gastos
    }
  };
}

/**
 * Obtiene el tipo de cambio
 */
function getExchangeRate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Monedas');
  var tipoCambio = sheet.getRange('D3').getValue();
  
  return {
    success: true,
    tipoCambio: tipoCambio || 1
  };
}

/**
 * Obtiene datos para el dashboard
 */
function getDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var monedas = ss.getSheetByName('Monedas');
  var tipoCambio = monedas.getRange('D3').getValue() || 1;
  
  var cuentas = ss.getSheetByName('Cuentas');
  var dataCuentas = cuentas.getDataRange().getValues();
  
  var totalPesos = 0;
  var totalDolares = 0;
  
  for (var i = 1; i < dataCuentas.length; i++) {
    if (dataCuentas[i][0]) {
      var balance = parseFloat(dataCuentas[i][10]) || 0; // Columna K (índice 10) - Balance actual
      var moneda = dataCuentas[i][2];
      
      if (moneda === 'Peso') {
        totalPesos += balance;
      } else if (moneda === 'Dólar estadounidense') {
        totalDolares += balance;
      }
    }
  }
  
  var hoy = new Date();
  var primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  var ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
  
  var gastosSheet = ss.getSheetByName('Gastos');
  var ingresosSheet = ss.getSheetByName('Ingresos');
  
  var gastosMes = sumarMovimientosMes(gastosSheet, primerDiaMes, ultimoDiaMes);
  var ingresosMes = sumarMovimientosMes(ingresosSheet, primerDiaMes, ultimoDiaMes);
  
  return {
    success: true,
    dashboard: {
      tipoCambio: tipoCambio,
      totalPesos: totalPesos,
      totalDolares: totalDolares,
      totalGeneralPesos: totalPesos + (totalDolares * tipoCambio),
      totalGeneralDolares: totalDolares + (totalPesos / tipoCambio),
      gastosMes: gastosMes,
      ingresosMes: ingresosMes,
      balanceMes: ingresosMes - gastosMes,
      mesActual: hoy.toLocaleString('es-AR', { month: 'long', year: 'numeric' })
    }
  };
}

/**
 * Suma movimientos de un mes (columna E: Monto en pesos)
 */
function sumarMovimientosMes(sheet, desde, hasta) {
  var data = sheet.getDataRange().getValues();
  var total = 0;
  
  for (var i = 1; i < data.length; i++) {
    var fecha = data[i][0];
    if (fecha instanceof Date && fecha >= desde && fecha <= hasta) {
      var montoPesos = parseFloat(data[i][4]) || 0;
      total += montoPesos;
    }
  }
  
  return total;
}

/**
 * Obtiene los últimos N movimientos
 * 
 * Estructura de Gastos:
 * A: Fecha | B: Monto | C: Cuenta | D: Categoría | E: Monto pesos | F: Monto dólares | G: Nota | H: ID Compra | I: Cuota
 */
function getRecentMovements(limit) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var movements = [];
  
  // Gastos
  var gastosSheet = ss.getSheetByName('Gastos');
  var gastosData = gastosSheet.getDataRange().getValues();
  
  for (var i = 1; i < gastosData.length; i++) {
    if (gastosData[i][0]) {
      movements.push({
        id: 'gasto_' + i,
        rowIndex: i + 1,
        tipo: 'gasto',
        fecha: gastosData[i][0],
        monto: gastosData[i][1] || 0,
        cuenta: gastosData[i][2] || '',
        categoria: gastosData[i][3] || '',
        montoPesos: gastosData[i][4] || 0,
        montoDolares: gastosData[i][5] || 0,
        nota: gastosData[i][6] || '',
        idCompra: gastosData[i][7] || null,
        cuota: gastosData[i][8] || null
      });
    }
  }
  
  // Ingresos
  var ingresosSheet = ss.getSheetByName('Ingresos');
  var ingresosData = ingresosSheet.getDataRange().getValues();
  
  for (var i = 1; i < ingresosData.length; i++) {
    if (ingresosData[i][0]) {
      movements.push({
        id: 'ingreso_' + i,
        rowIndex: i + 1,
        tipo: 'ingreso',
        fecha: ingresosData[i][0],
        monto: ingresosData[i][1] || 0,
        cuenta: ingresosData[i][2] || '',
        categoria: ingresosData[i][3] || '',
        montoPesos: ingresosData[i][4] || 0,
        montoDolares: ingresosData[i][5] || 0,
        nota: ingresosData[i][6] || ''
      });
    }
  }
  
  // Transferencias
  var transfSheet = ss.getSheetByName('Transferencias');
  var transfData = transfSheet.getDataRange().getValues();
  
  for (var i = 1; i < transfData.length; i++) {
    if (transfData[i][0]) {
      movements.push({
        id: 'transferencia_' + i,
        rowIndex: i + 1,
        tipo: 'transferencia',
        fecha: transfData[i][0],
        cuentaSaliente: transfData[i][1] || '',
        cuentaEntrante: transfData[i][2] || '',
        montoSaliente: transfData[i][3] || 0,
        montoEntrante: transfData[i][4] || 0,
        nota: transfData[i][5] || ''
      });
    }
  }
  
  // Ordenar por fecha descendente
  movements.sort(function(a, b) {
    var fechaA = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
    var fechaB = b.fecha instanceof Date ? b.fecha : new Date(b.fecha);
    return fechaB - fechaA;
  });
  
  // Limitar
  movements = movements.slice(0, limit || 10);
  
  // Convertir fechas a ISO
  movements = movements.map(function(m) {
    if (m.fecha instanceof Date) {
      m.fecha = m.fecha.toISOString();
    }
    return m;
  });
  
  return { success: true, movements: movements };
}

/**
 * Obtiene TODOS los movimientos
 */
function getAllMovements() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var movements = [];
  
  // Gastos
  var gastosSheet = ss.getSheetByName('Gastos');
  var gastosData = gastosSheet.getDataRange().getValues();
  
  for (var i = 1; i < gastosData.length; i++) {
    if (gastosData[i][0]) {
      movements.push({
        id: 'gasto_' + i,
        rowIndex: i + 1,
        tipo: 'gasto',
        fecha: gastosData[i][0] instanceof Date ? gastosData[i][0].toISOString() : gastosData[i][0],
        monto: gastosData[i][1] || 0,
        cuenta: gastosData[i][2] || '',
        categoria: gastosData[i][3] || '',
        montoPesos: gastosData[i][4] || 0,
        montoDolares: gastosData[i][5] || 0,
        nota: gastosData[i][6] || '',
        idCompra: gastosData[i][7] || null,
        cuota: gastosData[i][8] || null
      });
    }
  }
  
  // Ingresos
  var ingresosSheet = ss.getSheetByName('Ingresos');
  var ingresosData = ingresosSheet.getDataRange().getValues();
  
  for (var i = 1; i < ingresosData.length; i++) {
    if (ingresosData[i][0]) {
      movements.push({
        id: 'ingreso_' + i,
        rowIndex: i + 1,
        tipo: 'ingreso',
        fecha: ingresosData[i][0] instanceof Date ? ingresosData[i][0].toISOString() : ingresosData[i][0],
        monto: ingresosData[i][1] || 0,
        cuenta: ingresosData[i][2] || '',
        categoria: ingresosData[i][3] || '',
        montoPesos: ingresosData[i][4] || 0,
        montoDolares: ingresosData[i][5] || 0,
        nota: ingresosData[i][6] || ''
      });
    }
  }
  
  // Transferencias
  var transfSheet = ss.getSheetByName('Transferencias');
  var transfData = transfSheet.getDataRange().getValues();
  
  for (var i = 1; i < transfData.length; i++) {
    if (transfData[i][0]) {
      movements.push({
        id: 'transferencia_' + i,
        rowIndex: i + 1,
        tipo: 'transferencia',
        fecha: transfData[i][0] instanceof Date ? transfData[i][0].toISOString() : transfData[i][0],
        cuentaSaliente: transfData[i][1] || '',
        cuentaEntrante: transfData[i][2] || '',
        montoSaliente: transfData[i][3] || 0,
        montoEntrante: transfData[i][4] || 0,
        nota: transfData[i][5] || ''
      });
    }
  }
  
  // Ordenar por fecha descendente
  movements.sort(function(a, b) {
    return new Date(b.fecha) - new Date(a.fecha);
  });
  
  return { success: true, movements: movements };
}

/**
 * Obtiene todas las cuotas de una compra específica
 */
function getInstallmentsByPurchase(idCompra) {
  if (!idCompra) {
    return { success: false, error: 'ID de compra requerido' };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var gastosSheet = ss.getSheetByName('Gastos');
  var gastosData = gastosSheet.getDataRange().getValues();
  
  var cuotas = [];
  
  for (var i = 1; i < gastosData.length; i++) {
    if (gastosData[i][7] === idCompra) { // Columna H: ID Compra
      cuotas.push({
        id: 'gasto_' + i,
        rowIndex: i + 1,
        fecha: gastosData[i][0] instanceof Date ? gastosData[i][0].toISOString() : gastosData[i][0],
        monto: gastosData[i][1] || 0,
        cuenta: gastosData[i][2] || '',
        categoria: gastosData[i][3] || '',
        nota: gastosData[i][6] || '',
        cuota: gastosData[i][8] || ''
      });
    }
  }
  
  // Ordenar por número de cuota
  cuotas.sort(function(a, b) {
    var numA = parseInt(a.cuota.split('/')[0]) || 0;
    var numB = parseInt(b.cuota.split('/')[0]) || 0;
    return numA - numB;
  });
  
  return { success: true, idCompra: idCompra, cuotas: cuotas, totalCuotas: cuotas.length };
}

/**
 * Obtiene todas las cuotas pendientes (futuras) agrupadas por compra
 */
function getPendingInstallments() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var gastosSheet = ss.getSheetByName('Gastos');
  var gastosData = gastosSheet.getDataRange().getValues();
  
  var hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  var compras = {};
  
  for (var i = 1; i < gastosData.length; i++) {
    var idCompra = gastosData[i][7]; // Columna H
    var cuota = gastosData[i][8];    // Columna I
    
    if (idCompra && cuota) {
      var fecha = gastosData[i][0];
      
      if (!compras[idCompra]) {
        compras[idCompra] = {
          idCompra: idCompra,
          descripcion: gastosData[i][6] || '',
          categoria: gastosData[i][3] || '',
          cuenta: gastosData[i][2] || '',
          montoCuota: gastosData[i][1] || 0,
          totalCuotas: 0,
          cuotasPagadas: 0,
          cuotasPendientes: 0,
          proximaCuota: null
        };
      }
      
      compras[idCompra].totalCuotas++;
      
      if (fecha instanceof Date && fecha < hoy) {
        compras[idCompra].cuotasPagadas++;
      } else {
        compras[idCompra].cuotasPendientes++;
        if (!compras[idCompra].proximaCuota || fecha < compras[idCompra].proximaCuota) {
          compras[idCompra].proximaCuota = fecha;
        }
      }
    }
  }
  
  // Convertir a array y filtrar solo las que tienen cuotas pendientes
  var resultado = [];
  for (var id in compras) {
    if (compras[id].cuotasPendientes > 0) {
      if (compras[id].proximaCuota instanceof Date) {
        compras[id].proximaCuota = compras[id].proximaCuota.toISOString();
      }
      resultado.push(compras[id]);
    }
  }
  
  return { success: true, comprasPendientes: resultado };
}


// ============================================
// PARTE 5: FUNCIONES CREATE (Crear)
// ============================================

/**
 * Agrega un nuevo ingreso
 */
function addIncome(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Ingresos');
  
  var fecha = parseFechaISO(data.fecha);
  var monto = parseFloat(data.monto);
  var cuenta = data.cuenta;
  var categoria = data.categoria;
  var nota = data.nota || '';
  
  if (!fecha || isNaN(monto) || !cuenta || !categoria) {
    return { success: false, error: 'Datos incompletos para ingreso' };
  }
  
  var fila = sheet.getLastRow() + 1;
  sheet.getRange(fila, 1, 1, 4).setValues([[fecha, monto, cuenta, categoria]]);
  sheet.getRange(fila, 7).setValue(nota);
  sheet.getRange(fila, 1).setNumberFormat("dd-MM-yyyy");
  
  return { success: true, message: 'Ingreso registrado', fila: fila, id: 'ingreso_' + (fila - 1) };
}

/**
 * Agrega un nuevo gasto (sin cuotas)
 */
function addExpense(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Gastos');
  
  var fecha = parseFechaISO(data.fecha);
  var monto = parseFloat(data.monto);
  var cuenta = data.cuenta;
  var categoria = data.categoria;
  var nota = data.nota || '';
  
  if (!fecha || isNaN(monto) || !cuenta || !categoria) {
    return { success: false, error: 'Datos incompletos para gasto' };
  }
  
  var fila = sheet.getLastRow() + 1;
  sheet.getRange(fila, 1, 1, 4).setValues([[fecha, monto, cuenta, categoria]]);
  sheet.getRange(fila, 7).setValue(nota);
  sheet.getRange(fila, 1).setNumberFormat("dd-MM-yyyy");
  
  return { success: true, message: 'Gasto registrado', fila: fila, id: 'gasto_' + (fila - 1) };
}

/**
 * Agrega un gasto con cuotas automáticas
 * 
 * Parámetros esperados:
 * - fechaCompra: fecha de la compra (yyyy-mm-dd)
 * - montoTotal: monto total de la compra
 * - cuenta: nombre de la cuenta (tarjeta de crédito)
 * - categoria: categoría del gasto
 * - nota: descripción de la compra
 * - cantidadCuotas: número de cuotas (1, 3, 6, 12, etc.)
 * - fechaPrimeraCuota: (opcional) fecha de la primera cuota, si no se envía se calcula automáticamente
 */
function addExpenseWithInstallments(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Gastos');
  var cuentasSheet = ss.getSheetByName('Cuentas');
  
  // Validar datos
  var fechaCompra = parseFechaISO(data.fechaCompra || data.fecha);
  var montoTotal = parseFloat(data.montoTotal || data.monto);
  var cuenta = data.cuenta;
  var categoria = data.categoria;
  var nota = data.nota || '';
  var cantidadCuotas = parseInt(data.cantidadCuotas || data.cuotas) || 1;
  
  if (!fechaCompra || isNaN(montoTotal) || !cuenta || !categoria) {
    return { success: false, error: 'Datos incompletos para gasto en cuotas' };
  }
  
  if (cantidadCuotas < 1 || cantidadCuotas > 48) {
    return { success: false, error: 'Cantidad de cuotas inválida (1-48)' };
  }
  
  // Si es 1 cuota, es un gasto normal
  if (cantidadCuotas === 1) {
    return addExpense({
      fecha: data.fechaCompra || data.fecha,
      monto: montoTotal,
      cuenta: cuenta,
      categoria: categoria,
      nota: nota
    });
  }
  
  // Buscar info de la tarjeta de crédito
  var diaCierre = null;
  var cuentasData = cuentasSheet.getDataRange().getValues();
  
  for (var i = 1; i < cuentasData.length; i++) {
    if (cuentasData[i][0] === cuenta) {
      // Detectar si es tarjeta basado en el Tipo de cuenta (columna E)
      var tipoCuenta = String(cuentasData[i][4] || '').toLowerCase().trim();
      var esTarjeta = (tipoCuenta === 'tarjeta de crédito' || tipoCuenta === 'tarjeta de credito');
      
      if (esTarjeta && cuentasData[i][5]) {
        diaCierre = parseInt(cuentasData[i][5]);
      }
      break;
    }
  }
  
  // Calcular fecha de primera cuota
  var fechaPrimeraCuota;
  if (data.fechaPrimeraCuota) {
    fechaPrimeraCuota = parseFechaISO(data.fechaPrimeraCuota);
  } else if (diaCierre) {
    fechaPrimeraCuota = calcularFechaPrimeraCuota(fechaCompra, diaCierre);
  } else {
    // Si no hay día de cierre, asumir que la primera cuota es el mes siguiente
    fechaPrimeraCuota = new Date(fechaCompra);
    fechaPrimeraCuota.setMonth(fechaPrimeraCuota.getMonth() + 1);
  }
  
  // Calcular monto por cuota
  var montoCuota = Math.round((montoTotal / cantidadCuotas) * 100) / 100;
  
  // Generar ID único para esta compra
  var idCompra = generarIdCompra();
  
  // Crear todas las cuotas
  var filas = [];
  var primeraFila = sheet.getLastRow() + 1;
  
  for (var c = 0; c < cantidadCuotas; c++) {
    var fechaCuota = agregarMeses(fechaPrimeraCuota, c);
    var numeroCuota = (c + 1) + '/' + cantidadCuotas;
    var notaCuota = nota + (nota ? ' - ' : '') + 'Cuota ' + numeroCuota;
    
    // Ajustar última cuota para que el total sea exacto
    var montoEstaCuota = montoCuota;
    if (c === cantidadCuotas - 1) {
      var montoAcumulado = montoCuota * (cantidadCuotas - 1);
      montoEstaCuota = Math.round((montoTotal - montoAcumulado) * 100) / 100;
    }
    
    filas.push([fechaCuota, montoEstaCuota, cuenta, categoria, '', '', notaCuota, idCompra, numeroCuota]);
  }
  
  // Insertar todas las filas de una vez (más eficiente)
  if (filas.length > 0) {
    sheet.getRange(primeraFila, 1, filas.length, 9).setValues(filas);
    
    // Formatear fechas
    for (var f = 0; f < filas.length; f++) {
      setFormatoFecha(sheet, primeraFila + f, 1);
    }
  }
  
  return { 
    success: true, 
    message: 'Compra en ' + cantidadCuotas + ' cuotas registrada',
    idCompra: idCompra,
    montoCuota: montoCuota,
    fechaPrimeraCuota: fechaPrimeraCuota.toISOString(),
    filasCreadas: filas.length
  };
}

/**
 * Agrega una nueva transferencia
 */
function addTransfer(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Transferencias');
  
  var fecha = parseFechaISO(data.fecha);
  var cuentaSaliente = data.cuentaSaliente;
  var cuentaEntrante = data.cuentaEntrante;
  var montoSaliente = parseFloat(data.montoSaliente);
  var montoEntrante = parseFloat(data.montoEntrante);
  var nota = data.nota || '';
  
  if (!fecha || !cuentaSaliente || !cuentaEntrante || isNaN(montoSaliente) || isNaN(montoEntrante)) {
    return { success: false, error: 'Datos incompletos para transferencia' };
  }
  
  sheet.appendRow([fecha, cuentaSaliente, cuentaEntrante, montoSaliente, montoEntrante, nota]);
  
  var fila = sheet.getLastRow();
  sheet.getRange(fila, 1).setNumberFormat("dd-MM-yyyy");
  
  return { success: true, message: 'Transferencia registrada', fila: fila, id: 'transferencia_' + (fila - 1) };
}


// ============================================
// PARTE 6: FUNCIONES UPDATE (Actualizar)
// ============================================

/**
 * Actualiza un ingreso existente
 */
function updateIncome(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Ingresos');
  
  var rowIndex = data.rowIndex;
  if (!rowIndex || rowIndex < 2) {
    return { success: false, error: 'Índice de fila inválido' };
  }
  
  var fecha = parseFechaISO(data.fecha);
  var monto = parseFloat(data.monto);
  var cuenta = data.cuenta;
  var categoria = data.categoria;
  var nota = data.nota || '';
  
  if (!fecha || isNaN(monto) || !cuenta || !categoria) {
    return { success: false, error: 'Datos incompletos para actualizar ingreso' };
  }
  
  sheet.getRange(rowIndex, 1, 1, 4).setValues([[fecha, monto, cuenta, categoria]]);
  sheet.getRange(rowIndex, 7).setValue(nota);
  sheet.getRange(rowIndex, 1).setNumberFormat("dd-MM-yyyy");
  
  return { success: true, message: 'Ingreso actualizado', rowIndex: rowIndex };
}

/**
 * Actualiza un gasto existente
 */
function updateExpense(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Gastos');
  
  var rowIndex = data.rowIndex;
  if (!rowIndex || rowIndex < 2) {
    return { success: false, error: 'Índice de fila inválido' };
  }
  
  var fecha = parseFechaISO(data.fecha);
  var monto = parseFloat(data.monto);
  var cuenta = data.cuenta;
  var categoria = data.categoria;
  var nota = data.nota || '';
  
  if (!fecha || isNaN(monto) || !cuenta || !categoria) {
    return { success: false, error: 'Datos incompletos para actualizar gasto' };
  }
  
  sheet.getRange(rowIndex, 1, 1, 4).setValues([[fecha, monto, cuenta, categoria]]);
  sheet.getRange(rowIndex, 7).setValue(nota);
  sheet.getRange(rowIndex, 1).setNumberFormat("dd-MM-yyyy");
  
  return { success: true, message: 'Gasto actualizado', rowIndex: rowIndex };
}

/**
 * Actualiza una transferencia existente
 */
function updateTransfer(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Transferencias');
  
  var rowIndex = data.rowIndex;
  if (!rowIndex || rowIndex < 2) {
    return { success: false, error: 'Índice de fila inválido' };
  }
  
  var fecha = parseFechaISO(data.fecha);
  var cuentaSaliente = data.cuentaSaliente;
  var cuentaEntrante = data.cuentaEntrante;
  var montoSaliente = parseFloat(data.montoSaliente);
  var montoEntrante = parseFloat(data.montoEntrante);
  var nota = data.nota || '';
  
  if (!fecha || !cuentaSaliente || !cuentaEntrante || isNaN(montoSaliente) || isNaN(montoEntrante)) {
    return { success: false, error: 'Datos incompletos para actualizar transferencia' };
  }
  
  sheet.getRange(rowIndex, 1, 1, 6).setValues([[fecha, cuentaSaliente, cuentaEntrante, montoSaliente, montoEntrante, nota]]);
  sheet.getRange(rowIndex, 1).setNumberFormat("dd-MM-yyyy");
  
  return { success: true, message: 'Transferencia actualizada', rowIndex: rowIndex };
}


// ============================================
// PARTE 7: FUNCIONES DELETE (Eliminar)
// ============================================

/**
 * Elimina un ingreso
 */
function deleteIncome(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Ingresos');
  
  var rowIndex = data.rowIndex;
  if (!rowIndex || rowIndex < 2) {
    return { success: false, error: 'Índice de fila inválido' };
  }
  
  var fechaActual = sheet.getRange(rowIndex, 1).getValue();
  if (!fechaActual) {
    return { success: false, error: 'La fila no existe o está vacía' };
  }
  
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: 'Ingreso eliminado', rowIndex: rowIndex };
}

/**
 * Elimina un gasto
 */
function deleteExpense(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Gastos');
  
  var rowIndex = data.rowIndex;
  if (!rowIndex || rowIndex < 2) {
    return { success: false, error: 'Índice de fila inválido' };
  }
  
  var fechaActual = sheet.getRange(rowIndex, 1).getValue();
  if (!fechaActual) {
    return { success: false, error: 'La fila no existe o está vacía' };
  }
  
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: 'Gasto eliminado', rowIndex: rowIndex };
}

/**
 * Elimina una transferencia
 */
function deleteTransfer(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Transferencias');
  
  var rowIndex = data.rowIndex;
  if (!rowIndex || rowIndex < 2) {
    return { success: false, error: 'Índice de fila inválido' };
  }
  
  var fechaActual = sheet.getRange(rowIndex, 1).getValue();
  if (!fechaActual) {
    return { success: false, error: 'La fila no existe o está vacía' };
  }
  
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: 'Transferencia eliminada', rowIndex: rowIndex };
}

/**
 * Elimina todas las cuotas de una compra
 */
function deleteInstallmentsByPurchase(data) {
  var idCompra = data.idCompra;
  if (!idCompra) {
    return { success: false, error: 'ID de compra requerido' };
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Gastos');
  var gastosData = sheet.getDataRange().getValues();
  
  // Encontrar todas las filas con este ID (de abajo hacia arriba para no romper índices)
  var filasAEliminar = [];
  for (var i = gastosData.length - 1; i >= 1; i--) {
    if (gastosData[i][7] === idCompra) { // Columna H: ID Compra
      filasAEliminar.push(i + 1); // +1 porque getDataRange es 0-indexed
    }
  }
  
  if (filasAEliminar.length === 0) {
    return { success: false, error: 'No se encontraron cuotas con ese ID' };
  }
  
  // Eliminar de abajo hacia arriba
  for (var j = 0; j < filasAEliminar.length; j++) {
    sheet.deleteRow(filasAEliminar[j]);
  }
  
  return { 
    success: true, 
    message: 'Se eliminaron ' + filasAEliminar.length + ' cuotas',
    cuotasEliminadas: filasAEliminar.length 
  };
}


// ============================================
// PARTE 8: FUNCIONES DE TEST
// ============================================

/**
 * Función para probar el API
 */
function testAPI() {
  Logger.log('=== TEST: getAccounts ===');
  Logger.log(JSON.stringify(getAccounts(), null, 2));
  
  Logger.log('=== TEST: getCategories ===');
  Logger.log(JSON.stringify(getCategories(), null, 2));
  
  Logger.log('=== TEST: getDashboard ===');
  Logger.log(JSON.stringify(getDashboard(), null, 2));
  
  Logger.log('=== TEST: getRecentMovements ===');
  Logger.log(JSON.stringify(getRecentMovements(5), null, 2));
}

/**
 * Test para crear un gasto en cuotas (NO EJECUTAR EN PRODUCCIÓN)
 */
function testCuotas() {
  var resultado = addExpenseWithInstallments({
    fechaCompra: '2026-01-20',
    montoTotal: 120000,
    cuenta: '💳 VISA Galicia',  // Cambia por el nombre exacto de tu tarjeta
    categoria: '💻 Tecnología',
    nota: 'Notebook TEST',
    cantidadCuotas: 12
  });
  
  Logger.log('Resultado: ' + JSON.stringify(resultado, null, 2));
  
  if (resultado.success) {
    // Ver las cuotas creadas
    var cuotas = getInstallmentsByPurchase(resultado.idCompra);
    Logger.log('Cuotas creadas: ' + JSON.stringify(cuotas, null, 2));
    
    // Eliminar las cuotas de prueba
    var eliminar = deleteInstallmentsByPurchase({ idCompra: resultado.idCompra });
    Logger.log('Cuotas eliminadas: ' + JSON.stringify(eliminar, null, 2));
  }
}
