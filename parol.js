/* Parolni o'zgartirish oynasi (index.html dagi api, LS, toast, TOKEN dan foydalanadi) */
(function () {
  var lo = document.getElementById('logoutBtn');
  if (!lo) return;
  var btn = document.createElement('button');
  btn.className = 'iconbtn';
  btn.title = "Parolni o'zgartirish";
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  lo.parentNode.insertBefore(btn, lo);

  var m = document.createElement('div');
  m.className = 'hide';
  m.style.cssText = 'position:fixed;inset:0;z-index:60;background:rgba(10,12,30,.45);display:grid;place-items:center;padding:16px';
  m.innerHTML =
    '<form class="lcard" style="max-width:360px">' +
    '<h1 style="font-size:20px">Parolni o&#39;zgartirish</h1>' +
    '<p class="small">Yangi parol kamida 6 belgidan iborat bo&#39;lsin.</p>' +
    '<label class="fld"><span>Eski parol</span><input type="password" name="eski" required autocomplete="current-password"></label>' +
    '<label class="fld"><span>Yangi parol</span><input type="password" name="yangi" required minlength="6" autocomplete="new-password"></label>' +
    '<label class="fld"><span>Yangi parol (takror)</span><input type="password" name="yangi2" required minlength="6" autocomplete="new-password"></label>' +
    '<div style="display:flex;gap:8px"><button type="button" class="btn" data-x style="background:var(--bg)">Bekor</button>' +
    '<button class="btn btn-pri" style="flex:1">Saqlash</button></div>' +
    '<div class="err"></div></form>';
  document.body.appendChild(m);

  var f = m.querySelector('form'), er = m.querySelector('.err');
  btn.onclick = function () { f.reset(); er.textContent = ''; m.classList.remove('hide'); };
  m.querySelector('[data-x]').onclick = function () { m.classList.add('hide'); };
  f.onsubmit = async function (e) {
    e.preventDefault();
    var d = Object.fromEntries(new FormData(f));
    if (d.yangi !== d.yangi2) { er.textContent = 'Yangi parollar bir xil emas'; return; }
    try {
      var j = await api('parol', { eski: d.eski, yangi: d.yangi });
      if (j.token) { TOKEN = j.token; LS.set('token', TOKEN); }
      m.classList.add('hide');
      toast("Parol o'zgartirildi ✓");
    } catch (x) { er.textContent = x.message; }
  };
})();
