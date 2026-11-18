/* =============================================================
   FANLAR — guruhga qo'shimcha fanlar va ularning baho jurnali
   - Excel'dan yuklash: har bir varaq = bitta fan (sarlavhadan guruh va fan nomi olinadi)
   - Qo'lda fan qo'shish (o'quvchilar guruh ro'yxatidan olinadi)
   - Jurnalni tahrirlash: katakka 2–5, NB, S, + yoziladi
   Saqlash: shu qurilmada (localStorage) + Google Sheets «Fanlar» varag'i
   (Apps Script'da getFanlar / saveFan / delFan bo'lsa).
   ============================================================= */
let FAN_SRV = null;          // null — tekshirilmagan, true — server ishlaydi, false — faqat shu qurilmada
let fanCur = null;           // ochiq fan (nusxa)
let fanDirty = false;
let fanImpList = [];         // Excel'dan o'qilgan varaqlar

const fanAll = () => LS.get('fanlar', []);
const fanPut = list => LS.set('fanlar', list);
const fanId = (g, n) => String(g).trim() + '|' + String(n).trim().toLowerCase();

// Katak qiymati: 2–5 baho, nb — kelmadi, s — sababli, + — keldi (bahosiz); tanilmasa null
function fanVal(x) {
  if (x === null || x === undefined) return '';
  if (typeof x === 'number') return Number.isInteger(x) && x >= 2 && x <= 5 ? String(x) : null;
  const t = String(x).trim().toLowerCase().replace(/\s+/g, '');
  if (!t) return '';
  if (/^[2-5]$/.test(t)) return t;
  if (/^(nb|нб|n|н|-|−|–|—|yo'q|yoq|kelmadi)$/.test(t)) return 'nb';
  if (/^(s|с|sababli|сабабли)$/.test(t)) return 's';
  if (/^(\+|✓|v|keldi)$/.test(t)) return '+';
  return null;
}
const fanShow = v => v === 'nb' ? 'NB' : v === 's' ? 'S' : v;

// «07.09» / «04.09 3-p» / Date -> yorliq; tartiblash uchun kalit
function fanDLabel(v) {
  if (v instanceof Date && !isNaN(v)) return String(v.getDate()).padStart(2, '0') + '.' + String(v.getMonth() + 1).padStart(2, '0');
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  const m = s.match(/^(\d{1,2})[.\/](\d{1,2})(?:[.\/]\d{2,4})?(.*)$/);
  if (!m) return null;
  return m[1].padStart(2, '0') + '.' + m[2].padStart(2, '0') + (m[3].trim() ? ' ' + m[3].trim() : '');
}
function fanDKey(l) {
  const m = String(l).match(/^(\d{2})\.(\d{2})(.*)$/); if (!m) return '9999';
  const mo = +m[2], y = mo >= 8 ? 2026 : 2027;   // o'quv yili: sentabr–iyun
  return y + '-' + m[2] + '-' + m[1] + m[3];
}

function fanStat(f) {
  let n = 0, sum = 0, nb = 0;
  f.oquvchilar.forEach(o => o.v.forEach(v => { if (/^[2-5]$/.test(v)) { n++; sum += +v; } else if (v === 'nb') nb++; }));
  return { baho: n, ortacha: n ? Math.round(sum / n * 10) / 10 : null, nb };
}
function fanAvg(o) { const g = o.v.filter(v => /^[2-5]$/.test(v)).map(Number); return g.length ? Math.round(g.reduce((a, b) => a + b, 0) / g.length * 10) / 10 : null; }

/* ---------------- Server bilan sinxronlash ---------------- */
async function fanSync() {
  if (API === 'demo') { FAN_SRV = false; return; }
  try {
    const j = await api('getFanlar', {}, 1);
    FAN_SRV = true;
    const loc = Object.fromEntries(fanAll().map(f => [f.id, f]));
    const out = [];
    (j.fanlar || []).forEach(s => {
      let f; try { f = JSON.parse(s.data); } catch (e) { return; }
      const l = loc[f.id]; delete loc[f.id];
      out.push(l && (l.unsynced || (l.yangilangan || '') > (f.yangilangan || '')) ? l : f);
    });
    Object.values(loc).forEach(l => { if (l.unsynced) out.push(l); });   // serverga hali yetmaganlar
    fanPut(out);
    out.filter(f => f.unsynced).forEach(f => fanPush(f));
  } catch (e) { FAN_SRV = false; }
}
async function fanPush(f) {
  if (FAN_SRV === false || API === 'demo') return false;
  try {
    const c = Object.assign({}, f); delete c.unsynced;
    await api('saveFan', { guruh: f.guruh, fan: f.nomi, id: f.id, data: JSON.stringify(c) }, 1);
    const list = fanAll(), x = list.find(z => z.id === f.id); if (x) { delete x.unsynced; fanPut(list); }
    return true;
  } catch (e) { return false; }
}
async function fanSave(f, quiet) {
  f.yangilangan = new Date().toISOString(); f.unsynced = true;
  const list = fanAll().filter(z => z.id !== f.id); list.push(f); fanPut(list);
  const ok = await fanPush(f);
  if (!quiet) toast(ok ? `«${f.nomi}» saqlandi ✓ (Google Sheets)` : `«${f.nomi}» shu qurilmada saqlandi` + (FAN_SRV === false ? '' : " — Sheets'ga keyinroq yuboriladi"), 2600);
  return ok;
}
async function fanDel(f) {
  fanPut(fanAll().filter(z => z.id !== f.id));
  if (FAN_SRV) { try { await api('delFan', { id: f.id, guruh: f.guruh, fan: f.nomi }, 1); } catch (e) { toast("Sheets'dan o'chirib bo'lmadi: " + e.message, 3500); } }
}

/* ---------------- Ro'yxat (Fanlar bo'limi) ---------------- */
async function renderFan() {
  const box = $('#v-fan');
  const draw = () => {
    const list = fanAll().sort((a, b) => a.guruh.localeCompare(b.guruh) || a.nomi.localeCompare(b.nomi));
    const groups = [...new Set(list.map(f => f.guruh))];
    const note = FAN_SRV === false ? `<div class="fnnote">⚠ Fanlar hozircha <b>faqat shu qurilmada</b> saqlanadi. Boshqa qurilmada ham ko'rinishi uchun Apps Script'ga <code>apps-script/qoshimcha.gs</code> ning yangi nusxasini joylab, <b>Deploy → New version</b> qiling.</div>` : '';
    box.innerHTML = `<div class="fntop"><h2 class="sec" style="margin:0;flex:1">Fanlar</h2>
      <button class="btn btn-ghost fnb" id="fanUp">⬆ Excel yuklash</button>
      <button class="btn btn-pri fnb" id="fanAdd">➕ Fan qo'shish</button>
      <input type="file" id="fanFile" accept=".xlsx,.xls,.xlsm,.ods,.csv" hidden></div>
      <div class="small" style="margin:4px 0 12px">Excel faylning har bir varag'i alohida fan bo'ladi: 1-qatorda «09-26 Sartarosh · Fan nomi …», keyin <b>№ · F.I.Sh. · sanalar</b> sarlavhasi va o'quvchilar. Katakda: <b>2–5</b>, <b>NB</b>, <b>S</b>, <b>+</b>.</div>
      ${note}` +
      (list.length ? groups.map(g => `<h2 class="sec">${esc(g)} guruh</h2><div class="grid">` + list.filter(f => f.guruh === g).map(f => {
        const st = fanStat(f);
        return `<button class="gcard" data-fan="${esc(f.id)}"><div class="nm" style="color:var(--ink);font-weight:800;font-size:15px;min-height:0">${esc(f.nomi)}</div>
          <div class="small" style="margin-top:6px">${f.sanalar.length} dars · ${f.oquvchilar.length} o'quvchi</div>
          <div class="kv"><span>Baho <b>${st.baho}</b></span><span>O'rt. <b>${st.ortacha ?? '—'}</b></span><span>NB <b>${st.nb}</b></span></div>
          ${f.unsynced && FAN_SRV ? `<div class="small" style="color:var(--late);font-weight:700;margin-top:4px">⏳ Sheets'ga yuborilmagan</div>` : ''}</button>`;
      }).join('') + '</div>').join('')
        : `<div class="empty"><b>Hali fan yo'q</b>Excel faylni yuklang yoki «Fan qo'shish» ni bosing</div>`);
    $('#fanUp').onclick = () => $('#fanFile').click();
    $('#fanFile').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) fanReadFile(f); };
    $('#fanAdd').onclick = fanNewDlg;
    box.querySelectorAll('[data-fan]').forEach(b => b.onclick = () => fanOpen(b.dataset.fan));
  };
  draw();
  if (FAN_SRV === null) { await fanSync(); if (curView === 'fan') draw(); }
}

