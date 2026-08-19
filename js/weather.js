/**
 * ===================================================
 * طبقة الاتصال الآمنة - التعامل مع API الطقس
 * ===================================================
 * هذا الملف مسؤول عن:
 * 1. الاتصال بـ WeatherAPI.com عبر endpoint آمن على الخادم
 * 2. جلب بيانات الطقس الحالي والتوقعات
 * 3. جلب اقتراحات البحث التلقائي
 * 4. التعامل مع أخطاء الاتصال
 * 5. تخزين البيانات مؤقتًا (Cache) لتقليل طلبات API
 *
 * واجهة العميل لا تحتوي على أي مفتاح API مباشر
 * ===================================================
 */

// ===================== إعدادات API =====================
const WeatherAPI = {

  // طبقة البروكسي الآمنة على السيرفر
  // المفتاح يبقى داخل Environment Variable في API route
  PROXY_URL: '/api/weather',

  // لغة الاستجابة - 'ar' للعربية أو 'en' للإنجليزية
  // ملاحظة: بعض الخطط لا تدعم العربية بالكامل
  LANGUAGE: 'ar',

  // عدد أيام التوقعات (الحد الأقصى في الخطة المجانية هو 3، المدفوعة حتى 14)
  FORECAST_DAYS: 3,

  // مدة صلاحية الـ Cache بالملي ثانية (10 دقائق)
  CACHE_DURATION: 10 * 60 * 1000,

  // كائن لتخزين البيانات المؤقتة (Cache)
  // نخزن هنا لتجنب طلبات API متكررة لنفس المدينة
  cache: {},

  /**
   * ===================== جلب بيانات الطقس الكاملة =====================
   * تجمع هذه الدالة الطقس الحالي + التوقعات + الفلكيات في طلب واحد
   *
   * @param {string} query - اسم المدينة أو الإحداثيات (مثال: "Cairo" أو "30.0444,31.2357")
   * @returns {Promise<Object>} - بيانات الطقس الكاملة
   * @throws {Error} - رسالة خطأ إذا فشل الطلب
   */
  async getForecast(query) {
    try {
      // إنشاء مفتاح للكاش بناءً على المدينة
      const cacheKey = `forecast_${query.toLowerCase().trim()}`;

      // التحقق إذا كانت البيانات محفوظة مؤقتًا وصالحة
      if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < this.CACHE_DURATION) {
        console.log('📦 جاري استخدام البيانات المخزنة مؤقتًا لـ:', query);
        return this.cache[cacheKey].data;
      }

      // بناء URL الطلب
      // الطلب يمر عبر /api/weather حتى يظل مفتاح WeatherAPI مخفيًا
      // الأيام / جودة الهواء / التحذيرات يتم تمريرها للـ API route
      const url = `${this.PROXY_URL}?type=forecast&q=${encodeURIComponent(query)}&days=${this.FORECAST_DAYS}&aqi=yes&alerts=yes&lang=${this.LANGUAGE}`;

      console.log('🌐 جاري جلب بيانات الطقس لـ:', query);

      // إرسال الطلب
      const response = await fetch(url);

      // التحقق من نجاح الطلب
      if (!response.ok) {
        // معالجة أخطاء HTTP المختلفة
        const errorData = await response.json().catch(() => ({}));
        throw new Error(this.getErrorMessage(response.status, errorData));
      }

      // تحويل الاستجابة إلى JSON
      const data = await response.json();

      // حفظ البيانات في الكاش مع الطابع الزمني
      this.cache[cacheKey] = {
        data: data,
        timestamp: Date.now()
      };

      console.log('✅ تم جلب البيانات بنجاح:', data.location.name);
      return data;

    } catch (error) {
      // إعادة رمي الخطأ بعد تسجيله
      console.error('❌ خطأ في جلب بيانات الطقس:', error.message);
      throw error;
    }
  },

  /**
   * ===================== جلب اقتراحات البحث التلقائي =====================
   * يجلب قائمة بالمدن المطابقة للنص المدخل
   *
   * @param {string} query - النص المدخل في حقل البحث
   * @returns {Promise<Array>} - مصفوفة من المدن المقترحة
   */
  async getSearchSuggestions(query) {
    try {
      // لا نبحث إذا كان النص قصيرًا جدًا
      if (!query || query.trim().length < 2) return [];

      // بناء URL الاقتراحات عبر البروكسي الآمن
      const url = `${this.PROXY_URL}?type=search&q=${encodeURIComponent(query)}`;

      const response = await fetch(url);

      if (!response.ok) return [];

      const data = await response.json();
      return data || [];

    } catch (error) {
      console.error('❌ خطأ في جلب الاقتراحات:', error.message);
      return []; // نُرجع مصفوفة فارغة عند الخطأ
    }
  },

  /**
   * ===================== جلب الطقس بالإحداثيات الجغرافية =====================
   * يُستخدم مع Geolocation API للحصول على طقس الموقع الحالي
   *
   * @param {number} latitude - خط العرض
   * @param {number} longitude - خط الطول
   * @returns {Promise<Object>} - بيانات الطقس
   */
  async getWeatherByCoords(latitude, longitude) {
    // نستخدم الإحداثيات كاستعلام ويمر الطلب عبر البروكسي الآمن
    const query = `${latitude},${longitude}`;
    return this.getForecast(query);
  },

  /**
   * ===================== رسائل الخطأ بالعربي =====================
   * تُحول أكواد HTTP إلى رسائل خطأ واضحة للمستخدم
   *
   * @param {number} statusCode - كود HTTP
   * @param {Object} errorData - بيانات الخطأ من API
   * @returns {string} - رسالة الخطأ
   */
  getErrorMessage(statusCode, errorData) {
    // رسائل خاصة بكودات WeatherAPI (قد تصل من الـ proxy)
    const apiErrorCode = errorData?.error?.code;

    // أخطاء شائعة نعرضها بدون كشف أي تفاصيل حساسة
    const apiErrors = {
      1002: 'تعذر الاتصال بخدمة الطقس. تحقق من إعدادات الخادم',
      1003: 'يرجى إدخال اسم مدينة',
      1005: 'طلب غير صالح من خدمة الطقس',
      1006: '❌ لم يتم العثور على المدينة. جرب اسمًا مختلفًا',
      2006: 'خدمة الطقس غير مهيأة حاليًا',
      2007: 'تم تجاوز الحد الشهري لطلبات API المجانية',
      2008: 'خدمة الطقس غير متاحة حاليًا',
      9000: 'طلب JSON غير صالح'
    };

    if (apiErrorCode && apiErrors[apiErrorCode]) {
      return apiErrors[apiErrorCode];
    }

    // أخطاء HTTP العامة
    const httpErrors = {
      400: 'طلب غير صالح. يرجى التحقق من اسم المدينة',
      401: 'طبقة الاتصال غير صالح أو منتهي الصلاحية',
      403: 'وصول مرفوض. تحقق من صلاحيات طبقة الاتصال',
      404: 'المدينة غير موجودة. جرب اسمًا مختلفًا',
      429: 'تم تجاوز حد الطلبات. يرجى الانتظار قبل المحاولة مرة أخرى',
      500: 'خطأ في خوادم WeatherAPI. يرجى المحاولة لاحقًا',
      503: 'الخدمة غير متاحة حاليًا'
    };

    return httpErrors[statusCode] || `خطأ في الاتصال بـ API (كود: ${statusCode})`;
  },

  /**
   * ===================== مسح الكاش =====================
   * لتحديث البيانات يدويًا إذا أراد المستخدم ذلك
   */
  clearCache() {
    this.cache = {};
    console.log('🗑️ تم مسح الكاش');
  },

  /**
   * ===================== التحقق من تفعيل طبقة الأمان =====================
   * يتحقق إذا كانت طبقة الـ proxy مفعلة
   *
   * @returns {boolean}
   */
  isProxyConfigured() {
    return Boolean(this.PROXY_URL);
  }
};

