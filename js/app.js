/**
 * ===================================================
 * ملف app.js - التطبيق الرئيسي
 * ===================================================
 * هذا الملف هو المحرك الرئيسي للتطبيق ويربط كل الأجزاء معًا:
 * 1. بدء تشغيل التطبيق وتهيئة الـ Preloader
 * 2. إدارة البحث وتحديد الموقع التلقائي
 * 3. التحكم في الوضع الليلي/النهاري التلقائي والمخصص
 * 4. إدارة زر العودة لرأس الصفحة
 * 5. التعامل مع أحداث المستخدم
 * 6. تحديث تلقائي للبيانات
 * ===================================================
 */

/**
 * ===================== حالة التطبيق العامة =====================
 * كائن يخزن كل الحالات الحالية للتطبيق
 */
const AppState = {
  isDarkMode: false,           // هل الوضع الداكن مفعل؟
  isCelsius: true,             // هل وحدة الحرارة سيليزيوس؟
  isAutoTheme: true,           // هل الثيم يتغير تلقائيًا حسب الوقت؟
  currentCity: '',             // المدينة الحالية
  searchDebounceTimer: null,   // مؤقت تأخير البحث
  autoRefreshInterval: null,   // مؤقت التحديث التلقائي
  themeCheckInterval: null,    // مؤقت فحص الثيم حسب الوقت
};

/**
 * ===================== بدء التطبيق =====================
 * تُستدعى فور تحميل الصفحة
 */
async function initApp() {
  console.log('🚀 بدء تشغيل SkyView Weather...');

  // تهيئة واجهة المستخدم
  UI.init();

  // بدء الـ Preloader بتأثيرات تقدمية
  await runPreloader();
}

/**
 * ===================== تشغيل شاشة التحميل =====================
 * تُنفذ مراحل التحميل بشكل تدريجي
 */
async function runPreloader() {
  // --- المرحلة 1: فحص المفتاح وإعداد الثيم (0% → 20%) ---
  UI.updatePreloader(10, '🔧 جارٍ إعداد التطبيق...');
  await sleep(200);

  // إعداد الثيم التلقائي حسب الوقت
  setupAutoTheme();
  UI.updatePreloader(20, '🎨 جارٍ تطبيق الثيم...');
  await sleep(200);

  // --- المرحلة 2: تهيئة الأحداث (20% → 40%) ---
  setupEventListeners();
  UI.updatePreloader(40, '⚡ جارٍ تحميل الوظائف...');
  await sleep(300);

  // --- المرحلة 3: محاولة تحديد الموقع (40% → 70%) ---
  UI.updatePreloader(60, '📍 جارٍ تحديد موقعك...');

  try {
    // محاولة الحصول على الموقع الحالي
    const position = await getCurrentPosition();
    UI.updatePreloader(75, '🌍 جارٍ جلب بيانات طقسك...');
    await sleep(200);

    // جلب الطقس بالإحداثيات
    const data = await WeatherAPI.getWeatherByCoords(
      position.coords.latitude,
      position.coords.longitude
    );

    UI.updatePreloader(90, '✨ جارٍ تحديث الواجهة...');
    await sleep(300);

    // تحديث الواجهة بالبيانات
    UI.updateWeatherDisplay(data, AppState.isCelsius);
    AppState.currentCity = data.location.name;

  } catch (geoError) {
    // إذا رفض المستخدم أو حدث خطأ في الموقع، نبدأ بمدينة افتراضية
    console.warn('⚠️ لم يتم السماح بتحديد الموقع:', geoError.message);
    UI.updatePreloader(75, '🌍 جارٍ تحميل الطقس الافتراضي...');
    await sleep(200);

    try {
      // مدينة افتراضية (القاهرة)
      const data = await WeatherAPI.getForecast('Cairo');
      UI.updatePreloader(90, '✨ جارٍ تحديث الواجهة...');
      await sleep(200);
      UI.updateWeatherDisplay(data, AppState.isCelsius);
      AppState.currentCity = data.location.name;
    } catch (apiError) {
      // إذا فشل كل شيء، نُخفي الـ Preloader ونظهر خطأ
      console.error('❌ خطأ في API:', apiError.message);
      UI.updatePreloader(90, '⚠️ يرجى البحث عن مدينة يدويًا...');
    }
  }

  // --- المرحلة 4: اكتمال التحميل (90% → 100%) ---
  UI.updatePreloader(100, '✅ جاهز!');
  await sleep(400);

  // إخفاء الـ Preloader وإظهار الصفحة الرئيسية
  UI.hidePreloader(() => {
    // تشغيل التحديث التلقائي كل 10 دقائق
    startAutoRefresh();
    // تشغيل فحص الثيم كل دقيقة
    startThemeCheck();
    console.log('✅ التطبيق جاهز للاستخدام!');
  });
}

