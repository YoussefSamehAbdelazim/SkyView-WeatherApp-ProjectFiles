// app - main logic

const AppState = {
  isDarkMode: false,           
  isCelsius: true,             
  isAutoTheme: true,           
  currentCity: '',             
  searchDebounceTimer: null,   
  autoRefreshInterval: null,   
  themeCheckInterval: null,    
};

async function initApp() {
  console.log('🚀 بدء تشغيل SkyView Weather...');

  UI.init();

  await runPreloader();
}

async function runPreloader() {

  UI.updatePreloader(10, '🔧 جارٍ إعداد التطبيق...');
  await sleep(200);

  setupAutoTheme();
  UI.updatePreloader(20, '🎨 جارٍ تطبيق الثيم...');
  await sleep(200);

  setupEventListeners();
  UI.updatePreloader(40, '⚡ جارٍ تحميل الوظائف...');
  await sleep(300);

  UI.updatePreloader(60, '📍 جارٍ تحديد موقعك...');

  try {

    const position = await getCurrentPosition();
    UI.updatePreloader(75, '🌍 جارٍ جلب بيانات طقسك...');
    await sleep(200);

    const data = await WeatherAPI.getWeatherByCoords(
      position.coords.latitude,
      position.coords.longitude
    );

    UI.updatePreloader(90, '✨ جارٍ تحديث الواجهة...');
    await sleep(300);

    UI.updateWeatherDisplay(data, AppState.isCelsius);
    AppState.currentCity = data.location.name;

  } catch (geoError) {

    console.warn('⚠️ لم يتم السماح بتحديد الموقع:', geoError.message);
    UI.updatePreloader(75, '🌍 جارٍ تحميل الطقس الافتراضي...');
    await sleep(200);

    try {

      const data = await WeatherAPI.getForecast('Cairo');
      UI.updatePreloader(90, '✨ جارٍ تحديث الواجهة...');
      await sleep(200);
      UI.updateWeatherDisplay(data, AppState.isCelsius);
      AppState.currentCity = data.location.name;
    } catch (apiError) {

      console.error('❌ خطأ في API:', apiError.message);
      UI.updatePreloader(90, '⚠️ يرجى البحث عن مدينة يدويًا...');
    }
  }

  UI.updatePreloader(100, '✅ جاهز!');
  await sleep(400);

  UI.hidePreloader(() => {

    startAutoRefresh();

    startThemeCheck();
    console.log('✅ التطبيق جاهز للاستخدام!');
  });
}

function setupEventListeners() {

  const searchInput = document.getElementById('citySearch');
  const searchBtn = document.getElementById('searchBtn');

  if (searchInput) {

    searchInput.addEventListener('input', handleSearchInput);

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        UI.hideSuggestions();
        handleSearch(searchInput.value.trim());
      }

      if (e.key === 'Escape') UI.hideSuggestions();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput?.value.trim();
      if (query) {
        UI.hideSuggestions();
        handleSearch(query);
      }
    });
  }

  document.addEventListener('searchCity', (e) => {
    handleSearch(e.detail);
  });

  const locationBtn = document.getElementById('locationBtn');
  if (locationBtn) {
    locationBtn.addEventListener('click', handleLocationRequest);
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {

      AppState.isAutoTheme = false;
      toggleTheme();
    });
  }

  const unitToggle = document.getElementById('unitToggle');
  if (unitToggle) {
    unitToggle.addEventListener('click', toggleTemperatureUnit);
  }

  const aboutToggle = document.getElementById('aboutToggle');
  const aboutModal = document.getElementById('aboutModal');
  const aboutClose = document.getElementById('aboutClose');
  const aboutBackdrop = document.getElementById('aboutBackdrop');

  function openAboutModal() {
    if (!aboutModal) return;
    aboutModal.classList.remove('hidden');
    document.body.classList.add('about-open');
    aboutClose?.focus();
  }

  function closeAboutModal() {
    if (!aboutModal) return;
    aboutModal.classList.add('hidden');
    document.body.classList.remove('about-open');
    aboutToggle?.focus();
  }

  if (aboutToggle) aboutToggle.addEventListener('click', openAboutModal);
  if (aboutClose) aboutClose.addEventListener('click', closeAboutModal);
  if (aboutBackdrop) aboutBackdrop.addEventListener('click', closeAboutModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aboutModal && !aboutModal.classList.contains('hidden')) {
      closeAboutModal();
    }
  });

  const errorClose = document.getElementById('errorClose');
  if (errorClose) {
    errorClose.addEventListener('click', () => UI.hideError());
  }

  const scrollTopBtn = document.getElementById('scrollTopBtn');
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

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

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input-group')) {
      UI.hideSuggestions();
    }
  });

  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
  }, { passive: true });

  setupTouchScroll();

  console.log('✅ تم تسجيل جميع الأحداث');
}

