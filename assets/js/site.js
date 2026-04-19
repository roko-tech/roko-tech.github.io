(function () {
  'use strict';

  // === Theme toggle (with prefers-color-scheme + respect explicit choice) ===
  var themeToggle = document.getElementById('theme-toggle');
  var themeColorMeta = document.getElementById('theme-color-meta');
  var THEME_KEY = 'theme';

  function applyTheme(t, persist) {
    document.documentElement.setAttribute('data-theme', t);
    if (persist) localStorage.setItem(THEME_KEY, t);
    if (themeColorMeta) themeColorMeta.content = t === 'light' ? '#f8f9fa' : '#0a0a0b';
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'light' ? 'dark' : 'light', true);
    });
  }

  // Follow OS-level change ONLY when user hasn't explicitly chosen
  var mql = window.matchMedia('(prefers-color-scheme: light)');
  if (mql.addEventListener) {
    mql.addEventListener('change', function (e) {
      if (localStorage.getItem(THEME_KEY)) return;
      applyTheme(e.matches ? 'light' : 'dark', false);
    });
  }

  // === Mobile menu toggle ===
  var menuToggle = document.getElementById('menu-toggle');
  var mainNav = document.getElementById('main-nav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', function () {
      var open = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', open);
    });
  }

  // === Lazy load article images with shimmer ===
  document.querySelectorAll('article img:not([loading]):not(.icono)').forEach(function (img) {
    img.loading = 'lazy';
    img.decoding = 'async';
    if (!img.complete) {
      img.classList.add('img-loading');
      img.addEventListener('load', function () { img.classList.remove('img-loading'); }, { once: true });
      img.addEventListener('error', function () { img.classList.remove('img-loading'); }, { once: true });
    }
  });

  // === Copy button for code blocks ===
  document.querySelectorAll('pre').forEach(function (pre) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'نسخ';
    btn.setAttribute('aria-label', 'نسخ الكود');
    btn.addEventListener('click', function () {
      var done = function (ok) {
        btn.textContent = ok ? 'تم!' : 'خطأ';
        setTimeout(function () { btn.textContent = 'نسخ'; }, 2000);
      };
      var text = pre.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { done(document.execCommand('copy')); } catch (e) { done(false); }
        document.body.removeChild(ta);
      }
    });
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });

  // === Cursor glow + 3D tilt on post cards ===
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.post-card').forEach(function (card) {
    var glow = card.querySelector('.post-card-glow');
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (glow) { glow.style.left = x + 'px'; glow.style.top = y + 'px'; }
      if (!reducedMotion) {
        var rotY = ((x / r.width) - 0.5) * 6;
        var rotX = (0.5 - (y / r.height)) * 6;
        card.style.transform = 'perspective(800px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateY(-2px)';
      }
    });
    card.addEventListener('mouseleave', function () {
      if (!reducedMotion) card.style.transform = '';
    });
  });

  // === Logo fallback (in case local asset 404s) ===
  var logo = document.getElementById('site-logo');
  if (logo) {
    logo.addEventListener('error', function () { this.src = '/assets/icono.jpg'; }, { once: true });
  }

  // === Image lightbox with arrow-key navigation ===
  var lb = document.getElementById('lightbox');
  var lbi = document.getElementById('lightbox-img');
  if (lb && lbi) {
    var images = Array.prototype.slice.call(document.querySelectorAll('article img:not(.icono)'));
    var currentIdx = -1;
    var show = function (idx) {
      if (idx < 0 || idx >= images.length) return;
      currentIdx = idx;
      lbi.src = images[idx].src;
      lbi.alt = images[idx].alt || '';
      lb.classList.add('active');
    };
    var hide = function () { lb.classList.remove('active'); currentIdx = -1; };
    images.forEach(function (img, idx) { img.addEventListener('click', function () { show(idx); }); });
    lb.addEventListener('click', function (e) {
      // Backdrop or image click closes (cursor: zoom-out visually)
      if (e.target === lb || e.target === lbi) hide();
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('active')) return;
      if (e.key === 'Escape') hide();
      // RTL: ArrowLeft goes forward, ArrowRight goes backward
      else if (e.key === 'ArrowLeft') show(currentIdx < images.length - 1 ? currentIdx + 1 : 0);
      else if (e.key === 'ArrowRight') show(currentIdx > 0 ? currentIdx - 1 : images.length - 1);
    });
  }

  // === Arabic plural form for minutes ===
  // 0/11+ → دقيقة, 1 → دقيقة واحدة, 2 → دقيقتين, 3-10 → دقائق
  function arabicMinutes(n) {
    if (n === 1) return 'دقيقة';
    if (n === 2) return 'دقيقتين';
    if (n >= 3 && n <= 10) return 'دقائق';
    return 'دقيقة';
  }
  function formatRemaining(n) {
    if (n === 1) return 'دقيقة واحدة متبقية';
    if (n === 2) return 'دقيقتان متبقيتان';
    if (n >= 3 && n <= 10) return n + ' دقائق متبقية';
    return n + ' دقيقة متبقية';
  }

  // === Scroll-linked UI: BTT + scrolled-header + reading progress ===
  var btt = document.getElementById('back-to-top-float');
  var siteHeader = document.querySelector('body > header');
  var bttProgress = document.querySelector('.btt-progress');
  var ringLen = 119.38;
  if (btt) btt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  var readingTime = document.querySelector('.reading-time');
  var contentRoot = document.querySelector('article');
  // Use the element that marks the end of actual reading content (before share/giscus)
  var contentEndMarker = document.querySelector('.share-buttons, .post-tags, article hr');
  var contentTop = 0, contentHeight = 0;

  function measureContent() {
    if (!contentRoot) return;
    var rect = contentRoot.getBoundingClientRect();
    contentTop = rect.top + window.scrollY;
    if (contentEndMarker) {
      var endRect = contentEndMarker.getBoundingClientRect();
      contentHeight = Math.max(1, (endRect.top + window.scrollY) - contentTop);
    } else {
      contentHeight = contentRoot.scrollHeight;
    }
  }

  // Normalize the reading-time text once so the subsequent dynamic updates are consistent
  if (readingTime) {
    var rawMin = parseInt(readingTime.textContent, 10);
    if (!isNaN(rawMin)) {
      readingTime.textContent = rawMin === 1 ? 'دقيقة واحدة للقراءة'
        : rawMin === 2 ? 'دقيقتان للقراءة'
        : rawMin + ' ' + arabicMinutes(rawMin) + ' للقراءة';
    }
  }

  function onScroll() {
    var y = window.scrollY;
    if (btt) btt.classList.toggle('visible', y > 400);
    if (siteHeader) siteHeader.classList.toggle('scrolled', y > 50);

    var progress = 0;
    if (contentRoot && contentHeight > 0) {
      var scrolled = Math.max(0, Math.min(contentHeight, y - contentTop));
      progress = scrolled / contentHeight;
    } else {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      progress = docH > 0 ? y / docH : 0;
    }
    if (bttProgress) bttProgress.style.strokeDashoffset = ringLen - (ringLen * progress);

    if (readingTime && contentRoot && contentHeight > 0) {
      var totalMin = parseInt(readingTime.dataset.totalMin || '0', 10);
      if (totalMin > 0) {
        if (progress >= 0.98) readingTime.textContent = 'تمت القراءة';
        else {
          var remaining = Math.max(1, Math.ceil(totalMin * (1 - progress)));
          readingTime.textContent = formatRemaining(remaining);
        }
      }
    }
  }

  if (readingTime) {
    // Preserve the original total so onScroll can use it without parsing the live text
    var origTotal = parseInt(readingTime.textContent, 10);
    if (!isNaN(origTotal)) readingTime.dataset.totalMin = origTotal;
    measureContent();
    window.addEventListener('resize', measureContent, { passive: true });
    window.addEventListener('load', measureContent);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // === Heading & image fade-in on scroll ===
  if (!reducedMotion) {
    var fadeEls = document.querySelectorAll('article h2, article h3, article img:not(.icono)');
    if (fadeEls.length > 0) {
      fadeEls.forEach(function (el) { el.classList.add('fade-on-scroll'); });
      var fadeObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('visible'); fadeObs.unobserve(e.target); }
        });
      }, { threshold: 0.15 });
      fadeEls.forEach(function (el) { fadeObs.observe(el); });
    }
  }

  // === Register service worker ===
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }
})();
