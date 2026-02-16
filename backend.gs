/**
 * FW-Admin Backend v1.6.6 "LG13 PRO"
 * RESTORED: Direct action handling for Stichtag update
 */

const STAMMDATEN_SHEET_ID = '1O7tawFcnlseCdhh0oI_U841KWFWFSVkg70VnYvOon58';
const CONFIG_SHEET_ID = '1b6QYW77VVGUXIpS0dhYSb3So48oYLuLGVzwp349rmTw';
const EINSAETZE_SHEET_ID = '1i7A5gt_-t3X6sTNSiGzt6zMtZT6wQgCg3JAA-DKGuJk';
const TERMINE_SHEET_ID = '1Oom0xsooTpJ-tUGGQT4JJGePhMR3BLCB4MpdKy-NAw0';

function doGet(e) {
  // --- NEU: WENN KEINE ACTION GEFRAGT IST -> ZEIGE DIE WEBSEITE ---
  if (!e.parameter.action) {
    return HtmlService.createTemplateFromFile('index') // Sucht die Datei 'index.html' im Projekt
        .evaluate()
        .setTitle('FW-Verwaltung Pro')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  const action = e.parameter.action || 'read';
  const module = e.parameter.module || 'dashboard';
  try {
    if (action === 'read') {
      if (module === 'all_dashboard_data') {
        return handleFullDataSync();
      }
      return handleRead(module);
    } 
    else if (action === 'update_stichtag' || action === 'write') {
      const newDate = e.parameter.date || e.parameter.value;
      return handleUpdateStichtag(newDate);
    }
  } catch (error) {
    return jsonResponse({ error: error.message });
  } 
}
/**
  * Hilfsfunktion zum Einbinden von HTML-Dateien (z.B. js.html)
  */
  function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  }

/**
 * Liefert alle Daten für das Dashboard in einem Request
 */
function handleFullDataSync() {
  const stammdatenSS = SpreadsheetApp.openById(STAMMDATEN_SHEET_ID);
  const configSS = SpreadsheetApp.openById(CONFIG_SHEET_ID);
  
  // Stichtag aus B2 lesen
  let stichtagValue = new Date();
  const globalVarSheet = configSS.getSheetByName('Globale Variablen') || configSS.getSheetByName('Config');
  if (globalVarSheet) {
    const val = globalVarSheet.getRange("B2").getValue();
    if (val) stichtagValue = val;
  }

  const promoRules = readSheet(configSS, 'Beförderungsbedingungen') || readSheet(configSS, 'Config') || [];
  const personnel = readSheet(stammdatenSS, 'FW-Stammdaten') || readSheet(stammdatenSS, 'Stammdaten') || readSheet(stammdatenSS, 0);

  let operations = [];
  try {
    const einsaetzeSS = SpreadsheetApp.openById(EINSAETZE_SHEET_ID);
    operations = readSheet(einsaetzeSS, 'FW-Einsätze') || readSheet(einsaetzeSS, 'Einsätze') || readSheet(einsaetzeSS, 0);
  } catch (e) {
    Logger.log('Fehler bei Einsätze-Abruf: ' + e.message);
  }

  let dienstplan = [];
  let belegungen = [];
  try {
    const termineSS = SpreadsheetApp.openById(TERMINE_SHEET_ID); // Die ID, die du oben als Konstante definiert hast
    dienstplan = readSheet(termineSS, 'Dienstplan') || [];
    belegungen = readSheet(termineSS, 'Belegungen') || [];
  } catch (e) {
    Logger.log('Fehler bei Termine-Abruf: ' + e.message);
  }

  return jsonResponse({
    stichtag: stichtagValue,
    promoRules: promoRules,
    personnel: personnel,
    operations: operations,
    dienstplan: dienstplan,
    belegungen: belegungen,
    timestamp: new Date().getTime()
  });
}

/**
 * Schreibt den neuen Stichtag in das Config-Sheet
 */
function handleUpdateStichtag(newDate) {
  if (!newDate) return jsonResponse({ error: "Kein Datum übergeben" });
  
  const configSS = SpreadsheetApp.openById(CONFIG_SHEET_ID);
  let sheet = configSS.getSheetByName('Globale Variablen') || configSS.getSheetByName('Config');
  
  if (!sheet) {
    sheet = configSS.insertSheet('Globale Variablen');
  }

  // A2 zur Sicherheit nochmal beschriften
  sheet.getRange("A2").setValue("Stichtag Evaluation");
  
  // WICHTIG: Wir schreiben den String direkt in die Zelle. 
  // Google Sheets erkennt "2026-05-30" automatisch als Datum.
  const rangeB2 = sheet.getRange("B2");
  rangeB2.setValue(newDate); 
  rangeB2.setNumberFormat("dd.mm.yyyy"); // Erzwingt die Anzeige wie in Bild 1
  
  return jsonResponse({ 
    success: true, 
    action: "update_stichtag",
    savedValue: newDate 
  });
}

/**
 * Wandelt ein Tabellenblatt in ein JSON-Array um
 */
function readSheet(spreadsheet, sheetNameOrIndex) {
  let sheet;
  if (typeof sheetNameOrIndex === 'string') {
    sheet = spreadsheet.getSheetByName(sheetNameOrIndex);
  } else {
    sheet = spreadsheet.getSheets()[sheetNameOrIndex];
  }
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => h.toString().trim());
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    const rowEmpty = data[i].every(cell => cell === '' || cell === null);
    if (rowEmpty) continue;
    
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      let val = data[i][j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "GMT+1", "yyyy-MM-dd'T'HH:mm:ss'Z'");
      }
      row[headers[j]] = val;
    }
    rows.push(row);
  }
  return rows;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleRead(module) {
  return handleFullDataSync();
}