/**
 * ===================== إعداد الأحداث (Event Listeners) =====================
 * يُسجل جميع أحداث المستخدم
 */
function setupEventListeners() {

  // --- حدث البحث بالنص ---
  const searchInput = document.getElementById('citySearch');
  const searchBtn = document.getElementById('searchBtn');

  if (searchInput) {
    // الكتابة في حقل البحث: الاقتراحات التلقائية
    searchInput.addEventListener('input', handleSearchInput);

    // ضغط Enter في حقل البحث
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        UI.hideSuggestions();
        handleSearch(searchInput.value.trim());
      }
      // إخفاء الاقتراحات عند الضغط على Escape
      if (e.key === 'Escape') UI.hideSuggestions();
    });
  }

  // زر البحث
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput?.value.trim();
      if (query) {
        UI.hideSuggestions();
        handleSearch(query);
      }
    });
  }

  // --- حدث البحث من الاقتراحات (Custom Event) ---
  document.addEventListener('searchCity', (e) => {
    handleSearch(e.detail);
  });

  // --- زر تحديد الموقع التلقائي ---
  const locationBtn = document.getElementById('locationBtn');
  if (locationBtn) {
    locationBtn.addEventListener('click', handleLocationRequest);
  }

  // --- زر تبديل الوضع الليلي/النهاري ---
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      // عند الضغط يدويًا، نوقف التحويل التلقائي
      AppState.isAutoTheme = false;
      toggleTheme();
    });
  }

  // --- زر تبديل وحدة الحرارة ---
  const unitToggle = document.getElementById('unitToggle');
  if (unitToggle) {
    unitToggle.addEventListener('click', toggleTemperatureUnit);
  }

  // --- زر إغلاق الخطأ ---
  const errorClose = document.getElementById('errorClose');
  if (errorClose) {
    errorClose.addEventListener('click', () => UI.hideError());
  }

  // --- زر العودة لرأس الصفحة ---
  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- حدث التمرير (scroll) ---
  window.addEventListener('scroll', handleScroll, { passive: true });

  // --- أزرار تمرير التوقعات الساعية ---
  const hourlyScrollLeft = document.getElementById('hourlyScrollLeft');
  const hourlyScrollRight = document.getElementById('hourlyScrollRight');
  const hourlyContainer = document.getElementById('hourlyContainer');

  if (hourlyScrollLeft && hourlyContainer) {
    hourlyScrollLeft.addEventListener('click', () => {
      hourlyContainer.scrollBy({ left: -200, behavior: 'smooth' });
    });
  }
  if (hourlyScrollRight && hourlyContainer) {
    hourlyScrollRight.addEventListener('click', () => {
      hourlyContainer.scrollBy({ left: 200, behavior: 'smooth' });
    });
  }

  // --- إغلاق الاقتراحات عند النقر خارجها ---
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input-group')) {
      UI.hideSuggestions();
    }
  });

  // --- شريط التنقل: إضافة كلاس عند التمرير ---
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
  }, { passive: true });

  // --- دعم المسح باللمس للبطاقات الساعية ---
  setupTouchScroll();

  console.log('✅ تم تسجيل جميع الأحداث');
}

/**
 * ===================== معالجة إدخال البحث =====================
 * يُعالج الكتابة في حقل البحث بتأخير لتقليل طلبات API
 */
function handleSearchInput(e) {
  const query = e.target.value.trim();

  // إلغاء المؤقت السابق (Debounce)
  clearTimeout(AppState.searchDebounceTimer);

  if (query.length < 2) {
    UI.hideSuggestions();
    return;
  }

  // انتظار 400ms بعد توقف الكتابة قبل الإرسال
  AppState.searchDebounceTimer = setTimeout(async () => {
    try {
      const suggestions = await WeatherAPI.getSearchSuggestions(query);
      UI.showSuggestions(suggestions);
    } catch (error) {
      console.error('❌ خطأ في جلب الاقتراحات:', error);
    }
  }, 400);
}