function handleSearchInput(e) {
  const query = e.target.value.trim();

  clearTimeout(AppState.searchDebounceTimer);

  if (query.length < 2) {
    UI.hideSuggestions();
    return;
  }

  AppState.searchDebounceTimer = setTimeout(async () => {
    try {
      const suggestions = await WeatherAPI.getSearchSuggestions(query);
      UI.showSuggestions(suggestions);
    } catch (error) {
      console.error('❌ خطأ في جلب الاقتراحات:', error);
    }
  }, 400);
}

async function handleSearch(city) {
  if (!city || city.trim() === '') {
    UI.showError('تنبيه', 'يرجى إدخال اسم مدينة للبحث');
    return;
  }

  UI.hideSuggestions();
  UI.hideError();
  UI.setLoadingState(true);

  try {
    console.log('🔍 البحث عن:', city);

    const data = await WeatherAPI.getForecast(city);

    UI.updateWeatherDisplay(data, AppState.isCelsius);
    AppState.currentCity = data.location.name;

    const searchInput = document.getElementById('citySearch');
    if (searchInput) searchInput.value = data.location.name;

    smoothScrollToCard();

  } catch (error) {
    console.error('❌ خطأ في البحث:', error.message);
    UI.showError('خطأ في البحث', error.message);
  } finally {

    UI.setLoadingState(false);
  }
}

