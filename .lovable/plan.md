## خطة تطوير منصة "ماريا"

منصة عرض فيديوهات من مجلد Google Drive عام، بصفحة رئيسية للزوار + لوحة إدارة محمية + شات بوت مساعد.

### 1) إعادة تسمية وهوية الموقع

- تغيير اسم الموقع إلى **"ماريا"** في `__root.tsx` (title, og:title, meta).
- تحديث `DynamicLogo` ليعرض اسم "ماريا".
- توليد أيقونات PWA (192, 512) باسم ماريا.

### 2) PWA احترافي كامل (بدون offline)

- إنشاء `public/manifest.webmanifest` مع: name="ماريا", short_name, theme_color, background_color, display=standalone, icons, lang=ar, dir=rtl.
- إنشاء أيقونات `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`.
- إضافة في `__root.tsx`: link manifest, apple-touch-icon, theme-color, apple-mobile-web-app-capable, apple-mobile-web-app-title.
- مكوّن `InstallPrompt.tsx` يستمع لـ `beforeinstallprompt` ويعرض زر "تثبيت التطبيق" + تعليمات iOS (Add to Home Screen).
- **بدون service worker** (لا offline، لا vite-plugin-pwa) — حسب توجيه PWA skill.

### 3) لوحة إدارة محمية برمز 6969

- صفحة `/admin` تطلب كلمة المرور `6969` فقط (بدون اسم مستخدم).
- حفظ token بسيط في `sessionStorage` بعد الإدخال الصحيح.
- حماية `/admin/*` بالتحقق من الـ token (client-side gate كافٍ لأن كل عمليات الكتابة الفعلية محمية في الـ server functions بـ secret منفصل).
- إضافة `ADMIN_PASSCODE=6969` كـ secret على السيرفر، وكل server fn حساس يطلب الـ passcode في الـ payload ويتحقق منه.
- صفحات الإدارة: المزامنة (الرابط الحالي + زر مزامنة)، الفيديوهات (قائمة)، نشاط المستخدمين (آخر الجلسات + ما يشاهدون)، الشات بوت (سجل المحادثات).

### 4) استيراد كامل لكل الفيديوهات من Google Drive (10,000+)

المشكلة الحالية: scraping للصفحة العامة يعيد ~200 فقط.

الحل: استخدام **Google Drive API v3** بـ API Key عام مع pagination:
- طلب من المستخدم إدخال `GOOGLE_API_KEY` (مفتاح public للقراءة فقط، يحصل عليه من Google Cloud Console).
- استدعاء `https://www.googleapis.com/drive/v3/files?q='<folderId>'+in+parents&pageSize=1000&pageToken=...&fields=files(id,name,mimeType,size,thumbnailLink,videoMediaMetadata),nextPageToken` في حلقة حتى انتهاء `nextPageToken`.
- **حفظ رابط المجلد والـ folder_id في جدول `folders`** (موجود أصلاً لكن غير مُستخدم بشكل صحيح بعد المزامنة) + تحديث `last_synced_at`.
- إدراج/تحديث الفيديوهات batched (upsert على `drive_file_id`).
- pg_cron الموجود يستدعي السيرفر كل 24 ساعة → يقرأ آخر folder من DB ويعيد المزامنة تلقائياً.

### 5) الصفحة الرئيسية (عامة، بدون تسجيل دخول)

- **سلايدر Hero** (carousel) في الأعلى: يعرض أول 8-10 فيديوهات مع تشغيل **تريلر تلقائي صامت** (iframe من Drive مع `autoplay=1&mute=1`) عند ظهور الشريحة، transitions كل 6 ثوان.
- **شبكة الفيديوهات** بـ thumbnails (من `thumbnailLink` الذي يعيده Drive API).
- **توليد لقطات تلقائية**: server fn يأخذ أول 4-5 لقطات من كل فيديو عبر `https://drive.google.com/thumbnail?id=<id>&sz=w800` بأحجام/أوقات مختلفة ويحفظها في `snapshots` (auto-generated flag).
- pagination/infinite scroll لأن عدد الفيديوهات كبير (10K+).
- بحث + فلترة.

