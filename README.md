# Smart Soft — Dynamic Smart Redirect System (DSRS)

نظام احترافي لإدارة **رابط ثابت واحد** (للوحات الإعلانية / QR) وتحويله بشكل ديناميكي عبر:
- **Direct Redirect** إلى رابط محدد
- **Multi Links Page** صفحة روابط شبيهة بـ Linktree
- **Maintenance Mode** عند تعطيل النظام

> Frontend مستضاف على GitHub Pages، و Backend عبر Google Apps Script + Google Sheets.

---

## 1) هيكل المشروع

```
/assets
/css
/js
/admin
  /css
  /js
index.html
links.html
maintenance.html
```

---

## 2) تجهيز Google Sheet

تم إرفاق قالب جاهز: **sheet-template.xlsx**  
افتح Google Drive → ارفع الملف → **Open with Google Sheets**.

### الأوراق داخل القالب:
- `Config` إعدادات النظام
- `Links` الروابط المتعددة
- `Visits` إحصاءات الزيارات (Log للزيارات)
- `Logs` سجل التعديلات (Admin)

---

## 3) تجهيز Google Apps Script

1. أنشئ مشروع Apps Script جديد.
2. انسخ محتوى الملف `apps-script/Code.gs` إلى `Code.gs`.
3. من **Project Settings** فعّل **Script Properties** وضع القيم التالية:

- `SPREADSHEET_ID` : ضع ID الشيت (من رابط Google Sheets)
- `ADMIN_PASSWORD_SHA256` : قيمة هاش SHA-256 لكلمة المرور
- `TOKEN_SECRET` : أي نص عشوائي طويل (مثلاً 32+ حرف)
- `ALLOWED_ORIGINS` : نطاق GitHub Pages (مثال: `https://YOURNAME.github.io`)

> لإنشاء SHA-256 بسرعة: استخدم أي موقع موثوق أو Node/Python محلياً.

4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. انسخ رابط الـ Web App.

---

## 4) ربط الـ Frontend بالـ API

افتح الملف:
- `js/config.js`

وابدل النص:
- `PASTE_YOUR_GAS_WEBAPP_URL_HERE`

ثم أعد ترميز Base64 (نصيحة: يمكنك تعديل النص فقط وسيبقى Base64 قديم — لذا الأفضل:
- استبدل قيمة `API_B64` مباشرة باستخدام Base64 للرابط)

مثال Base64:
- في المتصفح: `btoa("YOUR_URL")`

---

## 5) تشغيل على GitHub Pages

1. ارفع هذا المشروع إلى GitHub Repo.
2. Settings → Pages → اختر Branch `main` و Folder `/ (root)`.
3. افتح:
- `https://USERNAME.github.io/REPO/` (سيعمل كرابط ثابت للتحويل)
- `.../admin/` لوحة التحكم

---

## 6) ملاحظات أمنية مهمة

- مشروع GitHub Pages **Static**؛ لذلك لا يوجد "إخفاء كامل" لرابط API من كود الواجهة.
- الحماية الحقيقية تتم في Apps Script عبر:
  - كلمة مرور (SHA-256) + Token موقّع
  - التحقق من Origin المسموح
  - Rate limiting بسيط

---

## 7) تخصيص الهوية (الشعار والألوان)

- استبدل `assets/logo.svg` بالشعار الرسمي المرفق لديك (نفس الاسم) ليظهر تلقائياً في كل الصفحات.
- الألوان معرفة في `css/style.css` ضمن `:root`.

---

## 8) بيانات التواصل (Smart Soft)

- AI: 00967 735098666
- الإدارة والدعم الفني: 00967 770522788
- البريد: contact@smart-soft.io
- الموقع: smart-soft.io

---

Developed by Smart Soft Company