async function handleLocationRequest() {
  UI.setLoadingState(true);
  UI.hideError();

  if (!navigator.geolocation) {
    UI.showError('غير مدعوم', 'متصفحك لا يدعم تحديد الموقع. جرب متصفحًا آخر');
    UI.setLoadingState(false);
    return;
  }

  try {
    console.log('📍 جارٍ تحديد الموقع...');

    const position = await getCurrentPosition();

    const data = await WeatherAPI.getWeatherByCoords(
      position.coords.latitude,
      position.coords.longitude
    );

    UI.updateWeatherDisplay(data, AppState.isCelsius);
    AppState.currentCity = data.location.name;

    const searchInput = document.getElementById('citySearch');
    if (searchInput) searchInput.value = data.location.name;

    smoothScrollToCard();

  } catch (error) {

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

function toggleTheme() {
  AppState.isDarkMode = !AppState.isDarkMode;

  const body = document.getElementById('body');
  const themeIcon = document.getElementById('themeIcon');

  if (AppState.isDarkMode) {

    body.className = 'theme-dark';
    if (themeIcon) themeIcon.className = 'fas fa-sun';
    localStorage.setItem('skyview_theme', 'dark');
  } else {

    body.className = 'theme-light';
    if (themeIcon) themeIcon.className = 'fas fa-moon';
    localStorage.setItem('skyview_theme', 'light');
  }

  console.log(`🌙 تم تغيير الثيم إلى: ${AppState.isDarkMode ? 'داكن' : 'فاتح'}`);
}

function setupAutoTheme() {

  const savedTheme = localStorage.getItem('skyview_theme');

  if (savedTheme) {

    AppState.isAutoTheme = false;
    AppState.isDarkMode = savedTheme === 'dark';
    applyTheme(AppState.isDarkMode);
    return;
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (prefersDark) {

    AppState.isDarkMode = true;
    applyTheme(true);
  } else {

    applyThemeByTime();
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (AppState.isAutoTheme) {
      AppState.isDarkMode = e.matches;
      applyTheme(e.matches);
    }
  });

  console.log(`🎨 الثيم التلقائي: ${AppState.isDarkMode ? 'داكن' : 'فاتح'}`);
}

function applyThemeByTime() {
  const hour = new Date().getHours();

  const isNight = hour >= 20 || hour < 6;

  AppState.isDarkMode = isNight;
  applyTheme(isNight);
}

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

function toggleTemperatureUnit() {
  AppState.isCelsius = !AppState.isCelsius;

  const unitText = document.getElementById('unitText');
  if (unitText) {
    unitText.textContent = AppState.isCelsius ? '°C' : '°F';

    unitText.style.animation = 'none';
    unitText.offsetHeight;
    unitText.style.animation = 'fadeInUp 0.3s ease';
  }

  if (UI.state.currentData) {
    UI.updateWeatherDisplay(UI.state.currentData, AppState.isCelsius);
  }

  console.log(`🌡️ وحدة الحرارة: ${AppState.isCelsius ? 'سيليزيوس' : 'فهرنهايت'}`);
}

function handleScroll() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;

  const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

  UI.toggleScrollTopBtn(scrollTop > 300);

  UI.updateScrollProgress(scrollPercent);
}

function startAutoRefresh() {

  if (AppState.autoRefreshInterval) clearInterval(AppState.autoRefreshInterval);

  AppState.autoRefreshInterval = setInterval(async () => {
    if (AppState.currentCity) {
      console.log('🔄 تحديث تلقائي للبيانات...');

      WeatherAPI.clearCache();

      try {
        const data = await WeatherAPI.getForecast(AppState.currentCity);
        UI.updateWeatherDisplay(data, AppState.isCelsius);
        console.log('✅ تم التحديث التلقائي');
      } catch (error) {
        console.error('❌ فشل التحديث التلقائي:', error.message);
      }
    }
  }, 10 * 60 * 1000); 
}

function startThemeCheck() {
  if (AppState.themeCheckInterval) clearInterval(AppState.themeCheckInterval);

  AppState.themeCheckInterval = setInterval(() => {
    if (AppState.isAutoTheme) {
      applyThemeByTime();
    }
  }, 60 * 1000); 
}

function smoothScrollToCard() {
  const card = document.querySelector('.weather-main-card');
  if (card) {

    setTimeout(() => {
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve, 
      reject,  
      {
        timeout: 10000,        
        enableHighAccuracy: true, 
        maximumAge: 300000     
      }
    );
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setupTouchScroll() {
  const container = document.getElementById('hourlyContainer');
  if (!container) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  container.addEventListener('mousedown', (e) => {
    isDown = true;
    container.style.cursor = 'grabbing';
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  container.addEventListener('mouseleave', () => {
    isDown = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mouseup', () => {
    isDown = false;
    container.style.cursor = 'grab';
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 2; 
    container.scrollLeft = scrollLeft - walk;
  });

  container.style.cursor = 'grab';
}

window.addEventListener('beforeunload', () => {

  if (AppState.autoRefreshInterval) clearInterval(AppState.autoRefreshInterval);
  if (AppState.themeCheckInterval) clearInterval(AppState.themeCheckInterval);

  UI.cleanup();
});

document.addEventListener('DOMContentLoaded', () => {

  if (!WeatherAPI.isProxyConfigured()) {
    console.warn('⚠️ طبقة الاتصال الآمنة غير مهيأة. تأكد من وجود api/weather.js');
  }

  initApp();
});

window.addEventListener('error', (e) => {
  console.error('❌ خطأ عام في التطبيق:', e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('❌ Promise مرفوضة:', e.reason);

  e.preventDefault();
});
