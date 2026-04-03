/**
 * Ace Insurance & Retirement Services — Main JavaScript
 *
 * Handles:
 *  1. Mobile navigation hamburger toggle
 *  2. EN / KO language switcher (reads/writes localStorage)
 *  3. Active nav link highlighting
 *  4. Back-to-top button
 */

/* ── Language Switcher ──────────────────────────────────────── */

/**
 * Resolve a dot-path key (e.g. "hero.title") against a nested object.
 */
function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce(function(acc, k) {
    return acc && acc[k] !== undefined ? acc[k] : null;
  }, obj);
}

/**
 * Apply a language across all data-i18n and data-i18n-placeholder elements.
 * Persists the choice in localStorage so all pages remember it.
 */
function applyLanguage(lang) {
  if (!TRANSLATIONS || !TRANSLATIONS[lang]) return;

  // Save preference
  try { localStorage.setItem('ace-lang', lang); } catch(e) {}

  // Swap text content
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key   = el.getAttribute('data-i18n');
    var value = getNestedValue(TRANSLATIONS[lang], key);
    if (value !== null) el.textContent = value;
  });

  // Swap placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key   = el.getAttribute('data-i18n-placeholder');
    var value = getNestedValue(TRANSLATIONS[lang], key);
    if (value !== null) el.placeholder = value;
  });

  // Swap title attributes (for accessibility tooltips etc.)
  document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
    var key   = el.getAttribute('data-i18n-title');
    var value = getNestedValue(TRANSLATIONS[lang], key);
    if (value !== null) el.title = value;
  });

  // Highlight active language button
  document.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  // Update html[lang] for SEO and screen readers
  document.documentElement.lang = (lang === 'ko') ? 'ko' : 'en';
}

/* ── On Page Load ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {

  /* 1. Restore saved language preference */
  var savedLang = 'en';
  try { savedLang = localStorage.getItem('ace-lang') || 'en'; } catch(e) {}
  applyLanguage(savedLang);

  /* 2. Hamburger nav toggle */
  var navToggle = document.getElementById('navToggle');
  var navLinks  = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function() {
      var isOpen = navLinks.classList.toggle('nav-open');
      navToggle.setAttribute('aria-expanded', isOpen.toString());
    });

    // Close menu when any nav link is clicked (mobile UX)
    navLinks.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        navLinks.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu on outside click
    document.addEventListener('click', function(e) {
      if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('nav-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* 3. Highlight active nav link based on current page */
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function(link) {
    var href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* 4. Back-to-top button */
  var backBtn = document.getElementById('backToTop');
  if (backBtn) {
    window.addEventListener('scroll', function() {
      backBtn.classList.toggle('visible', window.scrollY > 400);
    });
    backBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* 5. Smooth scroll for anchor links */
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});

/* Make applyLanguage available to inline onclick handlers in HTML */
window.applyLanguage = applyLanguage;

/* ── Services Showcase: scroll-driven split-panel animation ──── */

function initServicesShowcase() {
  var wrapper = document.querySelector('.services-showcase');
  if (!wrapper) return;

  var viewport   = wrapper.querySelector('.showcase-viewport');
  var slides     = Array.from(wrapper.querySelectorAll('.showcase-slide'));
  var dots       = Array.from(wrapper.querySelectorAll('.showcase-dot'));
  var counter    = wrapper.querySelector('.showcase-counter-current');
  var scrollHint = wrapper.querySelector('.showcase-scroll-hint');
  var numSlides  = slides.length;
  var activeIndex = 0;

  /* On mobile, skip sticky scroll — CSS handles the layout */
  var isMobile = window.innerWidth < 768;
  if (isMobile) {
    /* Make all slides visible on mobile */
    slides.forEach(function(s) { s.classList.add('is-active'); });
    return;
  }

  function pad(n) {
    return String(n + 1).padStart(2, '0');
  }

  function setSlide(index) {
    if (index === activeIndex) return;

    /* Remove active from old slide */
    slides[activeIndex].classList.remove('is-active');
    if (dots[activeIndex]) dots[activeIndex].classList.remove('is-active');

    activeIndex = index;

    /* Activate new slide */
    slides[activeIndex].classList.add('is-active');
    if (dots[activeIndex]) dots[activeIndex].classList.add('is-active');

    /* Update counter */
    if (counter) counter.textContent = pad(activeIndex);

    /* Hide scroll hint after first scroll */
    if (scrollHint && activeIndex > 0) scrollHint.style.display = 'none';
  }

  /* Dot navigation: click scrolls to that slide's position */
  dots.forEach(function(dot, i) {
    dot.addEventListener('click', function() {
      window.scrollTo({
        top: wrapper.offsetTop + i * window.innerHeight,
        behavior: 'smooth'
      });
    });
  });

  /* Scroll handler: calculate which slide is current */
  window.addEventListener('scroll', function() {
    var scrolled = window.scrollY - wrapper.offsetTop;
    var vh = window.innerHeight;

    /* Each service occupies 1 × vh of scroll distance */
    var index = Math.floor(scrolled / vh);
    index = Math.max(0, Math.min(numSlides - 1, index));

    setSlide(index);
  }, { passive: true });
}

/* Add to existing DOMContentLoaded */
document.addEventListener('DOMContentLoaded', function() {
  initServicesShowcase();
});
