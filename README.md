# 🌤️ SkyView Weather

تطبيق طقس متجاوب واحترافي مبني بـ HTML وCSS وVanilla JavaScript، ويستخدم WeatherAPI لعرض الطقس الحالي والتوقعات بالساعة والأيام القادمة، مع البحث عن المدن وتحديد الموقع الجغرافي وواجهة ديناميكية تتغير حسب حالة الطقس.

## ✨ أبرز المميزات

- 🔎 **بحث ذكي وتحديد الموقع** — البحث عن المدن مع اقتراحات واستخدام Geolocation.
- 🌡️ **بيانات طقس مفصلة** — الحرارة، الإحساس الحراري، الرطوبة، الرياح، الضغط، الرؤية، UV وجودة الهواء عند توفرها.
- 📅 **توقعات ساعية ويومية** — عرض التوقعات مع حالات الطقس والأيقونات وبيانات التساقط.
- 🎨 **واجهة ديناميكية ومتجاوبة** — خلفيات وحركات حسب حالة الطقس، Light/Dark behavior ودعم الجوال والتابلت والديسكتوب.

## 🔐 الأمان

الواجهة **لا تحتوي على WeatherAPI key**. المتصفح يرسل الطلب إلى:

```text
/api/weather
```

ثم تقوم **Cloudflare Pages Function** الموجودة في `functions/api/weather.js` باستدعاء WeatherAPI باستخدام السر المخزن في `context.env.WEATHER_API_KEY`.

كما تحتوي الـ Function على:

- تحقق من المدخلات وتحديد طول الاستعلام.
- Best-effort rate limiting لكل IP داخل بيئة التنفيذ.
- Cache قصير المدى لتقليل الطلبات المتكررة.
- Timeout لطلبات WeatherAPI.
- عدم إرسال المفتاح أو أي تفاصيل حساسة للمتصفح.

> ملاحظة: الـ rate limiting الموجود داخل الذاكرة يعمل كطبقة حماية خفيفة داخل كل Cloudflare isolate، وليس نظامًا مركزيًا مضمونًا للحماية من هجمات ضخمة. في مشروع أكبر يمكن إضافة Cloudflare Rate Limiting/WAF أو KV/Durable Objects.

لا تضع المفتاح الحقيقي داخل `js/` أو `index.html` أو GitHub.

## 🗂️ هيكل المشروع

```text
SkyView-Weather/
├── index.html
├── _routes.json
├── .gitignore
├── .env.example
├── .dev.vars.example
├── README.md
├── functions/
│   └── api/
│       └── weather.js      # Cloudflare Pages Function
├── js/
│   ├── app.js              # منطق التطبيق والأحداث
│   ├── ui.js               # تحديث الواجهة والحالات
│   └── weather.js          # استدعاء /api/weather + cache
└── css/
    ├── main.css
    ├── components.css
    ├── themes.css
    └── responsive.css
```

## 🚀 النشر على GitHub ثم Cloudflare Pages

### 1) GitHub

ارفع المشروع إلى Repository جديد **بدون أي ملف يحتوي على مفتاح حقيقي**.

المشروع Vanilla JS ولا يحتاج React أو Vite أو Build step.

### 2) Cloudflare Pages

اربط Repository الخاص بالمشروع من **Workers & Pages → Create application → Pages → Connect to Git**.

إعدادات البناء:

```text
Framework preset: None
Build command: exit 0
Build output directory: .
Root directory: /
```

مجلد `functions/` في جذر المشروع يحتوي على Pages Function، والـ route الناتج هو `/api/weather`.

### 3) إضافة WeatherAPI Secret

من إعدادات مشروع Cloudflare أضف Secret باسم:

```text
WEATHER_API_KEY
```

ضع فيه **مفتاح WeatherAPI الجديد** واختر التخزين المشفر.

لا تضع المفتاح في GitHub ولا في ملفات الواجهة.

### 4) Redeploy

بعد إضافة الـ Secret، أعد النشر.

## 🧪 التشغيل المحلي

اختياريًا، استخدم Wrangler/Cloudflare Pages dev لتجربة الـ Function محليًا.

أنشئ ملفًا محليًا اسمه `.dev.vars`:

```env
WEATHER_API_KEY=your_weatherapi_key_here
```

ثم شغّل بيئة التطوير من Cloudflare/Wrangler.

**لا ترفع `.dev.vars` إلى GitHub.**

## ⚙️ إعدادات WeatherAPI

عدد أيام التوقعات الافتراضي في `js/weather.js` مضبوط على:

```js
FORECAST_DAYS: 3
```

يمكن رفع الرقم إذا كانت خطة WeatherAPI الخاصة بك تدعم عدد أيام أكبر.

المفتاح **لا يجب** أن يوضع في `js/weather.js`.

## 📌 قبل النشر

- غيّر أي API key قديم تم نشره أو مشاركته سابقًا.
- تأكد أن `WEATHER_API_KEY` مضبوط في Cloudflare.
- لا تضف `.env` أو `.dev.vars` إلى Git.
- بعد أول Deploy اختبر `/api/weather` من الموقع نفسه.
- بعد حصولك على دومين نهائي، يمكنك إضافة canonical/OG URL يدويًا في `index.html`.

## 🌍 التقنيات

- HTML5
- CSS3
- Vanilla JavaScript
- WeatherAPI
- Geolocation API
- Cloudflare Pages Functions
- GitHub

## 📌 الوصف القصير

> تطبيق طقس متجاوب يعرض البيانات الحالية والتوقعات باستخدام WeatherAPI مع بنية Serverless آمنة.
