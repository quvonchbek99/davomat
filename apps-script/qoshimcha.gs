/* ===============================================================
 *  Davomat API — QO'SHIMCHA AMALLAR (addStudent, getMeta, saveMeta)
 *  Apps Script loyihasida "qoshimcha.gs" fayli sifatida turadi (17.10.2026 da joylangan).
 *  Code.gs → doPost ichida, tokenTekshir_ dan keyin:
 *      const q = qoshimcha_(a, req); if (q) return javob_(q);
 *  Sizdagi yordamchilar ishlatiladi: guruhVaraq_, sarlavhaQator_, oquvchilar_, formulalar_, master_, gid_
 * =============================================================== */

function qoshimcha_(a, req) {
  if (a === 'addStudent') return oquvchiQosh_(req.group, req.name);
  if (a === 'getMeta')    return izohOl_(req.group);
  if (a === 'saveMeta')   return izohSaqla_(req);
  return null;
}

/* ---- Yangi o'quvchi: guruh jadvalining oxiriga qator qo'shadi ---- */
function oquvchiQosh_(gid, name) {
  name = String(name || '').trim();
  if (!name) throw new Error("Ism bo'sh");
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = guruhVaraq_(gid);
    const values = sh.getDataRange().getValues();
    const hr = sarlavhaQator_(values);
    const list = oquvchilar_(values, hr);
    if (list.some(o => o.name.toLowerCase() === name.toLowerCase())) throw new Error("Bu o'quvchi ro'yxatda bor: " + name);
    let row, n;
    if (list.length) {
      const prevRow = list[list.length - 1].r + 1;          // 1-based sheet row of last student
      sh.insertRowAfter(prevRow);                           // format row above'dan meros bo'ladi, pastdagi narsalar suriladi
      row = prevRow + 1;
      n = (Number(list[list.length - 1].n) || list.length) + 1;
    } else { row = hr + 2; n = 1; }
    sh.getRange(row, 1, 1, 2).setValues([[n, name]]);
    sh.getRange(row, 3, 1, Math.max(sh.getLastColumn() - 2, 3)).clearContent();
    try { formulalar_(sh, sh.getDataRange().getValues(), hr, list.length + 1); } catch (e) {}
    return { r: row - 1, n: n, name: name };
  } finally { lock.releaseLock(); }
}

/* ---- Izoh varag'i (boshqaruv faylida): Guruh | Qator | F.I.Sh. | Rol | Izoh | Yangilangan ---- */
function izohVaraq_() {
  const ss = master_();
  let sh = ss.getSheetByName('Izoh');
  if (!sh) {
    sh = ss.insertSheet('Izoh');
    sh.getRange(1, 1, 1, 6).setValues([['Guruh', 'Qator', 'F.I.Sh.', 'Rol', 'Izoh', 'Yangilangan']]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.setColumnWidth(3, 260); sh.setColumnWidth(5, 380);
  }
  return sh;
}
function izohOl_(gid) {
  const v = izohVaraq_().getDataRange().getValues();
  const items = [];
  for (let i = 1; i < v.length; i++) {
    if (gid_(v[i][0]) !== String(gid).trim()) continue;
    items.push({ r: Number(v[i][1]), name: String(v[i][2] || ''), rol: String(v[i][3] || ''), izoh: String(v[i][4] || '') });
  }
  return { items: items };
}
function izohSaqla_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = izohVaraq_();
    const v = sh.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < v.length; i++) if (gid_(v[i][0]) === String(req.group).trim() && Number(v[i][1]) === Number(req.r)) { row = i + 1; break; }
    if (!req.rol && !req.izoh) { if (row > 0) sh.deleteRow(row); return { ok: true, deleted: row > 0 }; }
    const vals = [[String(req.group), Number(req.r), String(req.name || ''), String(req.rol || ''), String(req.izoh || ''), new Date()]];
    if (row > 0) sh.getRange(row, 1, 1, 6).setValues(vals); else sh.appendRow(vals[0]);
    return { ok: true };
  } finally { lock.releaseLock(); }
}
