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
- **📊 Umumiy yillik (davomat oynasida).** Guruh ochilganda «📊 Yillik» tugmasi shu guruhning butun o'quv yili bo'yicha natijasini ko'rsatadi: jami ko'rsatkichlar, oylar bo'yicha davomat %, har o'quvchi (keldi / kelmadi / sababli / kechikdi / daftarsiz / o'rtacha baho / %) va kunlar bo'yicha jadval. Semestr yoki oy tanlash va Excel'ga yuklab olish mumkin.
- **✏️ Jurnal — butun yil, tahrirlash bilan.** «📊 Yillik» → «✏️ Jurnal (kunlar)»: 02.09.2026 dan bugungacha jadval bo'yicha barcha dars kunlari (belgi qo'yilmaganlari kulrang sana bilan), har katakda belgi va baho. Katakni bosing → `+ − S K`, `2–5`, «Daftar yo'q», «Tozalash»; «Keyingi o'quvchi» bilan ustun bo'ylab tez yurasiz. Kompyuterda klaviatura: `+ - s k`, `2–5`, `d`, `Delete`, `↑ ↓ Enter`, `← →`, `Esc`. Jadvalda yo'q kun — «➕ Sana». O'zgarishlar sariq bo'lib turadi (qurilmada saqlanib qoladi), «Saqlash» bosilgach har bir kun Google Sheets'ga fonda yoziladi.
- **➕ O'quvchi qo'shish.** Guruh jurnalining oxiriga yangi qator qo'shadi (T/r, F.I.Sh., formulalar nusxalanadi).
- **↪ Boshqa guruhga o'tkazish / 🗑 Ro'yxatdan o'chirish (05.11.2026).** Kartadagi «⋯» → «Ro'yxat» bo'limi. O'chirishda o'quvchi qatori guruh jadvalidan o'chiriladi, pastdagilarning T/r raqami suriladi; qatorning nusxasi (sarlavha bilan, barcha belgi va baholar) boshqaruv faylining **Arxiv** varag'iga yoziladi. O'tkazishda o'quvchi yangi guruh ro'yxati oxiriga qo'shiladi (izohi ham ko'chadi, yetakchi/sardor vazifasi eski guruhda qoladi) va eski guruhdan xuddi shunday o'chiriladi. 05-25 uchun «Barcha paralarda (I, II, III)» belgisi bilan uchala paradan birdan. Qurilmadagi qoralama, navbatdagi saqlanmagan davomatlar va izohlar yangi qator raqamlariga avtomatik moslashadi. ✏️ Jurnalda saqlanmagan o'zgarish bo'lsa, avval saqlash so'raladi.

- **⬇ 05-25 — 3 para birga (13.11.2026).** «Bugun» oynasida 05-25 paralari ostida «05-25 — 3 para birga» kartasi, 05-25 davomat oynasida esa «⬇ 3 para (I·II·III)» tugmasi. Qaysi paralarda davomat qilingan bo'lsa (I, II, III — bittasi, ikkitasi yoki uchalasi), hammasi bitta hujjatga yig'iladi: har o'quvchi uchun har para holati, paralar bo'yicha keldi/kelmadi, kelmaganlar ro'yxati. Oynadan: 📝 Word (.docx), 🖨 PDF, 🖼 Rasm (PNG) yuklab olish va ✈ Telegramga yuborish. Belgilanmagan para qo'shilmaydi (oynada ogohlantirish chiqadi); ochiq turgan paraning saqlanmagan belgilari ham hisobga olinadi.

### Apps Script'ni yangilash (yetakchi/izoh, o'quvchi qo'shish, o'tkazish va o'chirish uchun shart)
Apps Script'ga `qoshimcha.gs` joylangan va `doPost` ga `qoshimcha_(a, req)` chaqiruvi kiritilgan (nusxasi: `apps-script/qoshimcha.gs`). Kod o'zgarsa: **Deploy → Manage deployments → New version**.

## Belgilar (Google Sheets'da)
`+` keldi · `-` kelmadi · `s` sababli · `k` kechikdi · `+d` / `kd` — keldi, lekin daftar yo'q · baho `2–5` (B ustuniga).