/**
 * ===================== معالجة البحث =====================
 * يُجري البحث عن مدينة ويُحدث الواجهة
 *
 * @param {string} city - اسم المدينة
 */
async function handleSearch(city) {
  if (!city || city.trim() === '') {
    UI.showError('تنبيه', 'يرجى إدخال اسم مدينة للبحث');
    return;
  }

  // إخفاء الاقتراحات والخطأ السابق
  UI.hideSuggestions();
  UI.hideError();
  UI.setLoadingState(true);

  try {
    console.log('🔍 البحث عن:', city);

    // جلب البيانات من API
    const data = await WeatherAPI.getForecast(city);

    // تحديث الواجهة
    UI.updateWeatherDisplay(data, AppState.isCelsius);
    AppState.currentCity = data.location.name;

    // تحديث حقل البحث باسم المدينة الصحيح
    const searchInput = document.getElementById('citySearch');
    if (searchInput) searchInput.value = data.location.name;

    // التمرير للبطاقة الرئيسية
    smoothScrollToCard();

  } catch (error) {
    console.error('❌ خطأ في البحث:', error.message);
    UI.showError('خطأ في البحث', error.message);
  } finally {
    // إنهاء حالة التحميل
    UI.setLoadingState(false);
  }
}

/**
 * ===================== معالجة طلب تحديد الموقع =====================
 * يستخدم Geolocation API للحصول على الموقع الحالي
 */
async function handleLocationRequest() {
  UI.setLoadingState(true);
  UI.hideError();

  // التحقق من دعم المتصفح لـ Geolocation
  if (!navigator.geolocation) {
    UI.showError('غير مدعوم', 'متصفحك لا يدعم تحديد الموقع. جرب متصفحًا آخر');
    UI.setLoadingState(false);
    return;
  }

  try {
    console.log('📍 جارٍ تحديد الموقع...');

    // طلب الإذن والحصول على الموقع
    const position = await getCurrentPosition();

    // جلب الطقس بالإحداثيات
    const data = await WeatherAPI.getWeatherByCoords(
      position.coords.latitude,
      position.coords.longitude
    );

    // تحديث الواجهة
    UI.updateWeatherDisplay(data, AppState.isCelsius);
    AppState.currentCity = data.location.name;

    // تحديث حقل البحث
    const searchInput = document.getElementById('citySearch');
    if (searchInput) searchInput.value = data.location.name;

    // التمرير للنتيجة
    smoothScrollToCard();

  } catch (error) {
    // أخطاء Geolocation المختلفة
    if (error.code === 1) {
      UI.showError('تم الرفض', 'يرجى السماح للموقع بالوصول إلى موقعك أو ابحث عن مدينة يدويًا');
    } else if (error.code === 2) {
      UI.showError('غير متاح', 'لا يمكن تحديد موقعك حاليًا. تحقق من إعدادات GPS');
    } else if (error.code === 3) {
      UI.showError('انتهى الوقت', 'استغرق تحديد الموقع وقتًا طويلًا. يرجى المحاولة مرة أخرى');
    } else {
      UI.showError('خطأ', error.message || 'حدث خطأ في تحديد الموقع');
    }
  } finally {
    UI.setLoadingState(false);
  }
}

/**
 * ===================== تبديل الوضع الليلي/النهاري =====================
 */
function toggleTheme() {
  AppState.isDarkMode = !AppState.isDarkMode;

  const body = document.getElementById('body');
  const themeIcon = document.getElementById('themeIcon');

  if (AppState.isDarkMode) {
    // تطبيق الوضع الداكن
    body.className = 'theme-dark';
    if (themeIcon) themeIcon.className = 'fas fa-sun';
    localStorage.setItem('skyview_theme', 'dark');
  } else {
    // تطبيق الوضع الفاتح
    body.className = 'theme-light';
    if (themeIcon) themeIcon.className = 'fas fa-moon';
    localStorage.setItem('skyview_theme', 'light');
  }

  console.log(`🌙 تم تغيير الثيم إلى: ${AppState.isDarkMode ? 'داكن' : 'فاتح'}`);
}

