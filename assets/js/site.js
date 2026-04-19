(function () {
  'use strict';

  // === Theme toggle (+ prefers-color-scheme fallback) ===
  var themeToggle = document.getElementById('theme-toggle');
  var themeColorMeta = document.getElementById('theme-color-meta');
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    if (themeColorMeta) themeColorMeta.content = t === 'light' ? '#f8f9fa' : '#0a0a0b';
  }
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme')
      || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }
  // If user hasn't chosen and system is light, apply it (dark is the document default)
  if (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: light)').matches) {
    applyTheme('light');
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
    });
  }
  // React to OS-level change while user hasn't explicitly chosen
  var mql = window.matchMedia('(prefers-color-scheme: light)');
  if (mql.addEventListener) {
    mql.addEventListener('change', function (e) {
      // Only auto-follow when the user hasn't locked a preference via click
      // (best-effort: localStorage is our only signal, and click writes to it)
      applyTheme(e.matches ? 'light' : 'dark');
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

  // === Logo fallback ===
  var logo = document.getElementById('site-logo');
  if (logo) {
    logo.addEventListener('error', function () { this.src = '/assets/icono.jpg'; }, { once: true });
  }

  // === Image lightbox ===
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
      // Clicks on the backdrop close; clicks on <img> also close (cursor: zoom-out)
      if (e.target === lb || e.target === lbi) hide();
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('active')) return;
      if (e.key === 'Escape') hide();
      else if (e.key === 'ArrowLeft') show(currentIdx < images.length - 1 ? currentIdx + 1 : 0);
      else if (e.key === 'ArrowRight') show(currentIdx > 0 ? currentIdx - 1 : images.length - 1);
    });
  }

  // === Back-to-top with progress ring + scrolled header ===
  var btt = document.getElementById('back-to-top-float');
  var siteHeader = document.querySelector('body > header');
  var bttProgress = document.querySelector('.btt-progress');
  var ringLen = 119.38;
  if (btt) btt.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // === Dynamic reading time (remaining minutes) ===
  // Use the real content container, not the whole <article> which includes comments/share.
  var readingTime = document.querySelector('.reading-time');
  var contentRoot = document.querySelector('article');
  var contentEndMarker = document.querySelector('.share-buttons, .post-tags, hr');
  var contentTop = 0, contentHeight = 0;
  function measureContent() {
    if (!contentRoot) return;
    var rect = contentRoot.getBoundingClientRect();
    contentTop = rect.top + window.scrollY;
    if (contentEndMarker) {
      var endRect = contentEndMarker.getBoundingClientRect();
      contentHeight = (endRect.top + window.scrollY) - contentTop;
    } else {
      contentHeight = contentRoot.scrollHeight;
    }
  }
  if (readingTime && contentRoot) {
    var totalMin = parseInt(readingTime.textContent, 10) || 1;
    measureContent();
    window.addEventListener('resize', measureContent, { passive: true });
    window.addEventListener('load', measureContent);
    var onScroll = function () {
      if (btt) btt.classList.toggle('visible', window.scrollY > 400);
      if (siteHeader) siteHeader.classList.toggle('scrolled', window.scrollY > 50);
      if (bttProgress) {
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        var prog = docH > 0 ? window.scrollY / docH : 0;
        bttProgress.style.strokeDashoffset = ringLen - (ringLen * prog);
      }
      if (contentHeight > 0) {
        var scrolled = Math.max(0, Math.min(contentHeight, window.scrollY - contentTop));
        var progress = scrolled / contentHeight;
        if (progress >= 0.98) readingTime.textContent = 'تمت القراءة';
        else {
          var remaining = Math.max(1, Math.ceil(totalMin * (1 - progress)));
          readingTime.textContent = remaining + ' دقائق متبقية';
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
  } else {
    // Pages without a reading time still need BTT + scrolled-header
    window.addEventListener('scroll', function () {
      if (btt) btt.classList.toggle('visible', window.scrollY > 400);
      if (siteHeader) siteHeader.classList.toggle('scrolled', window.scrollY > 50);
      if (bttProgress) {
        var docH = document.documentElement.scrollHeight - window.innerHeight;
        var prog = docH > 0 ? window.scrollY / docH : 0;
        bttProgress.style.strokeDashoffset = ringLen - (ringLen * prog);
      }
    }, { passive: true });
  }

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
