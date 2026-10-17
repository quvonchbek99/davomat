# Davomat sayti

Sayt: https://quvonchbek99.github.io/davomat/ · Backend: Google Apps Script "Davomat API" + Google Sheets.

## Yangi imkoniyatlar (oktabr 2026)

- **Avto-saqlash (qoralama).** Har bir bosish shu qurilmaga yoziladi. «Saqlash» bosilmay chiqib ketilsa ham, guruh qayta ochilganda belgilar tiklanadi («Saqlanmagan qoralama tiklandi» xabari chiqadi). «Saqlash» bosilgach qoralama o'chadi.
- **Qizil karta — xavfli o'quvchilar.** Hisobot bo'yicha 3 va undan ko'p marta kelmagan yoki 3+ marta daftarsiz kelganlar qizil rangda, «⚠ 4× kelmagan · 3× daftarsiz» belgisi bilan. (Chegara: `index.html` dagi `RISK_N`.)
- **Baho darajasi.** O'rtacha baho bo'yicha «5» / «4» / «3» / «2» oladiganlar rangli belgi bilan ajratiladi (≥4.5 → 5, ≥3.5 → 4, ≥2.5 → 3, boshqasi → 2).
- **Guruh yetakchisi / sardor va izoh.** Kartadagi «⋯» tugmasi → vazifa (👑 yetakchi, ⭐ sardor) va o'quvchi holati bo'yicha izoh. Izoh kartada ko'rinadi, boshqaruv faylining **Izoh** varag'ida saqlanadi.
- **Saralash.** Davomat oynasidagi ro'yxat: Hammasi / ⚠ Xavfli / «5» / «4» / «3» / «2» / Yetakchi-sardor / Izohi borlar.
- **➕ O'quvchi qo'shish.** Guruh jurnalining oxiriga yangi qator qo'shadi (T/r, F.I.Sh., formulalar nusxalanadi).

### Apps Script'ni yangilash (yetakchi/izoh va o'quvchi qo'shish uchun shart)
`apps-script/qoshimcha.gs` faylini Apps Script loyihasiga qo'shing va `doPost` ichiga bitta qator kiriting — ko'rsatma faylning boshida. Keyin **Deploy → Manage deployments → New version**. Skript yangilanmaguncha izoh/vazifa faqat shu qurilmada saqlanadi, «O'quvchi qo'shish» esa xabar beradi.

## Belgilar (Google Sheets'da)
`+` keldi · `-` kelmadi · `s` sababli · `k` kechikdi · `+d` / `kd` — keldi, lekin daftar yo'q · baho `2–5` (B ustuniga).
