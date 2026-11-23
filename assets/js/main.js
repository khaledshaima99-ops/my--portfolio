/* ============================================================
   شيماء خالد — معرض أعمال ثابت
   Language switching, theme persistence and small interactions
   ============================================================ */
(function () {
  'use strict';

  var LANG_KEY = 'shaima-portfolio-lang';
  var THEME_KEY = 'shaima-portfolio-theme';
  var root = document.documentElement;

  function readStore(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStore(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* storage disabled */ }
  }

  function initialLang() {
    var saved = readStore(LANG_KEY);
    return saved === 'en' ? 'en' : 'ar';
  }

  function initialTheme() {
    var saved = readStore(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) { /* no matchMedia */ }
    return 'light';
  }

  var lang = initialLang();
  var theme = initialTheme();

  /* Applied immediately so the page opens in the saved language/theme. */
  function applyLang() {
    root.lang = lang;
    root.dir = lang === 'en' ? 'ltr' : 'rtl';
    root.setAttribute('data-lang', lang);
  }

  function applyTheme() {
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B1220' : '#5B5FEF');

    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      var label = themeBtn.querySelector('[data-theme-label]');
      if (label) {
        if (theme === 'dark') {
          label.textContent = lang === 'ar' ? 'الوضع النهاري' : 'Light mode';
          themeBtn.setAttribute('aria-label', lang === 'ar' ? 'التبديل إلى الوضع النهاري' : 'Switch to light mode');
        } else {
          label.textContent = lang === 'ar' ? 'الوضع الليلي' : 'Dark mode';
          themeBtn.setAttribute('aria-label', lang === 'ar' ? 'التبديل إلى الوضع الليلي' : 'Switch to dark mode');
        }
      }
    }
  }

  applyLang();
  applyTheme();

  var ATTRS = [
    ['alt', 'alt'],
    ['label', 'aria-label'],
    ['title', 'title'],
    ['placeholder', 'placeholder'],
    ['content', 'content']
  ];

  function translateDocument() {
    var textNodes = document.querySelectorAll('[data-ar],[data-en]');
    for (var i = 0; i < textNodes.length; i += 1) {
      var el = textNodes[i];
      var value = el.getAttribute(lang === 'ar' ? 'data-ar' : 'data-en');
      if (value !== null) el.textContent = value;
    }

    var attrNodes = document.querySelectorAll('[data-ar-alt],[data-en-alt],[data-ar-label],[data-en-label],[data-ar-title],[data-en-title],[data-ar-placeholder],[data-en-placeholder],[data-ar-content],[data-en-content]');
    for (var j = 0; j < attrNodes.length; j += 1) {
      var node = attrNodes[j];
      for (var k = 0; k < ATTRS.length; k += 1) {
        var key = ATTRS[k][0];
        var target = ATTRS[k][1];
        var translated = node.getAttribute('data-' + lang + '-' + key);
        if (translated !== null) node.setAttribute(target, translated);
      }
    }

    applyTheme();
    updateMenuLabel();
  }

  function setLang(next) {
    if (next !== 'ar' && next !== 'en') return;
    lang = next;
    writeStore(LANG_KEY, lang);
    applyLang();
    translateDocument();
  }

  function setTheme(next) {
    theme = next === 'dark' ? 'dark' : 'light';
    writeStore(THEME_KEY, theme);
    applyTheme();
  }

  var toggle = null;
  var nav = null;

  function updateMenuLabel() {
    if (!toggle) return;
    var expanded = toggle.getAttribute('aria-expanded') === 'true';
    var label = expanded
      ? (lang === 'ar' ? 'إغلاق القائمة' : 'Close menu')
      : (lang === 'ar' ? 'فتح القائمة' : 'Open menu');
    toggle.setAttribute('aria-label', label);
  }

  function closeMenu() {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    updateMenuLabel();
  }

  function markActiveLink() {
    var current = window.location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.main-nav a[href], .footer-nav a[href]');
    for (var i = 0; i < links.length; i += 1) {
      var href = links[i].getAttribute('href').split('#')[0];
      if (href === current && links[i].parentNode.classList.contains('main-nav')) {
        links[i].classList.add('is-active');
      }
    }
  }

  function init() {
    translateDocument();
    markActiveLink();

    var langBtn = document.getElementById('langToggle');
    if (langBtn) {
      langBtn.addEventListener('click', function () {
        setLang(lang === 'ar' ? 'en' : 'ar');
      });
    }

    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        setTheme(theme === 'dark' ? 'light' : 'dark');
      });
    }

    toggle = document.getElementById('menuToggle');
    nav = document.getElementById('mainNav');
    if (toggle && nav) {
      updateMenuLabel();
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        nav.classList.toggle('is-open', open);
        updateMenuLabel();
      });
      nav.addEventListener('click', function (event) {
        if (event.target.closest('a')) closeMenu();
      });
      document.addEventListener('click', function (event) {
        if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
      });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeMenu();
      });
    }

    var header = document.getElementById('siteHeader');
    var toTop = document.getElementById('toTop');
    function onScroll() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (header) header.classList.toggle('is-scrolled', y > 12);
      if (toTop) toTop.classList.toggle('is-visible', y > 380);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      for (var i = 0; i < reveals.length; i += 1) observer.observe(reveals[i]);
    } else {
      for (var j = 0; j < reveals.length; j += 1) reveals[j].classList.add('is-visible');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
