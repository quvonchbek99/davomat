/* ===============================================================
 *  Davomat API — QO'SHIMCHA AMALLAR
 *    addStudent    — guruh ro'yxati oxiriga o'quvchi qo'shish
 *    removeStudent — o'quvchini ro'yxatdan o'chirish (nusxasi «Arxiv» varag'iga)
 *    moveStudent   — o'quvchini boshqa guruhga o'tkazish (yangi guruhga qo'shiladi, eskisidan o'chiriladi)
 *    getMeta / saveMeta — yetakchi/sardor va izohlar
 *  Apps Script loyihasida "qoshimcha.gs" fayli sifatida turadi (17.10.2026 da joylangan, 05.11.2026 yangilangan).
 *  Code.gs → doPost ichida, tokenTekshir_ dan keyin:
 *      const q = qoshimcha_(a, req); if (q) return javob_(q);
 *  Sizdagi yordamchilar ishlatiladi: guruhVaraq_, sarlavhaQator_, oquvchilar_, formulalar_, master_, gid_
 * =============================================================== */

function qoshimcha_(a, req) {
  if (a === 'addStudent')    return qulf_(() => oquvchiQosh0_(req.group, req.name));
  if (a === 'removeStudent') return qulf_(() => oquvchiOchir0_(req.group, req.r, req.name, "o'chirildi", ''));
  if (a === 'moveStudent')   return qulf_(() => oquvchiKochir0_(req));
  if (a === 'getMeta')       return izohOl_(req.group);
  if (a === 'saveMeta')      return qulf_(() => izohSaqla0_(req));
  return null;
}
function qulf_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
const ismTeng_ = (a, b) => String(a || '').replace(/\s+/g, ' ').trim().toLowerCase() === String(b || '').replace(/\s+/g, ' ').trim().toLowerCase();

/* ---- Yangi o'quvchi: guruh jadvalining oxiriga qator qo'shadi ---- */
function oquvchiQosh0_(gid, name) {
  name = String(name || '').trim();
  if (!name) throw new Error("Ism bo'sh");
  const sh = guruhVaraq_(gid);
  const values = sh.getDataRange().getValues();
  const hr = sarlavhaQator_(values);
  const list = oquvchilar_(values, hr);
  if (list.some(o => ismTeng_(o.name, name))) throw new Error("Bu o'quvchi ro'yxatda bor: " + name);
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
}

/* ---- O'quvchini o'chirish: qatorini Arxivga ko'chiradi, keyin guruh jadvalidan o'chiradi ----
 *  r — saytdagi qator raqami (0 dan), name — tekshirish uchun F.I.Sh. (qator surilgan bo'lsa ism bo'yicha topiladi) */
function oquvchiOchir0_(gid, r, name, amal, qayerga) {
  const sh = guruhVaraq_(gid);
  const values = sh.getDataRange().getValues();
  const hr = sarlavhaQator_(values);
  const list = oquvchilar_(values, hr);
  const o = list.find(x => x.r === Number(r) && ismTeng_(x.name, name)) || list.find(x => ismTeng_(x.name, name));
  if (!o) throw new Error("O'quvchi topilmadi: " + name + ' (' + gid + ')');
  const row = o.r + 1, nc = sh.getLastColumn();

  // 1) Arxiv: guruh sarlavhasi + o'quvchining butun qatori (ko'rinishdagi qiymatlar)
  const disp = sh.getRange(1, 1, Math.max(row, hr + 1), nc).getDisplayValues();
  arxivYoz_(gid, amal, qayerga, disp[hr], disp[o.r]);

  // 2) Guruh jadvalidan qatorni o'chirish
  sh.deleteRow(row);

  // 3) Pastdagilarning T/r raqamini bittaga kamaytirish (A ustunida formula bo'lsa — tegilmaydi)
  const keyin = list.filter(x => x.r > o.r);
  if (keyin.length && String(o.n) !== '' && !isNaN(Number(o.n)) && keyin.every(x => String(x.n) !== '' && !isNaN(Number(x.n)))) {
    const first = keyin[0].r, last = keyin[keyin.length - 1].r;   // o'chirilgandan keyin ular 1-based qator = x.r da
    const rng = sh.getRange(first, 1, last - first + 1, 1);
    if (!rng.getFormulas().some(f => f[0])) {
      const cur = rng.getValues();
      keyin.forEach(x => { cur[x.r - first][0] = Number(x.n) - 1; });
      rng.setValues(cur);
    }
  }
  if (list.length > 1) { try { formulalar_(sh, sh.getDataRange().getValues(), hr, list.length - 1); } catch (e) {} }

  // 4) Izoh varag'idagi qator raqamlarini surish
  const iz = izohSur_(gid, o.r);
  return { ok: true, r: o.r, n: o.n, name: o.name, izoh: iz };
}