/* ---------------- Excel'dan o'qish ---------------- */
async function fanReadFile(file) {
  try {
    await loadXLSX();
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    fanImpList = wb.SheetNames.map(n => fanParseSheet(n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }), file.name)).filter(Boolean);
    if (!fanImpList.length) return toast("Faylda o'quvchilar va sanalar ustuni bor varaq topilmadi", 4000);
    fanImpDlg();
  } catch (e) { toast('Excel o\'qilmadi: ' + e.message, 4500); }
}
function fanParseSheet(sheetName, rows, fileName) {
  // Sarlavha qatori: kamida 2 ta sana bor birinchi qator
  const hr = rows.findIndex(r => r.filter(c => fanDLabel(c)).length >= 2);
  if (hr < 0) return null;
  const head = rows[hr];
  const dcols = head.map((c, i) => fanDLabel(c) ? i : -1).filter(i => i >= 0);
  // F.I.Sh. ustuni: sarlavhada nomi bor, bo'lmasa — eng ko'p uzun matnli ustun
  let nc = head.findIndex(c => /f\.?\s*i\.?\s*sh|o.?quvchi|familiya|ism|фио|ф\.и\.о|ученик/i.test(String(c)));
  if (nc < 0 || dcols.includes(nc)) {
    let best = -1, bn = 0;
    for (let i = 0; i < dcols[0]; i++) { const n = rows.slice(hr + 1).filter(r => /[A-Za-zА-Яа-яЎўҚқҒғҲҳ]{3,}.*\s+.*[A-Za-zА-Яа-я]{2,}/.test(String(r[i] || ''))).length; if (n > bn) { bn = n; best = i; } }
    nc = best;
  }
  if (nc < 0) return null;
  // Sarlavhadan oldingi matn: guruh va fan nomi
  const title = rows.slice(0, hr).map(r => r.filter(c => String(c).trim()).join(' ')).filter(Boolean);
  const t0 = title[0] || '';
  const gm = (t0 + ' ' + sheetName + ' ' + (fileName || '')).match(/(?:^|[^\d])(\d{2}-\d{2})(?!\d)/);
  const parts = t0.split('·').map(s => s.trim()).filter(Boolean);
  const nomi = (parts.length >= 2 ? parts[1] : sheetName).trim();
  const sanalar = dcols.map(i => fanDLabel(head[i]));
  let bad = 0;
  const oquvchilar = [];
  for (const r of rows.slice(hr + 1)) {
    const name = String(r[nc] || '').replace(/\s+/g, ' ').trim();
    if (!/[A-Za-zА-Яа-яЎўҚқҒғҲҳ]{2,}\s+[A-Za-zА-Яа-яЎўҚқҒғҲҳ‘’'ʻ]{2,}/.test(name)) continue;
    const v = dcols.map(i => { const x = fanVal(r[i]); if (x === null) { bad++; return ''; } return x; });
    oquvchilar.push({ name, v });
  }
  if (!oquvchilar.length) return null;
  // Sanalarni tartiblash
  const ord = sanalar.map((l, i) => i).sort((a, b) => fanDKey(sanalar[a]).localeCompare(fanDKey(sanalar[b])));
  return {
    on: true, varaq: sheetName, guruh: gm ? gm[1] : '', nomi, bad,
    sanalar: ord.map(i => sanalar[i]), oquvchilar: oquvchilar.map(o => ({ name: o.name, v: ord.map(i => o.v[i]) }))
  };
}
// Guruh ro'yxati (bor bo'lsa) — ism moslashini tekshirish uchun
function fanRoster(g) {
  const s = LS.get('stu|' + g, null); if (s && s.length) return s.map(o => o.name);
  const r = (typeof repCache !== 'undefined' && repCache[g]) || LS.get('rep|' + g, null);
  return r && r.oquvchilar ? r.oquvchilar.map(o => o.name) : null;
}
const fanNK = s => String(s || '').toUpperCase().replace(/[‘’`'ʻʼ]/g, '').replace(/[^A-ZА-ЯЁЎҚҒҲ ]/g, '').split(' ').filter(Boolean).slice(0, 2).join(' ');
function fanUnmatched(names, roster) {
  if (!roster) return null;
  const R = roster.map(fanNK);
  return names.filter(n => { const k = fanNK(n); return !R.some(x => x === k || lev(x, k) <= 2); });
}

/* ---------------- Oyna (umumiy) ---------------- */
function fanDlg(html) {
  let ov = $('#fanDlg'); if (!ov) { ov = document.createElement('div'); ov.id = 'fanDlg'; document.body.appendChild(ov); }
  ov.innerHTML = `<div class="fnbox">${html}</div>`; ov.classList.remove('hide');
  ov.onclick = e => { if (e.target === ov) fanDlgClose(); };
  return ov;
}
function fanDlgClose() { const ov = $('#fanDlg'); if (ov) { ov.classList.add('hide'); ov.innerHTML = ''; } }
const fanGOpts = () => `<datalist id="fanGL">${(INIT && INIT.guruhlar || []).map(g => `<option value="${esc(g.id)}">${esc(g.nomi)}</option>`).join('')}</datalist>`;

function fanImpDlg() {
  const have = new Set(fanAll().map(f => f.id));
  const rowH = (s, i) => {
    let n = 0, nb = 0; s.oquvchilar.forEach(o => o.v.forEach(v => { if (/^[2-5]$/.test(v)) n++; else if (v === 'nb') nb++; }));
    const um = s.guruh ? fanUnmatched(s.oquvchilar.map(o => o.name), fanRoster(s.guruh)) : null;
    return `<div class="fnimp"><label class="fnck"><input type="checkbox" data-ion="${i}" ${s.on ? 'checked' : ''}></label>
      <div style="flex:1;min-width:0">
        <div class="fnrow"><input class="fni" data-ig="${i}" list="fanGL" value="${esc(s.guruh)}" placeholder="Guruh" style="width:84px">
          <input class="fni" data-in="${i}" value="${esc(s.nomi)}" placeholder="Fan nomi" style="flex:1;min-width:140px"></div>
        <div class="small" style="margin-top:4px">Varaq: «${esc(s.varaq)}» · ${s.sanalar.length} dars (${esc(s.sanalar[0])} – ${esc(s.sanalar[s.sanalar.length - 1])}) · ${s.oquvchilar.length} o'quvchi · ${n} baho · ${nb} NB</div>
        ${s.bad ? `<div class="small" style="color:var(--late)">${s.bad} ta katak tanilmadi (bo'sh qoldirildi)</div>` : ''}
        ${um && um.length ? `<div class="small" style="color:var(--late)">Guruh ro'yxatida yo'q: ${um.map(esc).join(', ')}</div>` : um ? `<div class="small" style="color:var(--ok)">✓ Ismlar guruh ro'yxatiga mos</div>` : ''}
        ${have.has(fanId(s.guruh, s.nomi)) ? `<div class="small" style="color:var(--no);font-weight:700">Bu fan bor — ustiga yoziladi</div>` : ''}
      </div></div>`;
  };
  const ov = fanDlg(`<div class="fnh"><b>Excel'dan fanlar</b><div class="sp"></div><button class="iconbtn" data-x>✕</button></div>
    <div class="small" style="margin-bottom:8px">Qo'shiladigan varaqlarni belgilang, kerak bo'lsa guruh va fan nomini to'g'rilang.</div>
    ${fanGOpts()}<div id="fanImpRows">${fanImpList.map(rowH).join('')}</div>
    <div class="fnrow" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-x style="background:var(--bg)">Bekor</button><button class="btn btn-pri" id="fanImpGo">Qo'shish</button></div>`);
  const redraw = () => { $('#fanImpRows').innerHTML = fanImpList.map(rowH).join(''); bind(); };
  const bind = () => {
    ov.querySelectorAll('[data-ion]').forEach(c => c.onchange = () => { fanImpList[+c.dataset.ion].on = c.checked; });
    ov.querySelectorAll('[data-ig]').forEach(c => c.onchange = () => { fanImpList[+c.dataset.ig].guruh = c.value.trim(); redraw(); });
    ov.querySelectorAll('[data-in]').forEach(c => c.onchange = () => { fanImpList[+c.dataset.in].nomi = c.value.trim(); redraw(); });
  };
  bind();
  ov.querySelectorAll('[data-x]').forEach(b => b.onclick = fanDlgClose);
  $('#fanImpGo').onclick = async () => {
    const sel = fanImpList.filter(s => s.on);
    if (!sel.length) return toast('Birorta varaq tanlanmagan');
    const noG = sel.find(s => !/^\d{2}-\d{2}$/.test(s.guruh) || !s.nomi);
    if (noG) return toast(`«${noG.varaq}» uchun guruh (masalan 09-26) va fan nomini yozing`, 3500);
    const ids = sel.map(s => fanId(s.guruh, s.nomi));
    if (new Set(ids).size !== ids.length) return toast('Ikkita varaqqa bir xil guruh va fan nomi berilgan', 3500);
    if (ids.some(id => have.has(id)) && !confirm("Ba'zi fanlar bor — ular Excel'dagi ma'lumot bilan almashtiriladi. Davom etilsinmi?")) return;
    $('#fanImpGo').disabled = true; $('#fanImpGo').textContent = 'Saqlanmoqda…';
    if (FAN_SRV === null) await fanSync();
    let ok = 0;
    for (const s of sel) { if (await fanSave({ id: fanId(s.guruh, s.nomi), guruh: s.guruh, nomi: s.nomi, sanalar: s.sanalar, oquvchilar: s.oquvchilar, manba: 'Excel: ' + s.varaq }, true)) ok++; }
    fanDlgClose();
    toast(`${sel.length} ta fan qo'shildi ✓` + (FAN_SRV ? (ok === sel.length ? " · Google Sheets'ga yozildi" : ` · Sheets'ga ${ok}/${sel.length}`) : ' · shu qurilmada'), 3500);
    renderFan();
  };
}

/* ---------------- Qo'lda fan qo'shish ---------------- */
function fanNewDlg() {
  const ov = fanDlg(`<div class="fnh"><b>Yangi fan</b><div class="sp"></div><button class="iconbtn" data-x>✕</button></div>${fanGOpts()}
    <label class="fld"><span>Guruh</span><input id="fnG" list="fanGL" placeholder="masalan 09-26"></label>
    <label class="fld"><span>Fan nomi</span><input id="fnN" placeholder="masalan Kasb etikasi va psixologiyasi"></label>
    <label class="fld"><span>O'quvchilar (har qatorda bittasi)</span><textarea id="fnS" rows="8" class="fnta" placeholder="Guruhni tanlasangiz, ro'yxat o'zi to'ladi"></textarea></label>
    <div class="fnrow" style="justify-content:flex-end"><button class="btn" data-x style="background:var(--bg)">Bekor</button><button class="btn btn-pri" id="fnGo">Qo'shish</button></div>`);
  ov.querySelectorAll('[data-x]').forEach(b => b.onclick = fanDlgClose);
  const fill = async () => {
    const g = $('#fnG').value.trim(); if (!/^\d{2}-\d{2}$/.test(g) || $('#fnS').value.trim()) return;
    let r = fanRoster(g);
    if (!r && INIT && INIT.guruhlar.some(x => x.id === g)) { try { r = (await getRep(g)).oquvchilar.map(o => o.name); } catch (e) { } }
    if (!r) { const o = fanAll().find(f => f.guruh === g); if (o) r = o.oquvchilar.map(x => x.name); }
    if (r && !$('#fnS').value.trim()) $('#fnS').value = r.join('\n');
  };
  $('#fnG').onchange = fill;
  $('#fnGo').onclick = async () => {
    const g = $('#fnG').value.trim(), n = $('#fnN').value.replace(/\s+/g, ' ').trim();
    const names = $('#fnS').value.split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!/^\d{2}-\d{2}$/.test(g)) return toast('Guruhni yozing (masalan 09-26)');
    if (!n) return toast('Fan nomini yozing');
    const id = fanId(g, n);
    if (fanAll().some(f => f.id === id)) return toast('Bu guruhda shunday fan bor');
    if (FAN_SRV === null) await fanSync();
    const f = { id, guruh: g, nomi: n, sanalar: [], oquvchilar: names.map(name => ({ name, v: [] })) };
    await fanSave(f);
    fanDlgClose(); renderFan(); fanOpen(id);
  };
}

/* ---------------- Fan jurnali ---------------- */
function fanOpen(id) {
  const f = fanAll().find(z => z.id === id); if (!f) return;
  fanCur = JSON.parse(JSON.stringify(f)); fanDirty = false;
  let sec = $('#fanv');
  if (!sec) {
    sec = document.createElement('section'); sec.id = 'fanv'; sec.className = 'hide';
    sec.innerHTML = `<div class="atthead"><div class="topin">
        <button class="iconbtn" id="fanBack" aria-label="Orqaga"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg></button>
        <div style="min-width:0"><div class="atttitle" id="fanTitle"></div><div class="attsub" id="fanSub"></div></div><div class="sp"></div>
        <button class="btn btn-ghost" id="fanXls" style="background:#e3f7e9;color:#1e7e34;padding:9px 12px;font-size:13px;white-space:nowrap;flex-shrink:0">⬇ Excel</button>
      </div></div>
      <div class="wrap" id="fanBody" style="padding-top:12px"></div>
      <div class="foot hide" id="fanFoot"><div class="footin"><div class="cnt"><span style="background:#fff1d6;color:#b45309">Saqlanmagan o'zgarishlar</span></div>
        <button class="btn" id="fanUndo" style="background:var(--bg);padding:13px 14px">Bekor</button><button class="btn btn-pri" id="fanSaveB">Saqlash</button></div></div>`;
    document.body.appendChild(sec);
    $('#fanBack').onclick = () => { if (fanDirty && !confirm("Saqlanmagan o'zgarishlar yo'qolsinmi?")) return; fanClose(); };
    $('#fanUndo').onclick = () => { if (!confirm("O'zgarishlar bekor qilinsinmi?")) return; fanOpen(fanCur.id); };
    $('#fanSaveB').onclick = async () => { $('#fanSaveB').disabled = true; await fanSave(fanCur); $('#fanSaveB').disabled = false; fanDirty = false; fanDraw(); };
    $('#fanXls').onclick = () => fanXls(fanCur);
  }
  sec.classList.remove('hide'); document.body.style.overflow = 'hidden'; sec.scrollTop = 0;
  fanDraw();
}
function fanClose() { $('#fanv').classList.add('hide'); document.body.style.overflow = ''; fanCur = null; fanDirty = false; if (curView === 'fan') renderFan(); }
function fanMark() { fanDirty = true; $('#fanFoot').classList.remove('hide'); }

function fanDraw() {
  const f = fanCur, st = fanStat(f);
  $('#fanTitle').textContent = f.guruh + ' — ' + f.nomi;
  $('#fanSub').textContent = `${f.sanalar.length} dars · ${f.oquvchilar.length} o'quvchi · ${st.baho} baho · o'rt. ${st.ortacha ?? '—'} · NB ${st.nb}`;
  $('#fanFoot').classList.toggle('hide', !fanDirty);
  const head = f.sanalar.map((d, k) => `<th title="${esc(d)} · ✕ — ustunni o'chirish">${esc(d.slice(0, 5))}${d.length > 5 ? `<small>${esc(d.slice(6))}</small>` : ''}<button class="fnx" data-dc="${k}">✕</button></th>`).join('');
  const body = f.oquvchilar.map((o, i) => `<tr><td class="l"><button class="fnx" data-dr="${i}" title="O'quvchini o'chirish">✕</button>${i + 1}. ${esc(o.name)}</td>` +
    f.sanalar.map((d, k) => { const v = o.v[k] || ''; return `<td class="fncell ${v === 'nb' ? 'c-no' : v === 's' ? 'c-s' : ''}"><input data-c="${i}|${k}" value="${esc(fanShow(v))}" maxlength="2" inputmode="text" autocomplete="off"></td>`; }).join('') +
    `<td><b>${fanAvg(o) ?? '—'}</b></td></tr>`).join('');
  $('#fanBody').innerHTML = `<div class="fntop">
      <label class="jadd">➕ Sana <input type="date" id="fanAddD"></label>
      <select id="fanAddP" class="fnsel" title="Para (ixtiyoriy)"><option value="">para —</option>${[1, 2, 3, 4, 5, 6].map(p => `<option value="${p}">${p}-para</option>`).join('')}</select>
      <button class="btn btn-ghost fnb" id="fanAddS">➕ O'quvchi</button>
      <button class="btn btn-ghost fnb" id="fanRen">✏️ Nomi</button>
      <button class="btn fnb" id="fanDelB" style="background:var(--no-soft);color:var(--no)">🗑 Fanni o'chirish</button></div>
    <div class="small" style="margin:6px 0 10px">Katakka yozing: <b>2–5</b> baho, <b>NB</b> kelmadi, <b>S</b> sababli, <b>+</b> keldi. Enter / ↑ ↓ ← → — qo'shni katak.${f.manba ? ' Manba: ' + esc(f.manba) + '.' : ''}</div>
    ${f.sanalar.length ? `<div class="tblwrap fntbl"><table><thead><tr><th class="l">F.I.Sh.</th>${head}<th>O'rt.</th></tr></thead><tbody>${body}</tbody></table></div>`
      : `<div class="empty"><b>Hali dars sanasi yo'q</b>Yuqoridan «➕ Sana» orqali qo'shing</div>`}`;
  const B = $('#fanBody');
  B.querySelectorAll('input[data-c]').forEach(inp => {
    inp.onfocus = () => inp.select();
    inp.onchange = () => {
      const [i, k] = inp.dataset.c.split('|').map(Number), v = fanVal(inp.value);
      if (v === null) { toast('Faqat 2–5, NB, S yoki +'); inp.value = fanShow(fanCur.oquvchilar[i].v[k] || ''); return; }
      const o = fanCur.oquvchilar[i]; while (o.v.length < fanCur.sanalar.length) o.v.push('');
      o.v[k] = v; inp.value = fanShow(v);
      inp.parentElement.className = 'fncell ' + (v === 'nb' ? 'c-no' : v === 's' ? 'c-s' : '');
      inp.closest('tr').lastElementChild.innerHTML = `<b>${fanAvg(o) ?? '—'}</b>`;
      fanMark();
    };
    inp.onkeydown = e => {
      const [i, k] = inp.dataset.c.split('|').map(Number);
      const mv = { ArrowDown: [1, 0], Enter: [1, 0], ArrowUp: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key]; if (!mv) return;
      const t = B.querySelector(`input[data-c="${i + mv[0]}|${k + mv[1]}"]`); if (!t) return;
      e.preventDefault(); inp.dispatchEvent(new Event('change')); t.focus();
    };
  });
  B.querySelectorAll('[data-dc]').forEach(b => b.onclick = () => {
    const k = +b.dataset.dc, d = fanCur.sanalar[k], n = fanCur.oquvchilar.filter(o => o.v[k]).length;
    if (!confirm(`${d} ustuni o'chirilsinmi?` + (n ? ` (${n} ta katak to'ldirilgan)` : ''))) return;
    fanCur.sanalar.splice(k, 1); fanCur.oquvchilar.forEach(o => o.v.splice(k, 1)); fanMark(); fanDraw();
  });
  B.querySelectorAll('[data-dr]').forEach(b => b.onclick = () => {
    const i = +b.dataset.dr; if (!confirm(`${fanCur.oquvchilar[i].name} fan ro'yxatidan o'chirilsinmi?`)) return;
    fanCur.oquvchilar.splice(i, 1); fanMark(); fanDraw();
  });
  $('#fanAddD').onchange = e => {
    const v = e.target.value; if (!v) return;
    const p = $('#fanAddP').value, l = v.slice(8) + '.' + v.slice(5, 7) + (p ? ' ' + p + '-p' : '');
    if (fanCur.sanalar.includes(l)) return toast(l + ' sanasi bor');
    const all = fanCur.sanalar.concat([l]), ord = all.map((x, i) => i).sort((a, b) => fanDKey(all[a]).localeCompare(fanDKey(all[b])));
    fanCur.sanalar = ord.map(i => all[i]);
    fanCur.oquvchilar.forEach(o => { while (o.v.length < all.length - 1) o.v.push(''); o.v.push(''); o.v = ord.map(i => o.v[i]); });
    fanMark(); fanDraw(); toast(l + ' qo\'shildi');
  };
  $('#fanAddS').onclick = () => {
    const n = (prompt("O'quvchining F.I.Sh.:") || '').replace(/\s+/g, ' ').trim(); if (!n) return;
    fanCur.oquvchilar.push({ name: n, v: fanCur.sanalar.map(() => '') }); fanMark(); fanDraw();
  };
  $('#fanRen').onclick = () => {
    const n = (prompt('Fan nomi:', fanCur.nomi) || '').replace(/\s+/g, ' ').trim(); if (!n || n === fanCur.nomi) return;
    const nid = fanId(fanCur.guruh, n); if (fanAll().some(z => z.id === nid)) return toast('Bunday nomli fan bor');
    const old = { id: fanCur.id, guruh: fanCur.guruh, nomi: fanCur.nomi };
    fanCur.nomi = n; fanCur.id = nid;
    fanDel(old).then(() => fanSave(fanCur)).then(() => { fanDirty = false; fanDraw(); });
  };
  $('#fanDelB').onclick = async () => {
    if (!confirm(`«${fanCur.nomi}» (${fanCur.guruh}) fani va uning barcha baholari o'chirilsinmi? Qaytarib bo'lmaydi.`)) return;
    await fanDel(fanCur); fanDirty = false; fanClose(); toast("Fan o'chirildi");
  };
}

async function fanXls(f) {
  try {
    await loadXLSX();
    const wb = XLSX.utils.book_new();
    xlsSheet(wb, f.nomi, [
      [`${f.guruh} · ${f.nomi} · ${f.sanalar.length} dars`], [XH.meta.replace(/ · Matematika/, '')], [],
      ['№', "O'quvchi F.I.Sh.", ...f.sanalar, "O'rtacha"],
      ...f.oquvchilar.map((o, i) => [i + 1, o.name, ...f.sanalar.map((d, k) => { const v = o.v[k] || ''; return /^[2-5]$/.test(v) ? +v : fanShow(v); }), fanAvg(o) ?? ''])
    ], [5, 42, ...f.sanalar.map(() => 8), 9]);
    XLSX.writeFile(wb, fnSafe(`${f.guruh}_${f.nomi}.xlsx`));
  } catch (e) { toast(e.message, 4000); }
}
