// ============================================
// APPS SCRIPT COMPLETO - FINANZAS PERSONALES
// ============================================
// Versión 2.0 - Con funciones CRUD completas
// Incluye: Create, Read, Update, Delete
// ============================================


// ============================================
// PARTE 1: FUNCIONES EXISTENTES (DÓLAR Y FORMS)
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
// PARTE 2: API REST (doGet y doPost)
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
// PARTE 3: FUNCIONES GET (Lectura)
// ============================================

/**
 * Obtiene todas las cuentas
 */
function getAccounts() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Cuentas');
  var data = sheet.getDataRange().getValues();
  var accounts = [];
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      accounts.push({
        nombre: data[i][0],
        balanceInicial: data[i][1] || 0,
        moneda: data[i][2],
        numeroCuenta: data[i][3] || '',
        tipo: data[i][4] || '',
        totalIngresos: data[i][5] || 0,
        totalGastos: data[i][6] || 0,
        totalTransfEntrantes: data[i][7] || 0,
        totalTransfSalientes: data[i][8] || 0,
        balanceActual: data[i][9] || 0,
        balancePesos: data[i][10] || '',
        balanceDolares: data[i][11] || ''
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
      var balance = parseFloat(dataCuentas[i][9]) || 0;
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
        nota: gastosData[i][6] || ''
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
 * Obtiene TODOS los movimientos (para la página de historial)
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
        nota: gastosData[i][6] || ''
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


// ============================================
// PARTE 4: FUNCIONES CREATE (Crear)
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
 * Agrega un nuevo gasto
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
// PARTE 5: FUNCIONES UPDATE (Actualizar)
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
  
  // Actualizar columnas A-D (no tocar E y F que tienen fórmulas)
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
  
  // Actualizar columnas A-D (no tocar E y F que tienen fórmulas)
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
// PARTE 6: FUNCIONES DELETE (Eliminar)
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
  
  // Verificar que la fila existe y tiene datos
  var fechaActual = sheet.getRange(rowIndex, 1).getValue();
  if (!fechaActual) {
    return { success: false, error: 'La fila no existe o está vacía' };
  }
  
  // Eliminar la fila completa
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
  
  // Verificar que la fila existe y tiene datos
  var fechaActual = sheet.getRange(rowIndex, 1).getValue();
  if (!fechaActual) {
    return { success: false, error: 'La fila no existe o está vacía' };
  }
  
  // Eliminar la fila completa
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
  
  // Verificar que la fila existe y tiene datos
  var fechaActual = sheet.getRange(rowIndex, 1).getValue();
  if (!fechaActual) {
    return { success: false, error: 'La fila no existe o está vacía' };
  }
  
  // Eliminar la fila completa
  sheet.deleteRow(rowIndex);
  
  return { success: true, message: 'Transferencia eliminada', rowIndex: rowIndex };
}


// ============================================
// PARTE 7: FUNCIONES DE TEST
// ============================================

/**
 * Función para probar que el API funciona
 */
function testAPI() {
  Logger.log('=== TEST: getAccounts ===');
  Logger.log(JSON.stringify(getAccounts(), null, 2));
  
  Logger.log('=== TEST: getCategories ===');
  Logger.log(JSON.stringify(getCategories(), null, 2));
  
  Logger.log('=== TEST: getExchangeRate ===');
  Logger.log(JSON.stringify(getExchangeRate(), null, 2));
  
  Logger.log('=== TEST: getDashboard ===');
  Logger.log(JSON.stringify(getDashboard(), null, 2));
  
  Logger.log('=== TEST: getRecentMovements ===');
  Logger.log(JSON.stringify(getRecentMovements(5), null, 2));
  
  Logger.log('=== TEST: getAllMovements ===');
  Logger.log(JSON.stringify(getAllMovements(), null, 2));
}

/**
 * Test para verificar update y delete (NO EJECUTAR EN PRODUCCIÓN)
 */
function testCRUD() {
  // Crear un gasto de prueba
  var resultAdd = addExpense({
    fecha: '2026-01-19',
    monto: 999,
    cuenta: 'TEST',
    categoria: 'TEST',
    nota: 'Registro de prueba - BORRAR'
  });
  Logger.log('ADD: ' + JSON.stringify(resultAdd));
  
  if (resultAdd.success) {
    // Actualizar
    var resultUpdate = updateExpense({
      rowIndex: resultAdd.fila,
      fecha: '2026-01-19',
      monto: 1000,
      cuenta: 'TEST UPDATED',
      categoria: 'TEST UPDATED',
      nota: 'Actualizado'
    });
    Logger.log('UPDATE: ' + JSON.stringify(resultUpdate));
    
    // Eliminar
    var resultDelete = deleteExpense({
      rowIndex: resultAdd.fila
    });
    Logger.log('DELETE: ' + JSON.stringify(resultDelete));
  }
}
