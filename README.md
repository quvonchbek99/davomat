# Davomat sayti

Sayt: https://quvonchbek99.github.io/davomat/ · Backend: Google Apps Script "Davomat API" + Google Sheets.

## Yangi imkoniyatlar (oktabr 2026)

- **Avto-saqlash (qoralama).** Har bir bosish shu qurilmaga yoziladi. «Saqlash» bosilmay chiqib ketilsa ham, guruh qayta ochilganda belgilar tiklanadi («Saqlanmagan qoralama tiklandi» xabari chiqadi). «Saqlash» bosilgach qoralama o'chadi.
- **Qizil karta — xavfli o'quvchilar.** Hisobot bo'yicha 3 va undan ko'p marta kelmagan yoki 3+ marta daftarsiz kelganlar qizil rangda, «⚠ 4× kelmagan · 3× daftarsiz» belgisi bilan. (Chegara: `index.html` dagi `RISK_N`.)
- **Baho darajasi.** O'rtacha baho bo'yicha «5» / «4» / «3» / «2» oladiganlar rangli belgi bilan ajratiladi (≥4.5 → 5, ≥3.5 → 4, ≥2.5 → 3, boshqasi → 2).
- **Guruh yetakchisi / sardor va izoh.** Kartadagi «⋯» tugmasi → vazifa (👑 yetakchi, ⭐ sardor) va o'quvchi holati bo'yicha izoh. Izoh kartada ko'rinadi, boshqaruv faylining **Izoh** varag'ida saqlanadi.
- **Saralash.** Davomat oynasidagi ro'yxat: Hammasi / ⚠ Xavfli / «5» / «4» / «3» / «2» / Yetakchi-sardor / Izohi borlar.
- **🎤 Ovozli davomat.** Davomat oynasida «Ovoz» tugmasi (Chrome/Safari). Gapiring: «Karimov yo'q», «Saidov kechikdi besh», «Aliyev daftar yo'q», «Ergasheva sababli», «hammasi keldi». Familiya taxminan mos kelsa ham tanib oladi (kirill/lotin farqi yo'q); natija pastda yozib boriladi, qoralama avto-saqlanadi.
- **O'quvchi tarixi.** Karta «⋯» → butun davr belgilarining vaqt chizig'i (sana, +/−/S/K, baho, daftarsiz — binafsha hoshiya).
- **⬇ Excel hisobot.** Hisobot bo'limida: guruh uchun (Jami · Kunlar · Kelmaganlar varaqlari) va barcha guruhlar uchun (Umumiy · Xavfli) — tanlangan davr (yillik / semestr / oy / kun) bo'yicha.
- **➕ O'quvchi qo'shish.** Guruh jurnalining oxiriga yangi qator qo'shadi (T/r, F.I.Sh., formulalar nusxalanadi).

### Apps Script'ni yangilash (yetakchi/izoh va o'quvchi qo'shish uchun shart)
Apps Script'ga `qoshimcha.gs` joylangan va `doPost` ga `qoshimcha_(a, req)` chaqiruvi kiritilgan (nusxasi: `apps-script/qoshimcha.gs`). Kod o'zgarsa: **Deploy → Manage deployments → New version**.

## Belgilar (Google Sheets'da)
`+` keldi · `-` kelmadi · `s` sababli · `k` kechikdi · `+d` / `kd` — keldi, lekin daftar yo'q · baho `2–5` (B ustuniga).
