/**
 * ===================================================
 * ملف ui.js - إدارة واجهة المستخدم
 * ===================================================
 * هذا الملف مسؤول عن:
 * 1. تحديث عناصر HTML بالبيانات الجديدة
 * 2. إدارة الخلفيات الديناميكية
 * 3. إنشاء الجزيئات المتحركة (مطر، ثلج، نجوم)
 * 4. إدارة الرسوم المتحركة وتأثيرات الانتقال
 * 5. تحديث الوضع الليلي/النهاري
 * 6. الساعة الحية
 * 7. بطاقات التوقعات الساعية والأسبوعية
 * ===================================================
 */

const UI = {

  // ===================== حالة الواجهة =====================
  state: {
    isCelsius: true,          // وحدة الحرارة الحالية
    currentData: null,        // بيانات الطقس الحالية
    clockInterval: null,      // مؤقت الساعة الحية
    particlesInterval: null,  // مؤقت تحديث الجزيئات
    lastBgClass: '',          // آخر كلاس خلفية مطبق
  },

  /**
   * ===================== تهيئة واجهة المستخدم =====================
   * تُستدعى مرة واحدة عند بداية التطبيق
   */
  init() {
    // بدء الساعة الحية
    this.startLiveClock();
    console.log('🎨 تم تهيئة واجهة المستخدم');
  },

  /**
   * ===================== تحديث شاشة التحميل (Preloader) =====================
   * @param {number} progress - نسبة التقدم (0-100)
   * @param {string} message - رسالة التحميل
   */
  updatePreloader(progress, message) {
    const progressBar = document.getElementById('preloaderProgress');
    const percentText = document.getElementById('preloaderPercent');
    const subtitle = document.querySelector('.preloader-subtitle');

    if (progressBar) progressBar.style.width = `${progress}%`;
    if (percentText) percentText.textContent = `${progress}%`;
    if (subtitle && message) subtitle.textContent = message;
  },

  /**
   * ===================== إخفاء شاشة التحميل =====================
   * @param {Function} callback - دالة تُستدعى بعد الإخفاء
   */
  hidePreloader(callback) {
    const preloader = document.getElementById('preloader');
    const mainContent = document.getElementById('mainContent');

    if (preloader) {
      // إضافة كلاس الإخفاء
      preloader.classList.add('hide');

      // إظهار المحتوى الرئيسي
      if (mainContent) {
        mainContent.classList.remove('hidden');
        mainContent.style.animation = 'fadeIn 0.5s ease';
      }

      // إزالة الـ Preloader من DOM بعد انتهاء الانتقال
      setTimeout(() => {
        preloader.style.display = 'none';
        if (callback) callback();
      }, 800);
    }
  },

  /**
   * ===================== تحديث جميع بيانات الطقس =====================
   * الدالة الرئيسية التي تُحدث كل عناصر الواجهة
   *
   * @param {Object} data - بيانات WeatherAPI الكاملة
   * @param {boolean} isCelsius - استخدام السيليزيوس أم الفهرنهايت
   */
  updateWeatherDisplay(data, isCelsius = true) {
    // حفظ البيانات للاستخدام لاحقًا
    this.state.currentData = data;
    this.state.isCelsius = isCelsius;

    // استخراج البيانات الأساسية
    const { location, current, forecast } = data;
    const today = forecast.forecastday[0];

    // 1️⃣ تحديث معلومات الموقع
    this.updateLocationInfo(location);

    // 2️⃣ تحديث درجة الحرارة والحالة الجوية
    this.updateTemperature(current, today, isCelsius);

    // 3️⃣ تحديث أيقونة الطقس والخلفية
    this.updateWeatherIcon(current.condition.code, current.is_day);

    // 4️⃣ تحديث المؤشرات (رطوبة، رياح، ضغط)
    this.updateStats(current);

    // 5️⃣ تحديث معلومات الشروق والغروب
    this.updateSunTimes(today.astro, current);

    // 6️⃣ تحديث التوقعات الساعية
    this.updateHourlyForecast(today.hour, isCelsius);

    // 7️⃣ تحديث التوقعات اليومية
    this.updateDailyForecast(forecast.forecastday, isCelsius);

    // 8️⃣ تحديث نصيحة الطقس
    this.updateWeatherTip(current);

    // 9️⃣ تحديث جودة الهواء
    this.updateAirQuality(current.air_quality);

    // 🔟 تحديث الفلكيات
    this.updateAstroInfo(today.astro);

    // تحديث وقت آخر تحديث
    this.updateLastRefreshTime();

    // تطبيق تأثير ظهور سلس
    this.applyContentAnimation();

    console.log('✅ تم تحديث واجهة المستخدم بالكامل');
  },

  /**
   * ===================== تحديث معلومات الموقع =====================
   */
  updateLocationInfo(location) {
    const cityName = document.getElementById('cityName');
    const countryName = document.getElementById('countryName');

    if (cityName) {
      cityName.textContent = location.name;
      // تأثير ظهور النص
      cityName.style.animation = 'none';
      cityName.offsetHeight; // إعادة تشغيل الـ reflow
      cityName.style.animation = 'fadeInUp 0.4s ease';
    }

    if (countryName) {
      // عرض اسم المنطقة والدولة
      const region = location.region ? `${location.region}, ` : '';
      countryName.textContent = `${region}${location.country}`;
    }
  },

  /**
   * ===================== تحديث درجة الحرارة =====================
   */
  updateTemperature(current, today, isCelsius) {
    // القيم بالسيليزيوس والفهرنهايت
    const temp = isCelsius ? Math.round(current.temp_c) : Math.round(current.temp_f);
    const feelsLike = isCelsius ? Math.round(current.feelslike_c) : Math.round(current.feelslike_f);
    const high = isCelsius ? Math.round(today.day.maxtemp_c) : Math.round(today.day.maxtemp_f);
    const low = isCelsius ? Math.round(today.day.mintemp_c) : Math.round(today.day.mintemp_f);

    // الوحدة
    const unit = isCelsius ? '°C' : '°F';

    // تحديث العناصر
    this.setElementText('tempValue', temp);
    this.setElementText('feelsLike', feelsLike);
    this.setElementText('tempHigh', high);
    this.setElementText('tempLow', low);
    this.setElementText('weatherDesc', current.condition.text);

    // تحديث وحدة الحرارة في الواجهة
    const tempUnitEl = document.querySelector('.temp-unit');
    if (tempUnitEl) tempUnitEl.textContent = unit;

    // التساقط
    const precipMM = today.day.totalprecip_mm || 0;
    this.setElementText('precipitation', `${precipMM} مم`);

    // نقطة الندى
    const dewPoint = isCelsius ? current.dewpoint_c : current.dewpoint_f;
    this.setElementText('dewPoint', dewPoint ? `${Math.round(dewPoint)}°` : '--°');
  },

  /**
   * ===================== تحديث أيقونة الطقس والخلفية =====================
   */
  updateWeatherIcon(conditionCode, isDay) {
    // الحصول على معلومات الأيقونة من المساعدات
    const iconInfo = WeatherHelpers.getWeatherIcon(conditionCode, isDay === 1);

    // تحديث الأيقونة الرئيسية
    const mainIcon = document.getElementById('mainWeatherIcon');
    if (mainIcon) {
      mainIcon.className = `fas ${iconInfo.icon} weather-main-icon`;
      mainIcon.style.color = iconInfo.color;
      mainIcon.style.filter = `drop-shadow(0 8px 20px ${iconInfo.color}60)`;
    }

    // تحديث خلفية الصفحة
    this.updateBackground(iconInfo.bgClass, isDay === 1);

    // تشغيل جزيئات متحركة مناسبة للطقس
    this.updateParticles(iconInfo.bgClass, isDay === 1);
  },

  /**
   * ===================== تحديث خلفية الصفحة =====================
   */
  updateBackground(bgClass, isDay) {
    const weatherBg = document.getElementById('weatherBg');
    if (!weatherBg) return;

    // إزالة الكلاس القديم
    if (this.state.lastBgClass) {
      weatherBg.classList.remove(this.state.lastBgClass);
    }

    // إضافة الكلاس الجديد
    let finalClass = bgClass;

    // تعديل الخلفية حسب الوقت
    if (!isDay) {
      if (bgClass === 'sunny') finalClass = 'night-clear';
      else if (bgClass === 'partly-cloudy') finalClass = 'night';
      else if (!['stormy', 'rainy', 'snowy', 'foggy', 'cloudy'].includes(bgClass)) {
        finalClass = 'night';
      }
    }

    weatherBg.classList.add(finalClass);
    this.state.lastBgClass = finalClass;

    // تحديث ألوان الـ Overlay بناءً على وقت النهار
    const overlay = document.getElementById('bgOverlay');
    if (overlay) {
      overlay.style.background = isDay
        ? 'rgba(0, 0, 0, 0.15)'  // طبقة شفافة في النهار
        : 'rgba(0, 0, 0, 0.3)';  // طبقة أغمق في الليل
    }
  },

  /**
   * ===================== تحديث مؤشرات الطقس =====================
   */
  updateStats(current) {
    // الرطوبة
    const humidity = current.humidity;
    this.setElementText('humidity', `${humidity}%`);
    // تحديث شريط الرطوبة
    const humidityBar = document.getElementById('humidityBar');
    if (humidityBar) humidityBar.style.width = `${humidity}%`;

    // سرعة الرياح
    const windKph = Math.round(current.wind_kph);
    this.setElementText('windSpeed', `${windKph} كم/س`);
    // اتجاه الرياح
    const windDirText = WeatherHelpers.getWindDirection(current.wind_dir);
    this.setElementText('windDir', windDirText);
    // تحديث السهم
    const windArrow = document.getElementById('windArrow');
    if (windArrow) {
      const degree = WeatherHelpers.getWindArrowDegree(current.wind_dir);
      windArrow.style.transform = `rotate(${degree}deg)`;
    }

    // الضغط الجوي
    const pressure = current.pressure_mb;
    this.setElementText('pressure', `${pressure} hPa`);
    // حالة الضغط
    const pressureInfo = WeatherHelpers.getPressureStatus(pressure);
    const pressureStatus = document.getElementById('pressureStatus');
    if (pressureStatus) {
      pressureStatus.textContent = pressureInfo.label;
      pressureStatus.className = `pressure-status ${pressureInfo.class}`;
    }

    // الرؤية
    const visibility = current.vis_km;
    this.setElementText('visibility', `${visibility} كم`);

    // مؤشر UV
    const uv = current.uv;
    this.setElementText('uvIndex', uv);
    const uvInfo = WeatherHelpers.getUVLevel(uv);
    const uvLevel = document.getElementById('uvLevel');
    if (uvLevel) {
      uvLevel.textContent = uvInfo.label;
      uvLevel.className = `uv-level ${uvInfo.class}`;
    }

    // الغيوم
    const cloud = current.cloud;
    this.setElementText('cloudCover', `${cloud}%`);
  },

  /**
   * ===================== تحديث معلومات الشروق والغروب =====================
   */
  updateSunTimes(astro, current) {
    // وقت الشروق والغروب
    const sunriseFormatted = WeatherHelpers.formatTime(astro.sunrise);
    const sunsetFormatted = WeatherHelpers.formatTime(astro.sunset);

    this.setElementText('sunrise', sunriseFormatted);
    this.setElementText('sunset', sunsetFormatted);

    // حساب موقع الشمس على القوس
    const sunPosition = WeatherHelpers.getSunPosition(astro.sunrise, astro.sunset);
    const sunDot = document.getElementById('sunDot');
    if (sunDot) {
      // نحول النسبة إلى موقع على الشريط
      // في RTL: 0% = اليمين (الشروق) → 100% = اليسار (الغروب)
      sunDot.style.left = `${sunPosition}%`;
    }
  },

  /**
   * ===================== تحديث التوقعات الساعية =====================
   */
  updateHourlyForecast(hours, isCelsius) {
    const container = document.getElementById('hourlyContainer');
    if (!container) return;

    // مسح المحتوى القديم
    container.innerHTML = '';

    // الساعة الحالية
    const currentHour = new Date().getHours();

    // إنشاء بطاقة لكل ساعة
    hours.forEach((hour, index) => {
      // استخراج الساعة من التاريخ
      const hourDate = new Date(hour.time);
      const hourNum = hourDate.getHours();

      // درجة الحرارة حسب الوحدة
      const temp = isCelsius ? Math.round(hour.temp_c) : Math.round(hour.temp_f);

      // أيقونة الطقس
      const iconInfo = WeatherHelpers.getWeatherIcon(hour.condition.code, hour.is_day);

      // تنسيق الوقت
      const timeLabel = hourNum === 0 ? '12 ص' :
                        hourNum < 12 ? `${hourNum} ص` :
                        hourNum === 12 ? '12 م' :
                        `${hourNum - 12} م`;

      // إنشاء بطاقة الساعة
      const card = document.createElement('div');
      card.className = `hourly-card ${hourNum === currentHour ? 'current-hour' : ''}`;
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', `الساعة ${timeLabel}: ${temp}°`);

      card.innerHTML = `
        <span class="hourly-time">${hourNum === currentHour ? 'الآن' : timeLabel}</span>
        <span class="hourly-icon">${iconInfo.emoji}</span>
        <span class="hourly-temp">${temp}°</span>
        ${hour.chance_of_rain > 0 ? `
          <span class="hourly-precip">
            <i class="fas fa-droplet" aria-hidden="true"></i>
            ${hour.chance_of_rain}%
          </span>
        ` : ''}
      `;

      container.appendChild(card);
    });
  },

  /**
   * ===================== تحديث التوقعات اليومية =====================
   */
  updateDailyForecast(forecastDays, isCelsius) {
    const grid = document.getElementById('forecastGrid');
    if (!grid) return;

    // مسح المحتوى القديم
    grid.innerHTML = '';

    // اليوم الحالي للمقارنة
    const today = new Date().toDateString();

    forecastDays.forEach((day, index) => {
      const dayDate = new Date(day.date);
      const isToday = dayDate.toDateString() === today;

      // أسماء الأيام والتاريخ
      const dayName = isToday ? 'اليوم' : WeatherHelpers.getDayName(day.date);
      const dateFormatted = WeatherHelpers.formatDate(day.date);

      // درجات الحرارة
      const high = isCelsius ? Math.round(day.day.maxtemp_c) : Math.round(day.day.maxtemp_f);
      const low = isCelsius ? Math.round(day.day.mintemp_c) : Math.round(day.day.mintemp_f);

      // أيقونة الطقس
      const iconInfo = WeatherHelpers.getWeatherIcon(day.day.condition.code, true);

      // احتمالية المطر
      const rainChance = day.day.daily_chance_of_rain;

      // نسبة الشريط الحراري (نسبية)
      const tempRange = high - low;
      const barWidth = Math.max(20, Math.min(100, (tempRange / 20) * 100));

      // إنشاء بطاقة اليوم
      const card = document.createElement('div');
      card.className = `forecast-card ${isToday ? 'today' : ''}`;
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', `${dayName}: أعلى ${high}° أدنى ${low}°`);

      card.innerHTML = `
        <span class="forecast-day">${dayName}</span>
        <span class="forecast-date">${dateFormatted}</span>
        <span class="forecast-icon">${iconInfo.emoji}</span>
        <span class="forecast-desc">${day.day.condition.text}</span>
        <div class="forecast-temps">
          <span class="forecast-high">${high}°</span>
          <div class="forecast-temp-bar">
            <div class="forecast-temp-bar-fill" style="width: ${barWidth}%"></div>
          </div>
          <span class="forecast-low">${low}°</span>
        </div>
        ${rainChance > 0 ? `
          <span class="forecast-rain-chance">
            <i class="fas fa-droplet" aria-hidden="true"></i>
            ${rainChance}%
          </span>
        ` : ''}
      `;

      grid.appendChild(card);
    });
  },

  /**
   * ===================== تحديث نصيحة الطقس =====================
   */
  updateWeatherTip(current) {
    const tipText = document.getElementById('tipText');
    const tipIcon = document.getElementById('tipIcon');

    const tip = WeatherHelpers.getWeatherTip(
      current.condition.code,
      current.temp_c,
      current.humidity,
      current.uv
    );

    if (tipText) {
      tipText.textContent = tip.tip;
      tipText.style.animation = 'none';
      tipText.offsetHeight;
      tipText.style.animation = 'fadeIn 0.5s ease';
    }
    if (tipIcon) tipIcon.textContent = tip.emoji;
  },

  /**
   * ===================== تحديث جودة الهواء =====================
   */
  updateAirQuality(airQuality) {
    const aqValue = document.getElementById('aqValue');
    const aqLabel = document.getElementById('aqLabel');
    const aqBar = document.getElementById('aqBar');

    if (!airQuality) {
      // إذا لم تكن بيانات جودة الهواء متاحة
      if (aqValue) aqValue.textContent = '--';
      if (aqLabel) aqLabel.textContent = 'غير متاح';
      return;
    }

    // WeatherAPI يوفر مؤشر US EPA (1-6)
    const aqiValue = airQuality['us-epa-index'];
    const aqInfo = WeatherHelpers.getAirQuality(aqiValue);

    if (aqValue) {
      aqValue.textContent = aqiValue || '--';
      aqValue.style.color = aqInfo.color;
    }
    if (aqLabel) aqLabel.textContent = aqInfo.label;
    if (aqBar) {
      aqBar.style.width = `${aqInfo.percentage}%`;
      aqBar.style.background = `linear-gradient(90deg, #10b981, ${aqInfo.color})`;
    }
  },

  /**
   * ===================== تحديث معلومات الفلكيات =====================
   */
  updateAstroInfo(astro) {
    // طلوع وغروب القمر
    const moonriseTime = WeatherHelpers.formatTime(astro.moonrise);
    const moonsetTime = WeatherHelpers.formatTime(astro.moonset);

    this.setElementText('moonrise', moonriseTime);
    this.setElementText('moonset', moonsetTime);

    // طور القمر
    const moonPhaseInfo = WeatherHelpers.getMoonPhase(astro.moon_phase);
    this.setElementText('moonPhase', moonPhaseInfo.name);
    this.setElementText('moonPhaseIcon', moonPhaseInfo.emoji);
  },

  /**
   * ===================== تحديث وقت آخر تحديث =====================
   */
  updateLastRefreshTime() {
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit'
      });
      lastUpdate.textContent = timeStr;
    }
  },

  /**
   * ===================== تحديث الجزيئات المتحركة =====================
   * تنشئ تأثيرات بصرية مختلفة حسب حالة الطقس
   *
   * @param {string} bgClass - نوع الطقس
   * @param {boolean} isDay - هل هو نهار؟
   */
  updateParticles(bgClass, isDay) {
    const particlesContainer = document.getElementById('bgParticles');
    if (!particlesContainer) return;

    // مسح الجزيئات القديمة
    particlesContainer.innerHTML = '';

    // تأخير لإعطاء انتقال سلس
    setTimeout(() => {
      switch (bgClass) {
        case 'rainy':
        case 'stormy':
          // إنشاء قطرات مطر
          this.createRainParticles(particlesContainer, bgClass === 'stormy' ? 60 : 40);
          if (bgClass === 'stormy') {
            // إضافة تأثير البرق
            const lightning = document.createElement('div');
            lightning.className = 'lightning-flash';
            particlesContainer.appendChild(lightning);
          }
          break;

        case 'snowy':
          // إنشاء جزيئات ثلج
          this.createSnowParticles(particlesContainer, 30);
          break;

        case 'night-clear':
        case 'night':
          // إنشاء نجوم
          this.createStarParticles(particlesContainer, 60);
          break;

        case 'cloudy':
        case 'partly-cloudy':
        case 'foggy':
          // إنشاء غيوم
          this.createCloudParticles(particlesContainer, 5);
          break;

        default:
          // لا جزيئات للطقس الصافي في النهار
          if (!isDay) {
            this.createStarParticles(particlesContainer, 40);
          }
          break;
      }
    }, 500);
  },

  /**
   * ===================== إنشاء جزيئات المطر =====================
   * @param {HTMLElement} container - حاوية الجزيئات
   * @param {number} count - عدد القطرات
   */
  createRainParticles(container, count) {
    for (let i = 0; i < count; i++) {
      const drop = document.createElement('div');
      drop.className = 'rain-particle';

      // خصائص عشوائية لكل قطرة
      const left = Math.random() * 100; // موقع أفقي عشوائي
      const duration = 0.5 + Math.random() * 0.8; // سرعة السقوط
      const delay = Math.random() * 2; // تأخير البداية
      const height = 15 + Math.random() * 25; // طول القطرة
      const opacity = 0.4 + Math.random() * 0.4; // الشفافية

      drop.style.cssText = `
        left: ${left}%;
        height: ${height}px;
        animation-duration: ${duration}s;
        animation-delay: -${delay}s;
        opacity: ${opacity};
        top: 0;
      `;

      container.appendChild(drop);
    }
  },

  /**
   * ===================== إنشاء جزيئات الثلج =====================
   * @param {HTMLElement} container - حاوية الجزيئات
   * @param {number} count - عدد قطع الثلج
   */
  createSnowParticles(container, count) {
    for (let i = 0; i < count; i++) {
      const flake = document.createElement('div');
      flake.className = 'snow-particle';

      // خصائص عشوائية
      const left = Math.random() * 100;
      const size = 3 + Math.random() * 6; // حجم قطعة الثلج
      const duration = 3 + Math.random() * 5; // سرعة السقوط البطيئة
      const delay = Math.random() * 5;

      flake.style.cssText = `
        left: ${left}%;
        width: ${size}px;
        height: ${size}px;
        animation-duration: ${duration}s;
        animation-delay: -${delay}s;
        top: 0;
      `;

      container.appendChild(flake);
    }
  },

  /**
   * ===================== إنشاء جزيئات النجوم =====================
   * @param {HTMLElement} container - حاوية الجزيئات
   * @param {number} count - عدد النجوم
   */
  createStarParticles(container, count) {
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'star-particle';

      // موقع وخصائص عشوائية
      const left = Math.random() * 100;
      const top = Math.random() * 80; // فقط في الجزء العلوي
      const size = 1 + Math.random() * 3; // حجم النجمة
      const duration = 1.5 + Math.random() * 3; // سرعة الوميض
      const delay = Math.random() * 3;

      star.style.cssText = `
        left: ${left}%;
        top: ${top}%;
        width: ${size}px;
        height: ${size}px;
        animation-duration: ${duration}s;
        animation-delay: -${delay}s;
      `;

      container.appendChild(star);
    }
  },

  /**
   * ===================== إنشاء جزيئات الغيوم =====================
   * @param {HTMLElement} container - حاوية الجزيئات
   * @param {number} count - عدد الغيوم
   */
  createCloudParticles(container, count) {
    for (let i = 0; i < count; i++) {
      const cloud = document.createElement('div');
      cloud.className = 'cloud-particle';

      // خصائص عشوائية
      const top = 10 + Math.random() * 50;
      const width = 150 + Math.random() * 200;
      const height = 60 + Math.random() * 60;
      const duration = 25 + Math.random() * 40; // بطيء جدًا
      const delay = Math.random() * 20;

      cloud.style.cssText = `
        top: ${top}%;
        left: -${width}px;
        width: ${width}px;
        height: ${height}px;
        animation-duration: ${duration}s;
        animation-delay: -${delay}s;
      `;

      container.appendChild(cloud);
    }
  },

  /**
   * ===================== عرض رسالة الخطأ =====================
   * @param {string} title - عنوان الخطأ
   * @param {string} message - وصف الخطأ
   */
  showError(title, message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorTitle = document.getElementById('errorTitle');
    const errorDesc = document.getElementById('errorDesc');

    if (errorTitle) errorTitle.textContent = title;
    if (errorDesc) errorDesc.textContent = message;
    if (errorDiv) {
      errorDiv.classList.remove('hidden');
      // إخفاء تلقائي بعد 6 ثوانٍ
      setTimeout(() => this.hideError(), 6000);
    }
  },

  /**
   * ===================== إخفاء رسالة الخطأ =====================
   */
  hideError() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) errorDiv.classList.add('hidden');
  },

  /**
   * ===================== بدء الساعة الحية =====================
   * تُحدث الوقت والتاريخ كل ثانية
   */
  startLiveClock() {
    // تحديث فوري
    this.updateClock();

    // تحديث كل ثانية
    this.state.clockInterval = setInterval(() => {
      this.updateClock();
    }, 1000);
  },

  /**
   * ===================== تحديث الساعة =====================
   */
  updateClock() {
    const now = new Date();

    // تنسيق الوقت
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    // تحديث عرض الوقت
    const timeEl = document.getElementById('currentTime');
    if (timeEl) timeEl.textContent = `${hours}:${minutes}:${seconds}`;

    // تنسيق التاريخ بالعربي
    const dateOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    const dateStr = now.toLocaleDateString('ar-EG', dateOptions);
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = dateStr;
  },

  /**
   * ===================== تطبيق تأثيرات الظهور =====================
   * تُضيف تأثيرات ظهور للعناصر عند تحديث البيانات
   */
  applyContentAnimation() {
    const animatedElements = [
      '.weather-main-card',
      '.hourly-section',
      '.forecast-section',
      '.info-section'
    ];

    animatedElements.forEach((selector, index) => {
      const el = document.querySelector(selector);
      if (el) {
        el.style.animation = 'none';
        el.offsetHeight; // إعادة تشغيل
        el.style.animation = `fadeInUp 0.5s ease ${index * 0.1}s both`;
      }
    });
  },

  /**
   * ===================== تفعيل/إيقاف حالة التحميل =====================
   * @param {boolean} isLoading - هل يجري التحميل؟
   */
  setLoadingState(isLoading) {
    const searchBtn = document.getElementById('searchBtn');
    const locationBtn = document.getElementById('locationBtn');

    if (isLoading) {
      if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>جارٍ...</span>';
      }
      if (locationBtn) {
        locationBtn.disabled = true;
        locationBtn.classList.add('loading');
      }
    } else {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i> <span>بحث</span>';
      }
      if (locationBtn) {
        locationBtn.disabled = false;
        locationBtn.classList.remove('loading');
      }
    }
  },

  /**
   * ===================== دالة مساعدة لتعيين النص =====================
   * @param {string} id - معرف العنصر
   * @param {string|number} value - القيمة
   */
  setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? '--';
  },

  /**
   * ===================== إدارة مؤشر تمرير الصفحة =====================
   * تُحسب نسبة التمرير وتُحدث الدائرة حوله
   *
   * @param {number} scrollPercent - نسبة التمرير (0-100)
   */
  updateScrollProgress(scrollPercent) {
    const fill = document.getElementById('scrollProgressFill');
    if (!fill) return;

    // محيط الدائرة = 2 * π * r = 2 * 3.14159 * 16 ≈ 100.53
    const circumference = 100.53;
    const offset = circumference - (scrollPercent / 100) * circumference;
    fill.style.strokeDashoffset = offset;
  },

  /**
   * ===================== إظهار/إخفاء زر العودة للأعلى =====================
   * @param {boolean} show - إظهار أم إخفاء
   */
  toggleScrollTopBtn(show) {
    const btn = document.getElementById('scrollTopBtn');
    if (!btn) return;

    if (show) {
      btn.removeAttribute('hidden');
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
      setTimeout(() => {
        if (!btn.classList.contains('visible')) {
          btn.setAttribute('hidden', '');
        }
      }, 300);
    }
  },

  /**
   * ===================== إظهار/إخفاء قائمة الاقتراحات =====================
   * @param {Array} suggestions - مصفوفة الاقتراحات
   */
  showSuggestions(suggestions) {
    const list = document.getElementById('searchSuggestions');
    if (!list) return;

    // مسح الاقتراحات القديمة
    list.innerHTML = '';

    if (!suggestions || suggestions.length === 0) {
      list.style.display = 'none';
      return;
    }

    // إضافة كل اقتراح
    suggestions.forEach(suggestion => {
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      li.setAttribute('role', 'option');
      li.innerHTML = `
        <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
        <span>${suggestion.name}, ${suggestion.country}</span>
      `;

      // عند النقر على الاقتراح
      li.addEventListener('click', () => {
        const input = document.getElementById('citySearch');
        if (input) input.value = suggestion.name;
        list.style.display = 'none';
        // إطلاق حدث البحث
        document.dispatchEvent(new CustomEvent('searchCity', { detail: suggestion.name }));
      });

      list.appendChild(li);
    });

    list.style.display = 'block';
  },

  /**
   * ===================== إخفاء قائمة الاقتراحات =====================
   */
  hideSuggestions() {
    const list = document.getElementById('searchSuggestions');
    if (list) list.style.display = 'none';
  },

  /**
   * ===================== تنظيف الموارد =====================
   * تُستدعى عند إغلاق الصفحة
   */
  cleanup() {
    if (this.state.clockInterval) clearInterval(this.state.clockInterval);
    if (this.state.particlesInterval) clearInterval(this.state.particlesInterval);
  }
};