/**
 * ===================== مساعدات الطقس =====================
 * دوال مساعدة لمعالجة وتحويل بيانات الطقس
 */
const WeatherHelpers = {

  /**
   * ===================== تحويل درجة الحرارة =====================
   * من سيليزيوس إلى فهرنهايت والعكس
   *
   * @param {number} value - القيمة
   * @param {string} from - 'C' أو 'F'
   * @returns {number} - القيمة المحولة
   */
  convertTemp(value, from = 'C') {
    if (from === 'C') {
      // سيليزيوس إلى فهرنهايت
      return Math.round((value * 9/5) + 32);
    } else {
      // فهرنهايت إلى سيليزيوس
      return Math.round((value - 32) * 5/9);
    }
  },

  /**
   * ===================== الحصول على أيقونة الطقس =====================
   * تُحول كود الحالة الجوية إلى أيقونة Font Awesome وعنوان لوني
   *
   * @param {number} code - كود حالة الطقس من WeatherAPI
   * @param {boolean} isDay - هل هو نهار؟
   * @returns {Object} - {icon, color, bgClass}
   */
  getWeatherIcon(code, isDay = true) {
    // جدول تحويل أكواد WeatherAPI إلى أيقونات
    // https://www.weatherapi.com/docs/weather_conditions.json
    const conditions = {
      // ☀️ صافي - Sunny/Clear
      1000: isDay
        ? { icon: 'fa-sun', color: '#fda085', bgClass: 'sunny', emoji: '☀️' }
        : { icon: 'fa-moon', color: '#a0a0c0', bgClass: 'night-clear', emoji: '🌙' },

      // ⛅ غيوم جزئية - Partly cloudy
      1003: isDay
        ? { icon: 'fa-cloud-sun', color: '#4facfe', bgClass: 'partly-cloudy', emoji: '⛅' }
        : { icon: 'fa-cloud-moon', color: '#7a8ef0', bgClass: 'night', emoji: '🌤️' },

      // ☁️ غائم - Cloudy
      1006: { icon: 'fa-cloud', color: '#8e9eab', bgClass: 'cloudy', emoji: '☁️' },
      1009: { icon: 'fa-clouds', color: '#8e9eab', bgClass: 'cloudy', emoji: '☁️' },

      // 🌫️ ضباب - Mist/Fog
      1030: { icon: 'fa-smog', color: '#c9d6df', bgClass: 'foggy', emoji: '🌫️' },
      1135: { icon: 'fa-smog', color: '#c9d6df', bgClass: 'foggy', emoji: '🌫️' },
      1147: { icon: 'fa-smog', color: '#c9d6df', bgClass: 'foggy', emoji: '🌫️' },

      // 🌧️ مطر خفيف - Patchy rain possible
      1063: { icon: 'fa-cloud-rain', color: '#4facfe', bgClass: 'rainy', emoji: '🌧️' },
      1150: { icon: 'fa-cloud-drizzle', color: '#4facfe', bgClass: 'rainy', emoji: '🌦️' },
      1153: { icon: 'fa-cloud-drizzle', color: '#4facfe', bgClass: 'rainy', emoji: '🌦️' },
      1168: { icon: 'fa-cloud-drizzle', color: '#4facfe', bgClass: 'rainy', emoji: '🌦️' },
      1180: { icon: 'fa-cloud-rain', color: '#4facfe', bgClass: 'rainy', emoji: '🌧️' },
      1183: { icon: 'fa-cloud-rain', color: '#4facfe', bgClass: 'rainy', emoji: '🌧️' },
      1186: { icon: 'fa-cloud-rain', color: '#4facfe', bgClass: 'rainy', emoji: '🌧️' },
      1189: { icon: 'fa-cloud-rain', color: '#4facfe', bgClass: 'rainy', emoji: '🌧️' },
      1192: { icon: 'fa-cloud-showers-heavy', color: '#1a1a2e', bgClass: 'rainy', emoji: '🌧️' },
      1195: { icon: 'fa-cloud-showers-heavy', color: '#1a1a2e', bgClass: 'rainy', emoji: '🌧️' },
      1240: { icon: 'fa-cloud-rain', color: '#4facfe', bgClass: 'rainy', emoji: '🌦️' },
      1243: { icon: 'fa-cloud-showers-heavy', color: '#1a1a2e', bgClass: 'rainy', emoji: '🌧️' },
      1246: { icon: 'fa-cloud-showers-heavy', color: '#1a1a2e', bgClass: 'rainy', emoji: '🌧️' },

      // ⛈️ عاصفة رعدية - Thunderstorm
      1087: { icon: 'fa-bolt', color: '#ffd700', bgClass: 'stormy', emoji: '⛈️' },
      1273: { icon: 'fa-cloud-bolt', color: '#ffd700', bgClass: 'stormy', emoji: '⛈️' },
      1276: { icon: 'fa-cloud-bolt', color: '#ffd700', bgClass: 'stormy', emoji: '⛈️' },
      1279: { icon: 'fa-cloud-bolt', color: '#ffd700', bgClass: 'stormy', emoji: '⛈️' },
      1282: { icon: 'fa-cloud-bolt', color: '#ffd700', bgClass: 'stormy', emoji: '⛈️' },

      // ❄️ ثلج - Snow
      1066: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1069: { icon: 'fa-cloud-sleet', color: '#dfe9f3', bgClass: 'snowy', emoji: '🌨️' },
      1072: { icon: 'fa-cloud-sleet', color: '#dfe9f3', bgClass: 'snowy', emoji: '🌨️' },
      1114: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1117: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1171: { icon: 'fa-cloud-sleet', color: '#dfe9f3', bgClass: 'snowy', emoji: '🌨️' },
      1204: { icon: 'fa-cloud-sleet', color: '#dfe9f3', bgClass: 'snowy', emoji: '🌨️' },
      1207: { icon: 'fa-cloud-sleet', color: '#dfe9f3', bgClass: 'snowy', emoji: '🌨️' },
      1210: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1213: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1216: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1219: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1222: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1225: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1237: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '🌨️' },
      1255: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1258: { icon: 'fa-snowflake', color: '#dfe9f3', bgClass: 'snowy', emoji: '❄️' },
      1261: { icon: 'fa-cloud-sleet', color: '#dfe9f3', bgClass: 'snowy', emoji: '🌨️' },
      1264: { icon: 'fa-cloud-sleet', color: '#dfe9f3', bgClass: 'snowy', emoji: '🌨️' },
    };

    // إذا لم يتطابق الكود، نرجع قيمة افتراضية
    return conditions[code] || {
      icon: 'fa-cloud-sun',
      color: '#4facfe',
      bgClass: 'partly-cloudy',
      emoji: '🌤️'
    };
  },

  /**
   * ===================== نصيحة الطقس =====================
   * تُعطي نصيحة مناسبة بناءً على حالة الطقس
   *
   * @param {number} code - كود الحالة الجوية
   * @param {number} temp - درجة الحرارة
   * @param {number} humidity - الرطوبة
   * @param {number} uvIndex - مؤشر UV
   * @returns {Object} - {tip, emoji}
   */
  getWeatherTip(code, temp, humidity, uvIndex) {
    // نصائح حسب الحالة الجوية
    if (code === 1000) {
      // طقس صافٍ
      if (uvIndex >= 8) {
        return { tip: '🕶️ مؤشر الأشعة فوق البنفسجية مرتفع جدًا! استخدم واقي الشمس وتجنب الخروج بين 10 صباحًا و4 مساءً', emoji: '☀️' };
      }
      if (temp > 35) {
        return { tip: '💧 الجو حار جدًا! اشرب الماء كثيرًا وتجنب التعرض المطول للشمس', emoji: '🥵' };
      }
      return { tip: '😊 طقس رائع اليوم! مناسب للنزهة والأنشطة الخارجية', emoji: '☀️' };
    }

    if ([1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(code)) {
      // مطر
      return { tip: '🌂 لا تنسَ مظلتك! الطقس ممطر اليوم. تجنب القيادة بسرعة على الطرق المبللة', emoji: '🌧️' };
    }

    if ([1087, 1273, 1276, 1279, 1282].includes(code)) {
      // عاصفة
      return { tip: '⚠️ عاصفة رعدية! ابقَ في المنزل وابتعد عن النوافذ والأماكن المكشوفة', emoji: '⛈️' };
    }

    if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225].includes(code)) {
      // ثلج
      return { tip: '🧤 الطقس ثلجي! ارتدِ ملابس دافئة وكن حذرًا على الطرق المتجمدة', emoji: '❄️' };
    }

    if ([1030, 1135, 1147].includes(code)) {
      // ضباب
      return { tip: '🌫️ رؤية محدودة بسبب الضباب. كن حذرًا أثناء القيادة وشغّل الأضواء', emoji: '🌫️' };
    }

    if (humidity > 80) {
      return { tip: '💧 رطوبة عالية! قد تشعر بحرارة أكثر من المعتاد. اشرب الماء بانتظام', emoji: '💧' };
    }

    if (temp < 5) {
      return { tip: '🧥 الجو بارد جدًا! ارتدِ طبقات من الملابس الدافئة واحمِ أطراف جسمك', emoji: '🥶' };
    }

    // نصيحة افتراضية
    return { tip: '🌤️ طقس لطيف! استمتع بيومك', emoji: '⛅' };
  },

  /**
   * ===================== تسمية مستوى UV =====================
   * @param {number} uv - مؤشر UV
   * @returns {Object} - {label, class}
   */
  getUVLevel(uv) {
    if (uv <= 2) return { label: 'منخفض', class: 'low' };
    if (uv <= 5) return { label: 'متوسط', class: 'moderate' };
    if (uv <= 7) return { label: 'مرتفع', class: 'high' };
    if (uv <= 10) return { label: 'شديد', class: 'high' };
    return { label: 'خطير', class: 'extreme' };
  },

  /**
   * ===================== تسمية الضغط الجوي =====================
   * @param {number} pressure - الضغط بـ hPa
   * @returns {Object} - {label, class}
   */
  getPressureStatus(pressure) {
    if (pressure < 1000) return { label: 'منخفض', class: 'low' };
    if (pressure > 1020) return { label: 'مرتفع', class: 'high' };
    return { label: 'طبيعي', class: 'normal' };
  },

  /**
   * ===================== تحويل اتجاه الرياح =====================
   * من درجات إلى اسم الاتجاه بالعربي
   *
   * @param {string} dir - اختصار الاتجاه (N, NE, E, SE...)
   * @returns {string} - الاتجاه بالعربي
   */
  getWindDirection(dir) {
    const directions = {
      'N': 'شمال', 'NNE': 'شمال شمال شرق', 'NE': 'شمال شرق',
      'ENE': 'شرق شمال شرق', 'E': 'شرق', 'ESE': 'شرق جنوب شرق',
      'SE': 'جنوب شرق', 'SSE': 'جنوب جنوب شرق', 'S': 'جنوب',
      'SSW': 'جنوب جنوب غرب', 'SW': 'جنوب غرب', 'WSW': 'غرب جنوب غرب',
      'W': 'غرب', 'WNW': 'غرب شمال غرب', 'NW': 'شمال غرب', 'NNW': 'شمال شمال غرب'
    };
    return directions[dir] || dir;
  },

  /**
   * ===================== الحصول على زاوية سهم الرياح =====================
   * @param {string} dir - اختصار الاتجاه
   * @returns {number} - الزاوية بالدرجات
   */
  getWindArrowDegree(dir) {
    const degrees = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    };
    return degrees[dir] || 0;
  },

  /**
   * ===================== تحويل اسم اليوم للعربي =====================
   * @param {string} dateStr - التاريخ (مثال: "2024-01-15")
   * @returns {string} - اسم اليوم بالعربي
   */
  getDayName(dateStr) {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  },

  /**
   * ===================== تنسيق التاريخ بالعربي =====================
   * @param {string} dateStr - التاريخ
   * @returns {string} - التاريخ المنسق
   */
  formatDate(dateStr) {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const date = new Date(dateStr);
    return `${date.getDate()} ${months[date.getMonth()]}`;
  },

  /**
   * ===================== تنسيق الوقت =====================
   * @param {string} timeStr - الوقت من API (مثال: "07:30 AM")
   * @returns {string} - الوقت المنسق بالعربي
   */
  formatTime(timeStr) {
    if (!timeStr) return '--:--';
    // تحويل من صيغة 12 ساعة إلى 24 ساعة
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  },

  /**
   * ===================== الحصول على طور القمر بالعربي =====================
   * @param {string} phase - طور القمر بالإنجليزي
   * @returns {Object} - {name, emoji}
   */
  getMoonPhase(phase) {
    const phases = {
      'New Moon': { name: 'محاق', emoji: '🌑' },
      'Waxing Crescent': { name: 'هلال متصاعد', emoji: '🌒' },
      'First Quarter': { name: 'تربيع أول', emoji: '🌓' },
      'Waxing Gibbous': { name: 'أحدب متصاعد', emoji: '🌔' },
      'Full Moon': { name: 'بدر', emoji: '🌕' },
      'Waning Gibbous': { name: 'أحدب متناقص', emoji: '🌖' },
      'Last Quarter': { name: 'تربيع أخير', emoji: '🌗' },
      'Waning Crescent': { name: 'هلال متناقص', emoji: '🌘' }
    };
    return phases[phase] || { name: phase || '--', emoji: '🌕' };
  },

  /**
   * ===================== تقييم جودة الهواء =====================
   * @param {number} aqi - مؤشر جودة الهواء (1-6 في WeatherAPI)
   * @returns {Object} - {label, color, percentage}
   */
  getAirQuality(aqi) {
    const levels = {
      1: { label: 'ممتاز 😊', color: '#10b981', percentage: 15 },
      2: { label: 'جيد 🙂', color: '#84fab0', percentage: 30 },
      3: { label: 'مقبول 😐', color: '#f59e0b', percentage: 50 },
      4: { label: 'غير صحي 😷', color: '#ef4444', percentage: 70 },
      5: { label: 'خطير ⚠️', color: '#991b1b', percentage: 85 },
      6: { label: 'شديد الخطورة ☠️', color: '#4c0519', percentage: 100 }
    };
    return levels[aqi] || { label: 'غير متاح', color: '#8888aa', percentage: 0 };
  },

  /**
   * ===================== حساب موقع الشمس =====================
   * يحسب نسبة موقع الشمس بين الشروق والغروب
   *
   * @param {string} sunriseStr - وقت الشروق
   * @param {string} sunsetStr - وقت الغروب
   * @returns {number} - نسبة من 0 إلى 100
   */
  getSunPosition(sunriseStr, sunsetStr) {
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // تحويل أوقات الشروق والغروب
      const sunriseTime = this.formatTime(sunriseStr);
      const sunsetTime = this.formatTime(sunsetStr);

      const [srH, srM] = sunriseTime.split(':').map(Number);
      const [ssH, ssM] = sunsetTime.split(':').map(Number);

      const sunriseMinutes = srH * 60 + srM;
      const sunsetMinutes = ssH * 60 + ssM;
      const totalDayMinutes = sunsetMinutes - sunriseMinutes;

      // إذا كان قبل الشروق أو بعد الغروب
      if (currentMinutes < sunriseMinutes) return 0;
      if (currentMinutes > sunsetMinutes) return 100;

      // حساب النسبة المئوية
      const elapsed = currentMinutes - sunriseMinutes;
      return Math.round((elapsed / totalDayMinutes) * 100);

    } catch {
      return 50; // قيمة وسط افتراضية
    }
  }
};