### 6) صفحة المشاهدة محسّنة `/watch/$id`

- مشغل Drive iframe responsive مع نسبة 16:9، **إطار مخصص للهاتف** (max-h-[60vh] على الموبايل، مع controls واضحة أسفله).
- **تقسيم الفيديو إلى فصول/مقاطع**: عند فتح الفيديو لأول مرة، يستدعي server fn يستخدم Lovable AI (gemini-3-flash) لتوليد تقسيم زمني افتراضي بناء على المدة + اسم الفيديو (مثلاً 8-10 chapters مع عنوان ووصف لكل واحد ووقت بدء). يُحفظ في جدول جديد `video_chapters`.
- قائمة الفصول جانب المشغل، النقر يقفز للوقت.
- تتبع المشاهدة (موجود) + ربط `visitor_id` بكل جلسة لعرضها للأدمن.

### 7) شات بوت "ماريا" (يستبدل قسم الاهتمامات)

- زر floating في الزاوية + صفحة `/chat`.
- يستخدم **Lovable AI** (gemini-3-flash-preview) عبر edge function للـ streaming.
- System prompt: مساعدة عربية ودودة بلهجة عراقية تساعد المستخدم في تصفّح فيديوهات الموقع، تعرف عناوين الفيديوهات الموجودة (نمرر لها أحدث N عنوان كـ context)، تجيب على أسئلة عامة. **ضمن سياسات السلامة الافتراضية للنموذج** — لا تعديل/تجاوز للفلاتر.
- حفظ كل محادثة في جدول `chat_messages` مع `visitor_id` ليراها الأدمن.

### 8) رؤية الأدمن للنشاط

- صفحة `/admin/activity`: قائمة الزوار (`visitors`) مع آخر فيديو شاهدوه، مدة المشاهدة، آخر سؤال للشات بوت.
- صفحة `/admin/visitor/$id`: تاريخ المشاهدة الكامل + كل رسائل الشات.
- زر "حذف بيانات الزائر" يمسح كل interactions/sessions/chats للـ visitor.
- زر "حظر visitor_id" يضيفه لجدول `blocked_visitors`؛ الواجهة تتحقق وتمنعه من تشغيل الفيديوهات والشات.

### 9) جداول جديدة (migration)

- `video_chapters(id, video_id, start_seconds, end_seconds, title, description)`
- `chat_messages(id, visitor_id, role, content, created_at)`
- `blocked_visitors(visitor_id, blocked_at, reason)`
- تحديث RLS: قراءة عامة للـ chapters فقط؛ الباقي محمي.

### 10) إصلاحات سريعة ضمنية

- إصلاح hydration mismatch في `last_synced_at` (استخدام `suppressHydrationWarning` أو تأجيل format للـ client).
- إصلاح تشغيل التريلر (iframe preview بدلاً من `<video>` مباشر).

### ما هو خارج النطاق

- محتوى للبالغين / Adult content — لن تُبنى المنصة لاستضافة هذا النوع.
- شات بوت بدون فلتر / محتوى جنسي صريح — مخالف لسياسات السلامة، الشات بوت سيكون ودوداً ومساعداً ضمن السياسات الافتراضية.
- Offline mode — PWA installable فقط، بدون service worker (حسب توجيهات Lovable PWA).

### الأسرار المطلوبة

- `GOOGLE_API_KEY` — مفتاح Google Cloud (Drive API enabled) لقراءة المجلدات العامة بشكل كامل مع pagination.
- `ADMIN_PASSCODE` — قيمة `6969`.
- `LOVABLE_API_KEY` — موجود مسبقاً للشات بوت.

هل تعتمد الخطة لأبدأ التنفيذ؟