/**
 * ===================== إعداد الثيم التلقائي حسب الوقت =====================
 * يُفعّل الوضع الداكن تلقائيًا في الليل والنهاري في النهار
 */
function setupAutoTheme() {
  // التحقق أولًا من تفضيل المستخدم المحفوظ
  const savedTheme = localStorage.getItem('skyview_theme');

  if (savedTheme) {
    // تطبيق الثيم المحفوظ
    AppState.isAutoTheme = false;
    AppState.isDarkMode = savedTheme === 'dark';
    applyTheme(AppState.isDarkMode);
    return;
  }

  // التحقق من تفضيل النظام (Dark Mode System Preference)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (prefersDark) {
    // المستخدم يفضل الوضع الداكن في إعدادات نظامه
    AppState.isDarkMode = true;
    applyTheme(true);
  } else {
    // تطبيق الثيم حسب الوقت
    applyThemeByTime();
  }

  // الاستماع لتغيير تفضيل النظام
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (AppState.isAutoTheme) {
      AppState.isDarkMode = e.matches;
      applyTheme(e.matches);
    }
  });

  console.log(`🎨 الثيم التلقائي: ${AppState.isDarkMode ? 'داكن' : 'فاتح'}`);
}

/**
 * ===================== تطبيق الثيم حسب الوقت =====================
 * الليل (8 مساءً - 6 صباحًا): وضع داكن
 * النهار (6 صباحًا - 8 مساءً): وضع فاتح
 */
function applyThemeByTime() {
  const hour = new Date().getHours();

  // تحديد الوضع حسب الساعة
  // الليل من 8 مساءً (20) حتى 6 صباحًا (6)
  const isNight = hour >= 20 || hour < 6;

  AppState.isDarkMode = isNight;
  applyTheme(isNight);
}

/**
 * ===================== تطبيق الثيم =====================
 * @param {boolean} isDark - وضع داكن أم لا
 */
function applyTheme(isDark) {
  const body = document.getElementById('body');
  const themeIcon = document.getElementById('themeIcon');

  if (isDark) {
    body.className = 'theme-dark';
    if (themeIcon) themeIcon.className = 'fas fa-sun';
  } else {
    body.className = 'theme-light';
    if (themeIcon) themeIcon.className = 'fas fa-moon';
  }
}

/**
 * ===================== تبديل وحدة الحرارة =====================
 * يتبدل بين السيليزيوس والفهرنهايت
 */
function toggleTemperatureUnit() {
  AppState.isCelsius = !AppState.isCelsius;

  // تحديث نص الزر
  const unitText = document.getElementById('unitText');
  if (unitText) {
    unitText.textContent = AppState.isCelsius ? '°C' : '°F';
    // تأثير ظهور النص
    unitText.style.animation = 'none';
    unitText.offsetHeight;
    unitText.style.animation = 'fadeInUp 0.3s ease';
  }

  // إعادة عرض البيانات بالوحدة الجديدة (إذا كانت هناك بيانات)
  if (UI.state.currentData) {
    UI.updateWeatherDisplay(UI.state.currentData, AppState.isCelsius);
  }

  console.log(`🌡️ وحدة الحرارة: ${AppState.isCelsius ? 'سيليزيوس' : 'فهرنهايت'}`);
}

/**
 * ===================== معالجة حدث التمرير =====================
 * يُدير ظهور زر العودة للأعلى ومؤشر التقدم
 */
function handleScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;

  // نسبة التمرير (0-100)
  const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

  // إظهار/إخفاء زر العودة للأعلى
  // يظهر بعد التمرير 300px للأسفل
  UI.toggleScrollTopBtn(scrollTop > 300);

  // تحديث دائرة التقدم حول الزر
  UI.updateScrollProgress(scrollPercent);
}

/**
 * ===================== بدء التحديث التلقائي =====================
 * يُحدث البيانات كل 10 دقائق لضمان حداثتها
 */
