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

  // === Expose real header height as --header-h (editor reads it via calc()) ===
  var _header = document.querySelector('body > header');
  function updateHeaderVar() {
    if (!_header) return;
    document.documentElement.style.setProperty('--header-h', _header.offsetHeight + 'px');
  }
  updateHeaderVar();
  window.addEventListener('resize', updateHeaderVar, { passive: true });
  window.addEventListener('load', updateHeaderVar);
  // ResizeObserver catches nav wrap / hamburger open/close without a scroll
  if (window.ResizeObserver && _header) {
    new ResizeObserver(updateHeaderVar).observe(_header);
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

  // === Language labels on code blocks ===
  // Rouge wraps fenced code in <div class="language-X highlighter-rouge"><pre class="highlight">…</pre></div>
  // Lift the language into a data-lang attribute on <pre> so CSS can render it as a pill.
  document.querySelectorAll('div[class*="language-"] > .highlight > pre, div[class*="language-"] > pre').forEach(function (pre) {
    var wrap = pre.closest('div[class*="language-"]');
    if (!wrap) return;
    var m = wrap.className.match(/language-([^\s]+)/);
    if (m && m[1] && m[1] !== 'plaintext' && m[1] !== 'text') {
      pre.setAttribute('data-lang', m[1]);
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
    // Skip images explicitly marked decorative (alt="")
    var images = Array.prototype.slice.call(document.querySelectorAll('article img:not(.icono)'))
      .filter(function (img) { return img.getAttribute('alt') !== ''; });
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

  // The Arabic phrase is rendered server-side (post.html); we just need the minute
  // count preserved for the scroll-driven "متبقية" updates below.

  function onScroll() {
    var y = window.scrollY;
    if (btt) btt.classList.toggle('visible', y > 400);
    if (siteHeader) siteHeader.classList.toggle('scrolled', y > 50);

    // BTT progress ring tracks the *whole page* so it fills at the actual
    // bottom, not when the reading content ends.
    if (bttProgress) {
      var docH = document.documentElement.scrollHeight - window.innerHeight;
      var docProg = docH > 0 ? Math.min(1, Math.max(0, y / docH)) : 0;
      bttProgress.style.strokeDashoffset = ringLen - (ringLen * docProg);
    }

    // "Minutes remaining" text stays tied to reading content (end marker is
    // share-buttons/post-tags/hr — before comments and related cards).
    if (readingTime && contentRoot && contentHeight > 0) {
      var totalMin = parseInt(readingTime.dataset.totalMin || '0', 10);
      if (totalMin > 0) {
        var scrolled = Math.max(0, Math.min(contentHeight, y - contentTop));
        var progress = scrolled / contentHeight;
        if (progress >= 0.98) readingTime.textContent = 'تمت القراءة';
        else {
          var remaining = Math.max(1, Math.ceil(totalMin * (1 - progress)));
          readingTime.textContent = formatRemaining(remaining);
        }
      }
    }
  }

  if (readingTime) {
    // data-total-min is set by the Liquid template; keep a text parse as a fallback
    if (!readingTime.dataset.totalMin) {
      var origTotal = parseInt(readingTime.textContent, 10);
      if (!isNaN(origTotal)) readingTime.dataset.totalMin = origTotal;
    }
    measureContent();
    window.addEventListener('resize', measureContent, { passive: true });
    window.addEventListener('load', measureContent);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  // === Giscus skeleton fade-out when the comments iframe loads ===
  var giscusSkeleton = document.querySelector('.giscus-skeleton');
  if (giscusSkeleton) {
    var hideSkeleton = function () {
      giscusSkeleton.classList.add('hidden');
      setTimeout(function () { if (giscusSkeleton.parentNode) giscusSkeleton.parentNode.removeChild(giscusSkeleton); }, 400);
    };
    var sObserver = new MutationObserver(function () {
      var iframe = document.querySelector('iframe.giscus-frame');
      if (!iframe) return;
      sObserver.disconnect();
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') hideSkeleton();
      else iframe.addEventListener('load', hideSkeleton, { once: true });
    });
    sObserver.observe(document.body, { childList: true, subtree: true });
    // Hard fallback: never leave the skeleton up for more than 10s
    setTimeout(function () { if (giscusSkeleton.parentNode) hideSkeleton(); }, 10000);
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
