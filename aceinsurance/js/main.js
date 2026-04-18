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

  // Sync dropdown selection
  var sel = document.getElementById('langSelect');
  if (sel) sel.value = lang;

  // Update html[lang] for SEO and screen readers
  var langMap = { en: 'en', es: 'es', zh: 'zh-Hans', ko: 'ko', vi: 'vi' };
  document.documentElement.lang = langMap[lang] || 'en';
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

/* ── Services Stack: Vikoone-style stacked card scroll animation ── */

function initServicesStack() {
  var wrapper = document.querySelector('.svc-stack');
  if (!wrapper) return;

  var cards     = Array.from(wrapper.querySelectorAll('.svc-card'));
  var dots      = Array.from(wrapper.querySelectorAll('.svc-dot'));
  var counterEl = wrapper.querySelector('.svc-counter-n');
  var numCards  = cards.length;

  /* Mobile: CSS handles the layout — no JS sticky logic needed */
  if (window.innerWidth < 768) return;

  /* Later cards sit on top of earlier ones */
  cards.forEach(function(card, i) { card.style.zIndex = i + 1; });

  function pad(n) { return String(n + 1).padStart(2, '0'); }

  function update() {
    var rect     = wrapper.getBoundingClientRect();
    var scrolled = -rect.top;                         /* px scrolled into section */
    var progress = scrolled / window.innerHeight;     /* 0 → numCards */

    cards.forEach(function(card, i) {
      if (i === 0) {
        /* First card: always pinned at top */
        card.style.transform = 'translateY(0)';
        return;
      }
      /* Card i slides in from 100% → 0% during progress (i-1) → i */
      var slot = Math.max(0, Math.min(1, progress - (i - 1)));
      card.style.transform = 'translateY(' + ((1 - slot) * 100).toFixed(3) + '%)';
    });

    /* Update dots + counter */
    var activeIdx = Math.max(0, Math.min(numCards - 1, Math.floor(progress)));
    dots.forEach(function(d, i) { d.classList.toggle('is-active', i === activeIdx); });
    if (counterEl) counterEl.textContent = pad(activeIdx);
  }

  window.addEventListener('scroll', update, { passive: true });
  update(); /* initial paint */

  /* Dot click: smooth-scroll to that card's entry point */
  dots.forEach(function(dot, i) {
    dot.addEventListener('click', function() {
      window.scrollTo({
        top: wrapper.offsetTop + i * window.innerHeight,
        behavior: 'smooth'
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initServicesStack();
});

/* ── Cursor-following gradient glow ─────────────────────────── */

function initGlowTracking() {
  document.querySelectorAll('.glow-track').forEach(function(el) {
    el.addEventListener('mousemove', function(e) {
      var rect = el.getBoundingClientRect();
      el.style.setProperty('--gx', (e.clientX - rect.left) + 'px');
      el.style.setProperty('--gy', (e.clientY - rect.top)  + 'px');
    }, { passive: true });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initGlowTracking();
});

/* ── Scroll-reveal entrance animations ───────────────────────── */

function initScrollReveal() {
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(function(el) {
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initScrollReveal();
});

/* ── Parallax floating artifacts ─────────────────────────────── */

function initParallaxArtifacts() {
  var artifacts = document.querySelectorAll('.artifact');
  if (!artifacts.length) return;

  function onScroll() {
    var scrollY = window.scrollY;
    artifacts.forEach(function(el) {
      var speed = parseFloat(el.dataset.speed) || 0.3;
      el.style.transform = 'translateY(' + (scrollY * speed) + 'px)';
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); /* set initial positions */
}

document.addEventListener('DOMContentLoaded', function() {
  initParallaxArtifacts();
});

/* ══════════════════════════════════════════════════════════════
   PREMIUM INTERACTIONS — Sapphire Nightfall Whisper
   Custom cursor · Scroll progress · Word reveal · Magnetic CTA
   ══════════════════════════════════════════════════════════════ */

/* ── Cursor background tint ──────────────────────────────────── */
function initCursorBg() {
  document.addEventListener('mousemove', function() {
    document.body.style.background = '#e8f3fb';
  }, { passive: true });
  document.addEventListener('mouseleave', function() {
    document.body.style.background = '#ffffff';
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initCursorBg();
});

/* ── Custom cursor ───────────────────────────────────────────── */
function initCustomCursor() {
  var dot  = document.querySelector('.cursor-dot');
  var ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  var mx = window.innerWidth / 2, my = window.innerHeight / 2;
  var rx = mx, ry = my;

  /* Dot follows exactly */
  document.addEventListener('mousemove', function(e) {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  }, { passive: true });

  /* Ring follows with lerp */
  (function lerpRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(lerpRing);
  })();

  /* Hover state on interactive elements */
  document.querySelectorAll('a, button, .btn, .svc-dot, .nav-toggle, input, select, textarea').forEach(function(el) {
    el.addEventListener('mouseenter', function() { document.body.classList.add('cursor-hover'); });
    el.addEventListener('mouseleave', function() { document.body.classList.remove('cursor-hover'); });
  });

  /* Hide on leave */
  document.addEventListener('mouseleave', function() {
    dot.style.opacity = '0'; ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', function() {
    dot.style.opacity = '1'; ring.style.opacity = '1';
  });
}

/* ── Scroll progress bar ─────────────────────────────────────── */
function initScrollProgress() {
  var bar = document.querySelector('.scroll-progress');
  if (!bar) return;

  window.addEventListener('scroll', function() {
    var pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    bar.style.transform = 'scaleX(' + Math.min(pct, 1) + ')';
  }, { passive: true });
}

/* ── Hero word-by-word entrance animation ────────────────────── */
function initHeroTextReveal() {
  var h1 = document.querySelector('.hero h1');
  if (!h1) return;

  /* Split into word spans, preserving italic <em> */
  var html = h1.innerHTML;
  /* Wrap each text-node word in a span */
  h1.innerHTML = html.replace(/(<[^>]+>)|([^<\s]+)/g, function(match, tag, word) {
    if (tag)  return tag; /* preserve tags */
    if (word) return '<span class="hw" style="display:inline-block;opacity:0;transform:translateY(24px);transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1),transform 0.7s cubic-bezier(0.16,1,0.3,1)">' + word + '</span> ';
    return match;
  });

  /* Stagger the reveal */
  var words = h1.querySelectorAll('.hw');
  words.forEach(function(w, i) {
    setTimeout(function() {
      w.style.opacity  = '1';
      w.style.transform = 'translateY(0)';
    }, 120 + i * 80);
  });

  /* Also fade in eyebrow + p */
  var eyebrow = document.querySelector('.hero-eyebrow');
  var sub     = document.querySelector('.hero p');
  var cta     = document.querySelector('.hero-cta');
  var scroll  = document.querySelector('.hero-scroll');
  [eyebrow, sub, cta, scroll].forEach(function(el, i) {
    if (!el) return;
    el.style.opacity   = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)';
    setTimeout(function() {
      el.style.opacity   = '1';
      el.style.transform = 'translateY(0)';
    }, 500 + i * 160);
  });
}

/* ── Magnetic CTA button ─────────────────────────────────────── */
function initMagneticButtons() {
  document.querySelectorAll('.btn-primary, .btn-outline').forEach(function(btn) {
    btn.addEventListener('mousemove', function(e) {
      var rect = btn.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top  + rect.height / 2;
      var dx = (e.clientX - cx) * 0.30;
      var dy = (e.clientY - cy) * 0.30;
      btn.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) translateY(-2px)';
    });
    btn.addEventListener('mouseleave', function() {
      btn.style.transform = '';
    });
  });
}

/* ── Section background parallax (subtle) ────────────────────── */
function initSectionParallax() {
  var sections = document.querySelectorAll('.hero::before, .page-hero, .cta-banner');
  /* handled via CSS radial gradients — no JS needed */
}

/* ── Boot all premium features ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {
  initCustomCursor();
  initScrollProgress();
  initHeroTextReveal();
  initMagneticButtons();
});