function startAutoRefresh() {
  // مسح المؤقت القديم
  if (AppState.autoRefreshInterval) clearInterval(AppState.autoRefreshInterval);

  // التحديث كل 10 دقائق (600,000 مللي ثانية)
  AppState.autoRefreshInterval = setInterval(async () => {
    if (AppState.currentCity) {
      console.log('🔄 تحديث تلقائي للبيانات...');

      // مسح الكاش لجلب بيانات جديدة
      WeatherAPI.clearCache();

      try {
        const data = await WeatherAPI.getForecast(AppState.currentCity);
        UI.updateWeatherDisplay(data, AppState.isCelsius);
        console.log('✅ تم التحديث التلقائي');
      } catch (error) {
        console.error('❌ فشل التحديث التلقائي:', error.message);
      }
    }
  }, 10 * 60 * 1000); // 10 دقائق
}

/**
 * ===================== بدء فحص الثيم التلقائي =====================
 * يفحص الوقت كل دقيقة لتغيير الثيم تلقائيًا عند الفجر والغروب
 */
function startThemeCheck() {
  if (AppState.themeCheckInterval) clearInterval(AppState.themeCheckInterval);

  AppState.themeCheckInterval = setInterval(() => {
    if (AppState.isAutoTheme) {
      applyThemeByTime();
    }
  }, 60 * 1000); // كل دقيقة
}

/**
 * ===================== التمرير السلس لبطاقة الطقس =====================
 * يُمرر الصفحة للبطاقة الرئيسية بعد البحث
 */
function smoothScrollToCard() {
  const card = document.querySelector('.weather-main-card');
  if (card) {
    // تأخير بسيط لإعطاء وقت للأنيميشن
    setTimeout(() => {
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  }
}

/**
 * ===================== Promise لـ Geolocation =====================
 * يُحوّل واجهة Geolocation القائمة على Callbacks إلى Promise
 *
 * @returns {Promise<GeolocationPosition>}
 */
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve, // نجاح
      reject,  // فشل
      {
        timeout: 10000,        // انتهاء المهلة بعد 10 ثوانٍ
        enableHighAccuracy: true, // طلب دقة عالية
        maximumAge: 300000     // قبول موقع عمره 5 دقائق كحد أقصى
      }
    );
  });
}

/**
 * ===================== دالة الانتظار =====================
 * @param {number} ms - وقت الانتظار بالملي ثانية
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ===================== إعداد التمرير باللمس للبطاقات الساعية =====================
 * يُضيف دعم سحب اللمس للتمرير الأفقي
 */
function setupTouchScroll() {
  const container = document.getElementById('hourlyContainer');
  if (!container) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  // بداية اللمس
  container.addEventListener('mousedown', (e) => {
    isDown = true;
    container.style.cursor = 'grabbing';
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  // انتهاء اللمس
  container.addEventListener('mouseleave', () => {
    isDown = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mouseup', () => {
    isDown = false;
    container.style.cursor = 'grab';
  });

  // السحب
  container.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 2; // سرعة التمرير
    container.scrollLeft = scrollLeft - walk;
  });

  // تعيين الـ cursor
  container.style.cursor = 'grab';
}

/**
 * ===================== التنظيف عند إغلاق الصفحة =====================
 */
window.addEventListener('beforeunload', () => {
  // مسح المؤقتات
  if (AppState.autoRefreshInterval) clearInterval(AppState.autoRefreshInterval);
  if (AppState.themeCheckInterval) clearInterval(AppState.themeCheckInterval);

  // تنظيف واجهة المستخدم
  UI.cleanup();
});

/**
 * ===================== بدء التطبيق عند تحميل الصفحة =====================
 * ننتظر اكتمال تحميل DOM قبل البدء
 */
document.addEventListener('DOMContentLoaded', () => {
  // تحقق من تفعيل طبقة الاتصال الآمنة
  if (!WeatherAPI.isProxyConfigured()) {
    console.warn('⚠️ طبقة الاتصال الآمنة غير مهيأة. تأكد من وجود api/weather.js');
  }

  // بدء التطبيق
  initApp();
});

/**
 * ===================== معالجة الأخطاء العامة =====================
 * لاكتشاف وتسجيل أي أخطاء غير متوقعة
 */
window.addEventListener('error', (e) => {
  console.error('❌ خطأ عام في التطبيق:', e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('❌ Promise مرفوضة:', e.reason);
  // تجنب إيقاف التطبيق بسبب أخطاء الشبكة
  e.preventDefault();
});
