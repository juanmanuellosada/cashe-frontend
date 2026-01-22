// ============================================
// APPS SCRIPT COMPLETO - FINANZAS PERSONALES
// ============================================
// Este archivo contiene TODO el código que debes tener en tu Apps Script.
// Copia y pega TODO este contenido en tu editor de Apps Script
// (Extensiones > Apps Script)
// ============================================


// ============================================
// PARTE 1: TU CÓDIGO EXISTENTE
// ============================================

/**
 * Obtiene cotizaciones de la API dolarapi.com
 * @param {string} casa El tipo de cotización (ej: "oficial", "blue", "bolsa").
 * @param {string} tipo El valor a obtener (ej: "compra" o "venta").
 * @return El valor numérico de la cotización.
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
 * Parsea una fecha en formato dd/mm/yyyy (o d/m/yyyy) y devuelve un Date.
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
    var r    = e.namedValues;
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
// PARTE 2: API REST PARA LA WEB APP
// ============================================

/**
 * Maneja peticiones GET
 * Acciones: getAccounts, getCategories, getDashboard, getRecentMovements, getExchangeRate
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
      case 'getExchangeRate':
        result = getExchangeRate();
        break;
      default:
        result = { error: 'Acción no válida: ' + action };
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
 * Acciones: addIncome, addExpense, addTransfer
 */
function doPost(e) {
  var output;
  
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result;
    
    switch(action) {
      case 'addIncome':
        result = addIncome(data);
        break;
      case 'addExpense':
        result = addExpense(data);
        break;
      case 'addTransfer':
        result = addTransfer(data);
        break;
      default:
        result = { error: 'Acción no válida: ' + action };
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
// FUNCIONES GET (Lectura de datos)
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
    if (data[i][0]) { // Si tiene nombre
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
 * Obtiene todas las categorías separadas por tipo
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
 * Obtiene el tipo de cambio actual
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
  
  // Obtener tipo de cambio
  var monedas = ss.getSheetByName('Monedas');
  var tipoCambio = monedas.getRange('D3').getValue() || 1;
  
  // Obtener totales de cuentas
  var cuentas = ss.getSheetByName('Cuentas');
  var dataCuentas = cuentas.getDataRange().getValues();
  
  var totalPesos = 0;
  var totalDolares = 0;
  
  for (var i = 1; i < dataCuentas.length; i++) {
    if (dataCuentas[i][0]) { // Si tiene nombre
      var balance = parseFloat(dataCuentas[i][9]) || 0; // Columna J: Balance actual
      var moneda = dataCuentas[i][2]; // Columna C: Moneda
      
      if (moneda === 'Peso') {
        totalPesos += balance;
      } else if (moneda === 'Dólar estadounidense') {
        totalDolares += balance;
      }
    }
  }
  
  // Calcular gastos e ingresos del mes actual
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
 * Suma los movimientos de un mes (usa columna E: Monto en pesos)
 */
function sumarMovimientosMes(sheet, desde, hasta) {
  var data = sheet.getDataRange().getValues();
  var total = 0;
  
  for (var i = 1; i < data.length; i++) {
    var fecha = data[i][0];
    if (fecha instanceof Date && fecha >= desde && fecha <= hasta) {
      var montoPesos = parseFloat(data[i][4]) || 0; // Columna E: Monto en pesos
      total += montoPesos;
    }
  }
  
  return total;
}

/**
 * Obtiene los últimos movimientos (gastos e ingresos combinados)
 */
function getRecentMovements(limit) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var movements = [];
  
  // Obtener gastos
  var gastosSheet = ss.getSheetByName('Gastos');
  var gastosData = gastosSheet.getDataRange().getValues();
  
  for (var i = 1; i < gastosData.length; i++) {
    if (gastosData[i][0]) { // Si tiene fecha
      movements.push({
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
  
  // Obtener ingresos
  var ingresosSheet = ss.getSheetByName('Ingresos');
  var ingresosData = ingresosSheet.getDataRange().getValues();
  
  for (var i = 1; i < ingresosData.length; i++) {
    if (ingresosData[i][0]) { // Si tiene fecha
      movements.push({
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
  
  // Obtener transferencias
  var transfSheet = ss.getSheetByName('Transferencias');
  var transfData = transfSheet.getDataRange().getValues();
  
  for (var i = 1; i < transfData.length; i++) {
    if (transfData[i][0]) { // Si tiene fecha
      movements.push({
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
  
  // Limitar resultados
  movements = movements.slice(0, limit || 10);
  
  // Convertir fechas a ISO string para JSON
  movements = movements.map(function(m) {
    if (m.fecha instanceof Date) {
      m.fecha = m.fecha.toISOString();
    }
    return m;
  });
  
  return { success: true, movements: movements };
}


// ============================================
// FUNCIONES POST (Escritura de datos)
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
  
  // Validación
  if (!fecha || isNaN(monto) || !cuenta || !categoria) {
    return { success: false, error: 'Datos incompletos' };
  }
  
  // Obtener última fila y escribir solo columnas A-D y G
  // (E y F tienen fórmulas que NO debemos sobrescribir)
  var fila = sheet.getLastRow() + 1;
  sheet.getRange(fila, 1, 1, 4).setValues([[fecha, monto, cuenta, categoria]]);
  sheet.getRange(fila, 7).setValue(nota);
  sheet.getRange(fila, 1).setNumberFormat("dd-MM-yyyy");
  
  return { success: true, message: 'Ingreso registrado correctamente', fila: fila };
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
  
  // Validación
  if (!fecha || isNaN(monto) || !cuenta || !categoria) {
    return { success: false, error: 'Datos incompletos' };
  }
  
  // Obtener última fila y escribir solo columnas A-D y G
  var fila = sheet.getLastRow() + 1;
  sheet.getRange(fila, 1, 1, 4).setValues([[fecha, monto, cuenta, categoria]]);
  sheet.getRange(fila, 7).setValue(nota);
  sheet.getRange(fila, 1).setNumberFormat("dd-MM-yyyy");
  
  return { success: true, message: 'Gasto registrado correctamente', fila: fila };
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
  
  // Validación
  if (!fecha || !cuentaSaliente || !cuentaEntrante || isNaN(montoSaliente) || isNaN(montoEntrante)) {
    return { success: false, error: 'Datos incompletos' };
  }
  
  // En transferencias no hay fórmulas, podemos usar appendRow
  sheet.appendRow([fecha, cuentaSaliente, cuentaEntrante, montoSaliente, montoEntrante, nota]);
  
  var fila = sheet.getLastRow();
  sheet.getRange(fila, 1).setNumberFormat("dd-MM-yyyy");
  
  return { success: true, message: 'Transferencia registrada correctamente', fila: fila };
}


// ============================================
// FUNCIÓN DE PRUEBA
// ============================================

/**
 * Función para probar que el API funciona
 * Ejecuta esto manualmente para verificar
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
}
