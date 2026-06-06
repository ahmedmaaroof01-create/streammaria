# خطة تنفيذ منصة "ماريا"

سأنفذ الخطة الشاملة دون مفتاح Google API (استخدام طريقة scraping محسّنة مع pagination)، بالإضافة إلى تحسينات PWA والمشغل والسلايدر.

## 1) الهوية و SEO
- تغيير الاسم إلى **ماريا** في `__root.tsx` (title, og:title, description)
- تحديث `DynamicLogo` للهوية الجديدة
- توليد أيقونات PWA: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon`

## 2) PWA كامل (بدون offline)
- `public/manifest.webmanifest` مع: name "ماريا", short_name, theme_color, background_color, display: standalone, icons, lang: ar, dir: rtl
- meta tags في `__root.tsx`: manifest, theme-color, apple-touch-icon, apple-mobile-web-app-capable
- مكوّن `InstallPrompt.tsx` يستمع لـ `beforeinstallprompt` ويعرض زر تثبيت أنيق
- بدون service worker (حسب توجيهات Lovable)

## 3) استيراد Google Drive محسّن (بدون API key)
- إعادة كتابة scraper في `drive.functions.ts`:
  - استخدام endpoint `https://drive.google.com/embeddedfolderview?id={id}#list` يعطي قائمة أكمل
  - استخراج كل الفيديوهات + thumbnails بـ regex محسّن
  - upsert على `drive_file_id` (unique constraint موجود)
- حفظ `folder_id` في جدول `folders` (موجود)
- مزامنة دورية كل 24 ساعة عبر `/api/public/sync`

## 4) الشاشة الرئيسية الجديدة (عامة، بدون login)
- **Hero Slider** أعلى الصفحة: يعرض آخر 8-10 فيديوهات مع تشغيل تلقائي للتريلر (iframe Drive `autoplay=1&mute=1`)
  - استخدام `embla-carousel` (موجود) + `embla-carousel-autoplay`
  - تبديل كل 8 ثوانٍ، أزرار تنقل، نقاط مؤشرة
- **شبكة الفيديوهات** أسفل السلايدر مع thumbnails + pagination (50/صفحة) أو infinite scroll
- إخفاء واجهة الاستيراد من الصفحة الرئيسية (تنتقل إلى `/admin`)
- تصميم احترافي: dark theme، gradients، hover effects، responsive

## 5) مشغل الفيديو المحسّن `/watch/$id`
- استبدال المشغل بـ Drive iframe: `https://drive.google.com/file/d/{id}/preview`
- يعمل بدون login، بدون "تعذر تشغيل"
- **Responsive**: `aspect-video` + `max-h-[70vh]` على الموبايل
- زر **ملء الشاشة** مخصص يستخدم Fullscreen API على حاوية الـ iframe
- شريط أدوات سفلي للموبايل: إعجاب، حفظ، مشاركة، fullscreen
- استبدال قسم "الاهتمامات/الوسوم" بـ **زر شات بوت ماريا** عائم
- تتبع المشاهدة عبر `visitor_id` (موجود)
- فصول AI تلقائية باستخدام `google/gemini-3-flash-preview` عبر Lovable AI (مجاني، بدون مفتاح)

## 6) لوحة الأدمن `/admin` (كلمة سر فقط)
- صفحة دخول بكلمة سر `6969` (secret: `ADMIN_PASSCODE`)
- token في `sessionStorage` + التحقق في كل serverFn admin عبر `adminToken` parameter
- تبويبات:
  - **المجلدات**: إضافة/حذف رابط Drive، مزامنة يدوية
  - **الفيديوهات**: قائمة كاملة مع إحصائيات
  - **النشاط**: قائمة الزوار، آخر فيديو شاهده كل زائر، الكل تاريخياً
  - **زائر مفرد** `/admin/visitor/$id`: تاريخ مشاهداته الكامل + محادثاته
  - **حظر**: إضافة/إزالة `visitor_id` من `blocked_visitors`

## 7) شات بوت ماريا
- زر عائم في الزاوية + صفحة `/chat`
- streaming من Lovable AI (`google/gemini-3-flash-preview`)
- system prompt عربي/بغدادي ودود يساعد في اقتراح أفلام
- حفظ المحادثات في `chat_messages` مرتبطة بـ `visitor_id`
- ضمن سياسات الأمان الافتراضية

## 8) قاعدة البيانات
الجداول الجديدة (`video_chapters`, `chat_messages`, `blocked_visitors`) موجودة من migration سابق.
- إضافة سياسات INSERT للسماح بالكتابة من الخادم (admin client يتخطى RLS، لكن لتنظيف)
- إضافة GRANTs للجداول الجديدة

## 9) الأسرار المطلوبة
فقط `ADMIN_PASSCODE` (قيمة `6969`). Lovable AI متاح عبر `LOVABLE_API_KEY` الموجود.

## ملاحظات تقنية
- جميع server functions تستخدم `supabaseAdmin` (admin client)
- التحقق من admin token داخل كل serverFn حساس
- التريلر يستخدم iframe Drive مع `autoplay=1` (يحتاج mute للموبايل)
- استخدام `react-query` للـ caching والتحديث التلقائي
- معالجة runtime error #418 (hydration) عبر `<ClientOnly>` للسلايدر

## خارج النطاق
- محتوى للبالغين، شات بدون قيود، offline mode

هل أبدأ التنفيذ؟