/* ---- Boshqa guruhga o'tkazish: yangi guruh oxiriga qo'shadi, eskisidan o'chiradi (Arxivda qoladi) ---- */
function oquvchiKochir0_(req) {
  const from = String(req.group || '').trim(), to = String(req.target || '').trim(), name = String(req.name || '').trim();
  if (!to) throw new Error('Qaysi guruhga o\'tkazish tanlanmagan');
  if (gid_(to) === gid_(from)) throw new Error("O'quvchi allaqachon shu guruhda");
  let add;
  try { add = oquvchiQosh0_(to, name); }
  catch (e) { if (!/ro'yxatda bor/.test(e.message)) throw e; add = { mavjud: true, name: name }; }   // yangi guruhda bor bo'lsa — faqat eskisidan o'chiramiz
  const del = oquvchiOchir0_(from, req.r, name, "o'tkazildi", to);
  // Izohni yangi guruhga ko'chiramiz (vazifa — yetakchi/sardor — eski guruhda qoladi, ya'ni o'chadi)
  if (del.izoh && del.izoh.izoh && add.r != null) izohSaqla0_({ group: to, r: add.r, name: name, rol: '', izoh: del.izoh.izoh });
  return { ok: true, r: del.r, n: del.n, name: del.name, target: { guruh: to, r: add.r, n: add.n, mavjud: !!add.mavjud } };
}

/* ---- Arxiv varag'i (boshqaruv faylida): o'chirilgan / o'tkazilgan o'quvchilar ---- */
function arxivYoz_(gid, amal, qayerga, sarlavha, qator) {
  const ss = master_();
  let sh = ss.getSheetByName('Arxiv');
  if (!sh) {
    sh = ss.insertSheet('Arxiv');
    sh.getRange(1, 1, 1, 6).setValues([['Vaqt', 'Guruh', 'Amal', 'Qaysi guruhga', 'T/r', 'F.I.Sh. va guruh jadvalidagi qatori →']]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.setColumnWidth(6, 260);
  }
  const vaqt = Utilities.formatDate(new Date(), 'Asia/Tashkent', 'dd.MM.yyyy HH:mm');
  const rows = [[vaqt, gid, 'sarlavha', ''].concat(sarlavha || []), [vaqt, gid, amal, qayerga || ''].concat(qator || [])];
  const w = Math.max(rows[0].length, rows[1].length);
  rows.forEach(x => { while (x.length < w) x.push(''); });
  if (sh.getMaxColumns() < w) sh.insertColumnsAfter(sh.getMaxColumns(), w - sh.getMaxColumns());
  const at = sh.getLastRow() + 1;
  sh.getRange(at, 1, 2, w).setValues(rows);
  sh.getRange(at, 1, 1, w).setFontColor('#888888').setFontStyle('italic');
  sh.getRange(at + 1, 1, 1, 6).setFontWeight('bold');
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
function izohSaqla0_(req) {
  const sh = izohVaraq_();
  const v = sh.getDataRange().getValues();
  let row = -1;
  for (let i = 1; i < v.length; i++) if (gid_(v[i][0]) === String(req.group).trim() && Number(v[i][1]) === Number(req.r)) { row = i + 1; break; }
  if (!req.rol && !req.izoh) { if (row > 0) sh.deleteRow(row); return { ok: true, deleted: row > 0 }; }
  const vals = [[String(req.group), Number(req.r), String(req.name || ''), String(req.rol || ''), String(req.izoh || ''), new Date()]];
  if (row > 0) sh.getRange(row, 1, 1, 6).setValues(vals); else sh.appendRow(vals[0]);
  return { ok: true };
}
// Guruhdan r-qator o'chirilganda: o'sha o'quvchining izohini olib tashlaydi (qaytaradi), pastdagilarning qator raqamini 1 ga kamaytiradi
function izohSur_(gid, r0) {
  const sh = izohVaraq_();
  const v = sh.getDataRange().getValues();
  let removed = null; const del = [];
  for (let i = 1; i < v.length; i++) {
    if (gid_(v[i][0]) !== String(gid).trim()) continue;
    const r = Number(v[i][1]);
    if (r === r0) { removed = { rol: String(v[i][3] || ''), izoh: String(v[i][4] || '') }; del.push(i + 1); }
    else if (r > r0) sh.getRange(i + 1, 2).setValue(r - 1);
  }
  del.reverse().forEach(x => sh.deleteRow(x));
  return removed;
}
