/**
 * Davomat API — QO'SHIMCHA AMALLAR (addStudent, getMeta, saveMeta)
 * ------------------------------------------------------------------
 * Bu faylni Apps Script loyihangizga ("Davomat API") yangi fayl sifatida qo'shing:
 *   Apps Script → "+" → Script → nomi: qoshimcha → shu matnni joylang.
 *
 * Keyin Code.gs dagi doPost ichida, token tekshirilgandan SO'NG va
 * action'lar tarmog'idan (if (action === 'lesson') ...) OLDIN bitta qator qo'shing:
 *
 *     var q = qoshimcha_(action, data); if (q) return javob_(q);
 *
 *   (action — so'rovdagi "action" maydoni, data — so'rov obyekti,
 *    javob_ — sizdagi JSON qaytaruvchi funksiya; nomlari boshqacha bo'lsa moslang.
 *    Agar doPost to'g'ridan-to'g'ri ContentService qaytarsa:
 *     if (q) return ContentService.createTextOutput(JSON.stringify(q)).setMimeType(ContentService.MimeType.JSON); )
 *
 * Oxirida: Deploy → Manage deployments → ✏️ → Version: New version → Deploy.
 */

var BOSHQARUV_NOMI_ = 'Davomat tizimi — boshqaruv';
var IZOH_VARAQ_ = 'Izoh';

function qoshimcha_(action, d) {
  if (action === 'addStudent') return addStudent_(d);
  if (action === 'getMeta') return getMeta_(d);
  if (action === 'saveMeta') return saveMeta_(d);
  return null;
}

/* ---------- yordamchilar ---------- */
function boshqaruv_() {
  var it = DriveApp.getFilesByName(BOSHQARUV_NOMI_);
  if (!it.hasNext()) throw new Error('Boshqaruv fayli topilmadi: ' + BOSHQARUV_NOMI_);
  return SpreadsheetApp.open(it.next());
}
// Guruh → shu guruh jurnalining birinchi varag'i (Guruhlar varag'idagi "Sheet ID" ustunidan)
function guruhVaraq_(guruh) {
  var sh = boshqaruv_().getSheetByName('Guruhlar');
  var v = sh.getDataRange().getValues();
  var hdr = v[0].map(String), cG = hdr.indexOf('Guruh'), cId = hdr.indexOf('Sheet ID');
  if (cG < 0) cG = 0; if (cId < 0) cId = 2;
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][cG]).trim() === String(guruh).trim()) {
      var id = String(v[i][cId]).trim();
      if (!id) throw new Error(guruh + ' uchun Sheet ID yo\'q');
      return SpreadsheetApp.openById(id).getSheets()[0];
    }
  }
  throw new Error('Guruh topilmadi: ' + guruh);
}
// Sarlavha qatori ("T/r") va oxirgi o'quvchi qatori
function oquvchiChegara_(ws) {
  var A = ws.getRange(1, 1, Math.max(ws.getLastRow(), 4), 2).getValues();
  var hdr = -1;
  for (var i = 0; i < A.length; i++) if (String(A[i][0]).trim().toLowerCase() === 't/r') { hdr = i + 1; break; }
  if (hdr < 0) hdr = 3;
  var last = hdr;
  for (var r = hdr + 1; r <= A.length; r++) if (String(A[r - 1][1]).trim()) last = r; else break;
  return { hdr: hdr, last: last };
}

/* ---------- addStudent: {group, name} → {ok, r, n} ---------- */
function addStudent_(d) {
  var name = String(d.name || '').trim();
  if (!name) return { ok: false, error: 'Ism bo\'sh' };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var ws = guruhVaraq_(d.group), b = oquvchiChegara_(ws);
    var newRow = b.last + 1, n = b.last > b.hdr ? (Number(ws.getRange(b.last, 1).getValue()) || (b.last - b.hdr)) + 1 : 1;
    // Takrorlanmasin
    if (b.last > b.hdr) {
      var names = ws.getRange(b.hdr + 1, 2, b.last - b.hdr, 1).getValues().map(function (x) { return String(x[0]).trim().toLowerCase(); });
      if (names.indexOf(name.toLowerCase()) >= 0) return { ok: false, error: 'Bu o\'quvchi ro\'yxatda bor' };
    }
    if (newRow > ws.getMaxRows()) ws.insertRowsAfter(ws.getMaxRows(), 5);
    ws.getRange(newRow, 1, 1, 2).setValues([[n, name]]);
    // Oldingi qatordagi formulalar va formatni (C ustunidan oxirigacha) nusxalash
    if (b.last > b.hdr) {
      var lastCol = Math.max(ws.getLastColumn(), 5);
      ws.getRange(b.last, 1, 1, lastCol).copyTo(ws.getRange(newRow, 1, 1, lastCol), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
      ws.getRange(b.last, 3, 1, 3).copyTo(ws.getRange(newRow, 3, 1, 3), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
    }
    return { ok: true, r: newRow, n: n };
  } finally { lock.releaseLock(); }
}

/* ---------- Izoh varag'i: Guruh | Qator | F.I.Sh. | Rol | Izoh | Yangilangan ---------- */
function izohVaraq_() {
  var ss = boshqaruv_(), sh = ss.getSheetByName(IZOH_VARAQ_);
  if (!sh) {
    sh = ss.insertSheet(IZOH_VARAQ_);
    sh.getRange(1, 1, 1, 6).setValues([['Guruh', 'Qator', 'F.I.Sh.', 'Rol', 'Izoh', 'Yangilangan']]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.setColumnWidth(3, 260); sh.setColumnWidth(5, 360);
  }
  return sh;
}
/* getMeta: {group} → {ok, items:[{r, name, rol, izoh}]} */
function getMeta_(d) {
  var sh = izohVaraq_(), v = sh.getDataRange().getValues(), out = [];
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim() !== String(d.group).trim()) continue;
    out.push({ r: Number(v[i][1]), name: String(v[i][2]), rol: String(v[i][3] || ''), izoh: String(v[i][4] || '') });
  }
  return { ok: true, items: out };
}
/* saveMeta: {group, r, name, rol, izoh} → {ok} */
function saveMeta_(d) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var sh = izohVaraq_(), v = sh.getDataRange().getValues(), row = -1;
    for (var i = 1; i < v.length; i++) if (String(v[i][0]).trim() === String(d.group).trim() && Number(v[i][1]) === Number(d.r)) { row = i + 1; break; }
    var vals = [[d.group, Number(d.r), d.name || '', d.rol || '', d.izoh || '', new Date()]];
    if (!d.rol && !d.izoh) { if (row > 0) sh.deleteRow(row); return { ok: true }; }
    if (row > 0) sh.getRange(row, 1, 1, 6).setValues(vals); else sh.appendRow(vals[0]);
    return { ok: true };
  } finally { lock.releaseLock(); }
}
