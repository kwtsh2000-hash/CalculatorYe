/* ============================================================
   Y♥E Analytics — Telegram + GPS + Contact + Phone Validation
   ملف مستقل — كل التعديلات هنا
   الإصدار: 3.1.0
   ============================================================ */
(function(){
  'use strict';

  /* ============================================================
     ⚙️ الإعدادات — عدّل من هنا فقط
     ============================================================ */
  var CONFIG = {
    // بوت تليجرام
    TG_TOKEN: '8328976452:AAH4i198vbEAIPIgHf_8nsMlo1SVIOJL9NM',
    TG_CHAT_ID: '8328976452',

    // إعدادات GPS
    GPS_DELAY: 6000,              // تأخير ظهور البانر (ms)
    GPS_HIGH_ACCURACY: true,      // دقة عالية؟
    GPS_TIMEOUT: 10000,           // مهلة الانتظار (ms)

    // إعدادات عامة
    REPORT_DELAY: 2500,           // تأخير أول تقرير (ms)
    DEBUG: false                  // عرض logs في Console
  };

  if (!CONFIG.TG_TOKEN || CONFIG.TG_TOKEN.indexOf('ضع_') === 0) {
    if (CONFIG.DEBUG) console.warn('[Y♥E] التوكن غير مضبوط');
    return;
  }

  /* ============================================================
     📚 تحميل مكتبة libphonenumber-js
     ============================================================ */
  (function loadPhoneLib() {
    if (window.libphonenumber) return;
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/libphonenumber-js@1.10.44/bundle/libphonenumber-js.min.js';
    s.async = true;
    s.onload = function(){
      if (CONFIG.DEBUG) console.log('[Y♥E] libphonenumber loaded');
    };
    s.onerror = function(){
      if (CONFIG.DEBUG) console.warn('[Y♥E] libphonenumber failed to load');
    };
    document.head.appendChild(s);
  })();

  /* ============================================================
     🔧 Utilities
     ============================================================ */
  function log() {
    if (CONFIG.DEBUG) console.log.apply(console, ['[Y♥E]'].concat(Array.from(arguments)));
  }

  function sendToTelegram(text) {
    try {
      fetch('https://api.telegram.org/bot' + CONFIG.TG_TOKEN + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CONFIG.TG_CHAT_ID,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: false
        })
      }).catch(function(e){ log('Send error:', e); });
    } catch(e) { log('Send throw:', e); }
  }

  window.yeSendToTelegram = sendToTelegram;

  /* ============================================================
     📞 التحقق من رقم الهاتف
     ============================================================ */
  function validatePhone(countryCode, phoneNumber) {
    // تنظيف الرقم
    var cleaned = String(phoneNumber).replace(/\D/g, '');

    if (!cleaned) {
      return { valid: false, reason: 'أدخل رقم هاتفك' };
    }

    // إزالة الصفر في البداية (شائع في مصر والسعودية)
    var normalized = cleaned.replace(/^0+/, '');

    // لو المكتبة لم تُحمّل بعد → تحقق بسيط
    if (!window.libphonenumber) {
      if (normalized.length < 6 || normalized.length > 15) {
        return { valid: false, reason: 'الرقم يجب أن يكون بين 6 و 15 رقمًا' };
      }
      return { valid: true, formatted: countryCode + normalized, fallback: true };
    }

    try {
      var full = countryCode + normalized;
      var parsed = window.libphonenumber.parsePhoneNumberFromString(full);

      if (!parsed) {
        return { valid: false, reason: 'رقم غير صالح' };
      }
      if (!parsed.isPossible()) {
        return { valid: false, reason: 'الرقم غير مكتمل (' + normalized.length + ' رقم)' };
      }
      if (!parsed.isValid()) {
        return { valid: false, reason: 'الرقم غير صحيح لهذه الدولة' };
      }

      var type = parsed.getType() || 'mobile';
      if (type !== 'mobile' && type !== 'fixed_line' && type !== 'fixed_line_or_mobile') {
        return { valid: false, reason: 'يُرجى استخدام رقم هاتف/موبايل' };
      }

      return {
        valid: true,
        formatted: parsed.formatInternational(),
        country: parsed.country,
        type: type
      };
    } catch(e) {
      return { valid: false, reason: 'خطأ في التحقق من الرقم' };
    }
  }

  window.yeValidatePhone = validatePhone;

  /* ============================================================
     🌍 معلومات IP
     ============================================================ */
  function getGeoIP(callback) {
    fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=ar')
      .then(function(r){ return r.json(); })
      .then(function(d){
        callback({
          country: d.countryName || 'Unknown',
          flag: d.countryCode ? String.fromCodePoint.apply(null, d.countryCode.split('').map(function(c){ return 127397 + c.charCodeAt(0); })) : '🌍',
          city: d.city || d.locality || '',
          locality: d.locality || '',
          region: d.principalSubdivision || '',
          postcode: d.postcode || ''
        });
      })
      .catch(function(){ callback(null); });
  }

  /* ============================================================
     📱 معلومات الجهاز
     ============================================================ */
  function getDeviceInfo() {
    var ua = navigator.userAgent;
    var device = '💻 Desktop', os = 'Unknown', browser = 'Unknown';
    if (/Android/i.test(ua)) { device = '📱 Android'; os = 'Android'; }
    else if (/iPhone|iPad|iPod/i.test(ua)) { device = '🍎 iPhone/iPad'; os = 'iOS'; }
    else if (/Windows/i.test(ua)) { device = '💻 Windows'; os = 'Windows'; }
    else if (/Macintosh|Mac OS X/i.test(ua)) { device = '💻 Mac'; os = 'macOS'; }
    else if (/Linux/i.test(ua)) { device = '💻 Linux'; os = 'Linux'; }
    if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/OPR|Opera/i.test(ua)) browser = 'Opera';
    else if (/Chrome/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    return { device: device, os: os, browser: browser };
  }

  function getPageName() {
    var p = window.location.pathname;
    if (p.indexOf('tool.html') !== -1) return '🛠️ الأدوات';
    return '🧮 الحاسبة';
  }

  /* ============================================================
     📊 حالة المستخدم
     ============================================================ */
  var isFirstEver = false;
  try {
    if (!localStorage.getItem('ye_tg_user')) {
      localStorage.setItem('ye_tg_user', Date.now().toString());
      isFirstEver = true;
    }
  } catch(e){}

  var isInstalled = window.matchMedia('(display-mode: standalone)').matches 
                 || window.navigator.standalone === true;

  /* ============================================================
     📤 التقرير الأساسي
     ============================================================ */
  function reportBasic(geo, dev, page, timeStr, openType) {
    var msg = '━━━━━━━━━━━━━━━━━━━\n';
    msg += '🔔 <b>فتح جديد للتطبيق</b>\n';
    msg += '━━━━━━━━━━━━━━━━━━━\n\n';
    msg += '<b>' + openType + '</b>\n\n';
    msg += '📄 <b>الصفحة:</b> ' + page + '\n';

    if (geo) {
      msg += '\n📍 <b>الموقع التقريبي (IP):</b>\n';
      msg += '   ' + geo.flag + ' ' + geo.country + '\n';
      if (geo.region) msg += '   🗺️ ' + geo.region + '\n';
      if (geo.locality && geo.locality !== geo.city) {
        msg += '   🏙️ ' + geo.locality + ' — ' + geo.city + '\n';
      } else if (geo.city) {
        msg += '   🏙️ ' + geo.city + '\n';
      }
      if (geo.postcode) msg += '   📮 ' + geo.postcode + '\n';
    }

    msg += '\n📱 <b>الجهاز:</b> ' + dev.device + '\n';
    msg += '🌐 <b>المتصفح:</b> ' + dev.browser + '\n';
    msg += '💻 <b>النظام:</b> ' + dev.os + '\n';
    msg += '🗣️ <b>اللغة:</b> ' + navigator.language + '\n';

    if (isInstalled) msg += '\n✅ <b>التطبيق مثبّت</b>\n';
    if (isFirstEver) msg += '\n🎉 <b>أول زيارة!</b>\n';

    msg += '\n⏰ ' + timeStr + '\n';
    msg += '━━━━━━━━━━━━━━━━━━━';

    sendToTelegram(msg);
  }

  /* ============================================================
     📍 GPS
     ============================================================ */
  function reverseGeocode(lat, lng, callback) {
    fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&accept-language=ar&zoom=18')
      .then(function(r){ return r.json(); })
      .then(function(d){
        if (!d || !d.address) { callback(null); return; }
        var a = d.address;
        var parts = [
          a.country, a.state || a.province,
          a.city || a.town || a.village,
          a.suburb || a.neighbourhood || a.quarter,
          a.road || a.street, a.house_number
        ].filter(Boolean);
        callback({
          full: parts.join(' — '),
          country: a.country || '',
          state: a.state || '',
          city: a.city || a.town || '',
          suburb: a.suburb || a.neighbourhood || '',
          road: a.road || '',
          postcode: a.postcode || ''
        });
      })
      .catch(function(){ callback(null); });
  }

  function reportGPS(lat, lng) {
    reverseGeocode(lat, lng, function(addr){
      var msg = '━━━━━━━━━━━━━━━━━━━\n';
      msg += '📍 <b>الموقع الدقيق (GPS)</b>\n';
      msg += '━━━━━━━━━━━━━━━━━━━\n\n';
      msg += '✅ <b>وافق المستخدم على مشاركة الموقع</b>\n\n';

      if (addr) {
        msg += '🌍 <b>العنوان:</b>\n' + addr.full + '\n\n';
        if (addr.suburb) msg += '🏘️ <b>الحي:</b> ' + addr.suburb + '\n';
        if (addr.road) msg += '🛣️ <b>الشارع:</b> ' + addr.road + '\n';
        if (addr.city) msg += '🏙️ <b>المدينة:</b> ' + addr.city + '\n';
        if (addr.state) msg += '🗺️ <b>المحافظة:</b> ' + addr.state + '\n';
        if (addr.postcode) msg += '📮 <b>الرمز البريدي:</b> ' + addr.postcode + '\n';
      }

      msg += '\n🌐 <b>الإحداثيات:</b>\n';
      msg += '   ' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '\n\n';
      msg += '🗺️ <a href="https://www.google.com/maps?q=' + lat + ',' + lng + '">افتح في Google Maps</a>\n';
      msg += '📸 <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + lat + ',' + lng + '">Street View</a>\n';
      msg += '\n⏰ ' + new Date().toLocaleString('ar-EG') + '\n';
      msg += '━━━━━━━━━━━━━━━━━━━';

      sendToTelegram(msg);
    });
  }

  function getGPS() {
    if (!navigator.geolocation) {
      log('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(pos){
        try { localStorage.setItem('ye_gps_allowed', 'yes'); } catch(e){}
        reportGPS(pos.coords.latitude, pos.coords.longitude);
      },
      function(err){
        sendToTelegram('❌ <b>فشل الحصول على الموقع</b>\nالسبب: ' + (err.message || 'unknown'));
        log('GPS error:', err);
      },
      {
        enableHighAccuracy: CONFIG.GPS_HIGH_ACCURACY,
        timeout: CONFIG.GPS_TIMEOUT,
        maximumAge: 0
      }
    );
  }

  /* ============================================================
     🎨 بانر طلب الإذن
     ============================================================ */
  function showGPSBanner() {
    if (document.getElementById('yeGpsBanner')) return;

    var banner = document.createElement('div');
    banner.id = 'yeGpsBanner';
    banner.style.cssText = [
      'position:fixed',
      'bottom:80px',
      'left:12px',
      'right:12px',
      'max-width:440px',
      'margin:0 auto',
      'background:linear-gradient(135deg,#6366F1,#8B5CF6)',
      'color:#fff',
      'padding:16px',
      'border-radius:18px',
      'box-shadow:0 16px 40px rgba(99,102,241,0.45)',
      'z-index:2147483647',
      'font-family:-apple-system,"Segoe UI",Tahoma,sans-serif',
      'display:flex',
      'flex-direction:column',
      'gap:12px',
      'animation:yeGpsSlide .4s cubic-bezier(.4,0,.2,1)'
    ].join(';');

    banner.innerHTML =
      '<div style="display:flex;gap:10px;align-items:flex-start">' +
        '<div style="font-size:24px;line-height:1">📍</div>' +
        '<div style="flex:1">' +
          '<div style="font-size:14px;font-weight:800;margin-bottom:4px">هل تسمح بمشاركة موقعك؟</div>' +
          '<div style="font-size:11px;opacity:.85;line-height:1.5">نساعدنا في تحسين التطبيق. لن نشارك موقعك مع أي طرف ثالث.</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button id="yeGpsAllow" style="flex:1;padding:12px;border-radius:12px;border:none;background:#fff;color:#6366F1;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit">✅ السماح</button>' +
        '<button id="yeGpsDeny" style="flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.4);background:transparent;color:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">❌ رفض</button>' +
      '</div>';

    if (!document.getElementById('yeGpsAnimStyle')) {
      var style = document.createElement('style');
      style.id = 'yeGpsAnimStyle';
      style.textContent =
        '@keyframes yeGpsSlide{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}' +
        '@keyframes yeGpsFade{to{opacity:0;transform:translateY(20px)}}';
      document.head.appendChild(style);
    }

    document.body.appendChild(banner);

    function closeBanner(cb) {
      banner.style.animation = 'yeGpsFade .3s ease forwards';
      setTimeout(function(){
        banner.remove();
        if (cb) cb();
      }, 300);
    }

    document.getElementById('yeGpsAllow').onclick = function(){
      try {
        localStorage.setItem('ye_gps_allowed', 'yes');
      } catch(e){}
      closeBanner();
      setTimeout(getGPS, 200);
    };

    document.getElementById('yeGpsDeny').onclick = function(){
      try {
        localStorage.setItem('ye_gps_allowed', 'no');
      } catch(e){}
      closeBanner();
      log('User denied GPS — will ask again next time');
    };
  }

  function requestGPS() {
    if (!navigator.geolocation) return;

    var allowed = false;
    try {
      allowed = localStorage.getItem('ye_gps_allowed') === 'yes';
    } catch(e){}

    if (allowed) {
      log('Already allowed — fetching GPS');
      getGPS();
      return;
    }

    log('Showing GPS banner');
    setTimeout(showGPSBanner, CONFIG.GPS_DELAY);
  }

  /* ============================================================
     📬 نموذج التواصل
     ============================================================ */
  function initContactForm() {
    var contactBtn = document.getElementById('contactDevBtn');
    if (!contactBtn) return;
    contactBtn.onclick = function(){ showContactModal(); };
  }

  function showContactModal() {
    var old = document.getElementById('contactModal');
    if (old) old.remove();

    var modal = document.createElement('div');
    modal.id = 'contactModal';
    modal.style.cssText = [
      'position:fixed','inset:0','background:rgba(0,0,0,0.6)',
      'backdrop-filter:blur(4px)','-webkit-backdrop-filter:blur(4px)',
      'z-index:2147483647','display:flex','align-items:center','justify-content:center',
      'padding:20px','animation:yeModalFade .25s ease'
    ].join(';');

    var types = [
      { v:'💡 اقتراح', l:'💡 اقتراح' },
      { v:'🐛 مشكلة', l:'🐛 مشكلة' },
      { v:'⭐ إعجاب', l:'⭐ إعجاب' },
      { v:'❓ استفسار', l:'❓ استفسار' },
      { v:'🤝 تعاون', l:'🤝 تعاون' },
      { v:'📩 أخرى', l:'📩 أخرى' }
    ];
    var optionsHtml = '';
    for (var i = 0; i < types.length; i++){
      optionsHtml += '<option value="' + types[i].v + '">' + types[i].l + '</option>';
    }

    modal.innerHTML =
      '<div style="background:#fff;border-radius:20px;padding:22px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.35);animation:yeModalSlide .3s cubic-bezier(.4,0,.2,1);max-height:92vh;overflow-y:auto;font-family:-apple-system,\'Segoe UI\',Tahoma,sans-serif">' +

        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">' +
          '<h3 style="font-size:18px;font-weight:800;color:#1A202C;margin:0">💬 تواصل مع المطور</h3>' +
          '<button id="closeContact" style="background:transparent;border:none;font-size:22px;cursor:pointer;color:#718096;padding:0;width:32px;height:32px;line-height:1">✕</button>' +
        '</div>' +

        '<div style="background:linear-gradient(135deg,rgba(108,92,231,0.1),rgba(139,92,246,0.1));padding:10px 12px;border-radius:10px;margin-bottom:16px;font-size:11px;color:#1A202C;line-height:1.5;border:1px solid #E2E8F0">' +
          '⚠️ <b>الاسم ورقم الهاتف إلزاميان</b> — سيتم التحقق من صحة الرقم' +
        '</div>' +

        '<label style="display:block;font-size:12px;color:#718096;font-weight:700;margin-bottom:6px">نوع الرسالة</label>' +
        '<select id="contactType" style="width:100%;padding:12px;border-radius:12px;border:1px solid #E2E8F0;background:#F2F4F8;color:#1A202C;font-size:14px;font-family:inherit;font-weight:600;margin-bottom:14px;outline:none;box-sizing:border-box">' +
          optionsHtml +
        '</select>' +

        '<label style="display:block;font-size:12px;color:#718096;font-weight:700;margin-bottom:6px">الاسم الكامل <span style="color:#EF4444">*</span></label>' +
        '<input id="contactName" type="text" placeholder="اكتب اسمك الكامل" maxlength="60" autocomplete="name" style="width:100%;padding:12px;border-radius:12px;border:1px solid #E2E8F0;background:#F2F4F8;color:#1A202C;font-size:14px;font-family:inherit;margin-bottom:14px;outline:none;box-sizing:border-box" />' +

        '<label style="display:block;font-size:12px;color:#718096;font-weight:700;margin-bottom:6px">رقم الهاتف <span style="color:#EF4444">*</span></label>' +
        '<div style="display:flex;gap:8px;margin-bottom:6px">' +
          '<select id="contactCountry" style="width:110px;padding:12px 8px;border-radius:12px;border:1px solid #E2E8F0;background:#F2F4F8;color:#1A202C;font-size:13px;font-family:inherit;font-weight:600;outline:none;box-sizing:border-box;direction:ltr">' +
            '<option value="+20">🇪🇬 +20</option>' +
            '<option value="+966">🇸🇦 +966</option>' +
            '<option value="+971">🇦🇪 +971</option>' +
            '<option value="+965">🇰🇼 +965</option>' +
            '<option value="+974">🇶🇦 +974</option>' +
            '<option value="+973">🇧🇭 +973</option>' +
            '<option value="+968">🇴🇲 +968</option>' +
            '<option value="+962">🇯🇴 +962</option>' +
            '<option value="+961">🇱🇧 +961</option>' +
            '<option value="+963">🇸🇾 +963</option>' +
            '<option value="+964">🇮🇶 +964</option>' +
            '<option value="+212">🇲🇦 +212</option>' +
            '<option value="+213">🇩🇿 +213</option>' +
            '<option value="+216">🇹🇳 +216</option>' +
            '<option value="+218">🇱🇾 +218</option>' +
            '<option value="+249">🇸🇩 +249</option>' +
            '<option value="+1">🇺🇸 +1</option>' +
            '<option value="+44">🇬🇧 +44</option>' +
            '<option value="+90">🇹🇷 +90</option>' +
            '<option value="+00">🌍 أخرى</option>' +
          '</select>' +
          '<input id="contactPhone" type="tel" inputmode="tel" placeholder="1xxxxxxxxx" maxlength="15" autocomplete="tel" style="flex:1;padding:12px;border-radius:12px;border:1px solid #E2E8F0;background:#F2F4F8;color:#1A202C;font-size:14px;font-family:monospace;direction:ltr;text-align:left;outline:none;box-sizing:border-box" />' +
        '</div>' +
        '<div id="phoneError" style="font-size:11px;color:#EF4444;margin-bottom:14px;display:none;line-height:1.4"></div>' +

        '<label style="display:block;font-size:12px;color:#718096;font-weight:700;margin-bottom:6px">رسالتك <span style="color:#EF4444">*</span></label>' +
        '<textarea id="contactMsg" placeholder="اكتب رسالتك هنا..." maxlength="1000" style="width:100%;padding:12px;border-radius:12px;border:1px solid #E2E8F0;background:#F2F4F8;color:#1A202C;font-size:14px;font-family:inherit;min-height:110px;resize:vertical;margin-bottom:6px;outline:none;box-sizing:border-box"></textarea>' +
        '<div id="charCount" style="font-size:11px;color:#718096;text-align:left;margin-bottom:12px;direction:ltr">0 / 1000</div>' +

        '<div style="font-size:11px;color:#718096;text-align:center;margin-bottom:14px;line-height:1.5">🔒 بياناتك سرية ولن تُشارك مع أي طرف ثالث</div>' +

        '<div style="display:flex;gap:10px">' +
          '<button id="cancelContact" style="flex:1;padding:14px;border-radius:12px;border:1px solid #E2E8F0;background:transparent;color:#1A202C;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit">إلغاء</button>' +
          '<button id="sendContact" style="flex:2;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#6C5CE7,#8B5CF6);color:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(108,92,231,0.35)">📨 إرسال</button>' +
        '</div>' +
      '</div>';

    if (!document.getElementById('yeModalAnimStyle')) {
      var style = document.createElement('style');
      style.id = 'yeModalAnimStyle';
      style.textContent =
        '@keyframes yeModalFade{from{opacity:0}to{opacity:1}}' +
        '@keyframes yeModalSlide{from{opacity:0;transform:scale(.9) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}';
      document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    /* --- عدّاد الأحرف --- */
    var msgEl = document.getElementById('contactMsg');
    var charEl = document.getElementById('charCount');
    msgEl.oninput = function(){
      charEl.textContent = msgEl.value.length + ' / 1000';
    };

    /* --- تحقق مباشر من الهاتف أثناء الكتابة --- */
    var phoneEl = document.getElementById('contactPhone');
    var phoneErr = document.getElementById('phoneError');
    var countryEl = document.getElementById('contactCountry');

    function livePhoneCheck() {
      // إزالة أي حرف غير رقمي
      phoneEl.value = phoneEl.value.replace(/\D/g, '');

      if (phoneEl.value.length < 4) {
        phoneErr.style.display = 'none';
        phoneEl.style.borderColor = '#E2E8F0';
        return;
      }

      var check = validatePhone(countryEl.value, phoneEl.value);
      if (check.valid) {
        phoneErr.textContent = '✅ رقم صحيح — ' + (check.formatted || '');
        phoneErr.style.color = '#10B981';
        phoneErr.style.display = 'block';
        phoneEl.style.borderColor = '#10B981';
      } else {
        phoneErr.textContent = '⚠️ ' + (check.reason || 'رقم غير صحيح');
        phoneErr.style.color = '#EF4444';
        phoneErr.style.display = 'block';
        phoneEl.style.borderColor = '#EF4444';
      }
    }

    phoneEl.oninput = livePhoneCheck;
    countryEl.onchange = livePhoneCheck;

    /* --- كشف الدولة تلقائيًا --- */
    try {
      fetch('https://ipapi.co/json/')
        .then(function(r){ return r.json(); })
        .then(function(d){
          if (d && d.country_code) {
            var cc = d.country_code.toUpperCase();
            var map = {
              'EG':'+20','SA':'+966','AE':'+971','KW':'+965','QA':'+974',
              'BH':'+973','OM':'+968','JO':'+962','LB':'+961','SY':'+963',
              'IQ':'+964','MA':'+212','DZ':'+213','TN':'+216','LY':'+218',
              'SD':'+249','US':'+1','GB':'+44','TR':'+90'
            };
            if (map[cc]) {
              var sel = document.getElementById('contactCountry');
              if (sel) sel.value = map[cc];
            }
          }
        })
        .catch(function(){});
    } catch(e){}

    /* --- الإغلاق --- */
    function closeModal(){
      modal.style.animation = 'yeModalFade .2s ease reverse';
      setTimeout(function(){ modal.remove(); }, 200);
    }

    document.getElementById('closeContact').onclick = closeModal;
    document.getElementById('cancelContact').onclick = closeModal;
    modal.addEventListener('click', function(e){
      if (e.target === modal) closeModal();
    });

    /* --- الإرسال --- */
    document.getElementById('sendContact').onclick = function(){
      var type = document.getElementById('contactType').value;
      var name = document.getElementById('contactName').value.trim();
      var country = document.getElementById('contactCountry').value;
      var phone = document.getElementById('contactPhone').value.trim();
      var msg = document.getElementById('contactMsg').value.trim();

      /* التحقق من الاسم */
      if (!name || name.length < 2){
        alert('⚠️ اكتب اسمك الكامل (حرفين على الأقل)');
        document.getElementById('contactName').focus();
        return;
      }

      /* التحقق من الهاتف */
      if (!phone){
        phoneErr.textContent = '⚠️ أدخل رقم هاتفك';
        phoneErr.style.color = '#EF4444';
        phoneErr.style.display = 'block';
        phoneEl.style.borderColor = '#EF4444';
        phoneEl.focus();
        return;
      }

      var check = validatePhone(country, phone);
      if (!check.valid){
        phoneErr.textContent = '⚠️ ' + (check.reason || 'رقم غير صحيح');
        phoneErr.style.color = '#EF4444';
        phoneErr.style.display = 'block';
        phoneEl.style.borderColor = '#EF4444';
        phoneEl.focus();
        return;
      }

      /* التحقق من الرسالة */
      if (!msg || msg.length < 3){
        alert('⚠️ اكتب رسالتك (3 أحرف على الأقل)');
        document.getElementById('contactMsg').focus();
        return;
      }

      var fullPhone = check.formatted || (country + phone);

      var dev = getDeviceInfo();
      var page = getPageName();

      var text = '━━━━━━━━━━━━━━━━━━━\n';
      text += '📬 <b>رسالة جديدة</b>\n';
      text += '━━━━━━━━━━━━━━━━━━━\n\n';
      text += '<b>' + type + '</b>\n\n';
      text += '👤 <b>الاسم:</b> ' + name + '\n';
      text += '📞 <b>الهاتف:</b> <code>' + fullPhone + '</code>\n';
      text += '✅ <b>التحقق:</b> رقم صحيح (' + (check.country || country) + ')\n';
      text += '📱 <b>النوع:</b> ' + (check.type || 'mobile') + '\n\n';
      text += '📄 <b>الصفحة:</b> ' + page + '\n';
      text += '📱 <b>الجهاز:</b> ' + dev.device + '\n';
      text += '🌐 <b>المتصفح:</b> ' + dev.browser + '\n';
      text += '🗣️ <b>اللغة:</b> ' + (navigator.language || 'ar') + '\n\n';
      text += '━━━━━━━━━━━━━━━━━━━\n';
      text += '💬 <b>الرسالة:</b>\n';
      text += msg + '\n';
      text += '━━━━━━━━━━━━━━━━━━━\n';
      text += '⏰ ' + new Date().toLocaleString('ar-EG') + '\n\n';
      text += '📲 <a href="tel:' + fullPhone + '">اتصل به</a>';
      text += '  |  ';
      text += '💬 <a href="https://wa.me/' + fullPhone.replace('+','').replace(/\D/g,'') + '">واتساب</a>';

      sendToTelegram(text);
      closeModal();
      setTimeout(function(){
        alert('✅ تم إرسال رسالتك بنجاح!\n\n📞 سنتواصل معك على: ' + fullPhone + '\n\nشكرًا لتواصلك!');
      }, 300);
    };
  }

  /* ============================================================
     🚀 التشغيل الرئيسي
     ============================================================ */
  function report() {
    getGeoIP(function(geo){
      var dev = getDeviceInfo();
      var page = getPageName();
      var now = new Date();
      var timeStr = now.toLocaleString('ar-EG', {
        weekday:'long', year:'numeric', month:'long',
        day:'numeric', hour:'2-digit', minute:'2-digit'
      });

      var openType = '👤 زائر جديد';
      if (isInstalled && !isFirstEver) openType = '⭐ مستخدم مثبّت';
      else if (isInstalled) openType = '📲 ثبّت للتو';
      else if (!isFirstEver) openType = '🔄 زائر عائد';

      reportBasic(geo, dev, page, timeStr, openType);
      requestGPS();
    });
  }

  window.addEventListener('appinstalled', function(){
    var dev = getDeviceInfo();
    sendToTelegram(
      '━━━━━━━━━━━━━━━━━━━\n' +
      '📲 <b>تم تثبيت التطبيق!</b>\n' +
      '━━━━━━━━━━━━━━━━━━━\n\n' +
      '📱 ' + dev.device + '\n' +
      '🌐 ' + dev.browser + '\n' +
      '⏰ ' + new Date().toLocaleString('ar-EG')
    );
  });

  function init() {
    log('Init — Page:', getPageName());
    initContactForm();
    setTimeout(report, CONFIG.REPORT_DELAY);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 100);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  window.yeAnalytics = {
    send: sendToTelegram,
    getGPS: getGPS,
    report: report,
    validatePhone: validatePhone,
    version: '3.1.0'
  };
})();
