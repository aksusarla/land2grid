// land2grid — shared behaviour

// Homepage hero: rotate through a set of renewable-energy background clips,
// cross-fading to the next one every 6 seconds. Two stacked <video>
// elements (see index.html) swap which is on top so the change is a fade,
// not a cut. Clip list and credits: assets/VIDEO-CREDITS.md.
var HERO_CLIPS = [
  'https://cdn.coverr.co/videos/coverr-wind-turbines-in-the-field-7853/1080p.mp4',
  'https://videos.pexels.com/video-files/30583778/13097063_2560_1440_30fps.mp4',
  'https://videos.pexels.com/video-files/30372395/13017165_3072_1440_24fps.mp4',
  'https://cdn.coverr.co/videos/coverr-wind-turbines-in-madeira-island-56/720p.mp4',
  'https://videos.pexels.com/video-files/7042814/7042814-uhd_2732_1318_30fps.mp4',
  'https://videos.pexels.com/video-files/6133235/6133235-uhd_2560_1440_30fps.mp4'
];

document.addEventListener('DOMContentLoaded', function () {
  var heroWrap = document.getElementById('hero-video');
  if (heroWrap) {
    var vids = heroWrap.querySelectorAll('.hero-video-el');
    if (vids.length === 2 && HERO_CLIPS.length) {
      var active = 0;
      var idx = 0;
      vids[0].src = HERO_CLIPS[0];
      vids[0].play().catch(function () {});

      setInterval(function () {
        var nextIdx = (idx + 1) % HERO_CLIPS.length;
        var incoming = vids[1 - active];
        var outgoing = vids[active];
        incoming.src = HERO_CLIPS[nextIdx];
        incoming.currentTime = 0;

        var swap = function () {
          incoming.classList.add('is-active');
          outgoing.classList.remove('is-active');
          active = 1 - active;
          idx = nextIdx;
        };
        var playPromise = incoming.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.then(swap).catch(swap);
        } else {
          swap();
        }
      }, 6000);
    }
  }

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('nav.primary');
  if (toggle && nav) {
    var setNavOpen = function (open) {
      nav.classList.toggle('open', open);
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      // lock the page behind the drawer so a swipe doesn't scroll the
      // homepage underneath while the menu is covering the screen
      document.body.classList.toggle('nav-locked', open);
    };
    toggle.addEventListener('click', function () {
      setNavOpen(!nav.classList.contains('open'));
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setNavOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setNavOpen(false);
        toggle.focus();
      }
    });
  }

  // mark current nav link as active — compare by filename so this
  // works the same whether the site sits at a domain root or under
  // a GitHub Pages project subpath (e.g. /land2grid/)
  var hereFile = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
  document.querySelectorAll('nav.primary > a, .sub-menu a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href) return;
    var hrefFile = href.split('/').filter(Boolean).pop() || 'index.html';
    if (hrefFile === hereFile) {
      link.classList.add('active');
    }
  });

  // "How an engagement runs" steps — each has a collapsed detail list that
  // opens on hover/focus via CSS alone. Touch devices have no hover, so a
  // tap toggles an .is-open class instead (and tapping a second, already-open
  // step closes the first, so only one detail panel is open at a time).
  var stepItems = document.querySelectorAll('.steps > li');
  if (stepItems.length) {
    stepItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var alreadyOpen = item.classList.contains('is-open');
        stepItems.forEach(function (other) { other.classList.remove('is-open'); });
        if (!alreadyOpen) item.classList.add('is-open');
      });
    });
  }

  // cookie consent — a plain accept/reject banner shown until the visitor
  // picks one, stored in localStorage so the choice persists across pages
  // and visits. This site doesn't currently set any analytics/marketing
  // cookies; the banner and the stored choice are here so that if/when one
  // is added, the code can check l2g-cookie-consent before loading it.
  var cookieBanner = document.createElement('div');
  cookieBanner.className = 'cookie-banner';
  cookieBanner.setAttribute('role', 'region');
  cookieBanner.setAttribute('aria-label', 'Cookie consent');
  cookieBanner.innerHTML =
    '<p>We use cookies for basic site functionality and, if you agree, to understand how the site is used.</p>' +
    '<div class="cookie-actions">' +
    '<button type="button" class="cookie-reject">Reject</button>' +
    '<button type="button" class="cookie-accept">Accept</button>' +
    '</div>';

  function showCookieBanner() {
    if (!document.body.contains(cookieBanner)) {
      document.body.appendChild(cookieBanner);
      document.body.classList.add('has-cookie-banner');
    }
  }
  function hideCookieBanner() {
    if (document.body.contains(cookieBanner)) {
      cookieBanner.remove();
      document.body.classList.remove('has-cookie-banner');
    }
  }

  var consent = null;
  try { consent = localStorage.getItem('l2g-cookie-consent'); } catch (e) {}
  if (!consent) {
    showCookieBanner();
  }

  cookieBanner.querySelector('.cookie-accept').addEventListener('click', function () {
    try { localStorage.setItem('l2g-cookie-consent', 'accepted'); } catch (e) {}
    hideCookieBanner();
  });
  cookieBanner.querySelector('.cookie-reject').addEventListener('click', function () {
    try { localStorage.setItem('l2g-cookie-consent', 'rejected'); } catch (e) {}
    hideCookieBanner();
  });

  // the footer's "Cookie policy" link now goes to a real page; the button
  // there reopens this same banner so visitors can change their choice
  var manageCookiesBtn = document.getElementById('manage-cookies-btn');
  if (manageCookiesBtn) {
    manageCookiesBtn.addEventListener('click', function (e) {
      e.preventDefault();
      showCookieBanner();
    });
  }

  // "IPPs" / "EPCs" / "C&I" acronym reveal — on hover or focus, the
  // spelled-out term's own letters slide out from the same spot the
  // abbreviation sits in. Positions are measured per letter (not
  // hardcoded) so this keeps working if the wording ever changes.
  var acronymEls = document.querySelectorAll('.acronym');
  if (acronymEls.length) {
    var buildAcronym = function (el) {
      var full = el.querySelector('.acronym-full');
      if (!full) return;
      var text = full.getAttribute('data-term');
      if (text === null) {
        text = full.textContent;
        full.setAttribute('data-term', text);
      }
      full.innerHTML = '';
      // group letters by word in a plain (unpositioned) wrapper so the
      // browser can only wrap between words, never inside one -- each
      // letter is still its own span underneath, found fine by the
      // querySelectorAll below regardless of this extra nesting
      var tokens = text.split(/(\s+)/);
      var idx = 0;
      var makeChar = function (char, container) {
        var ch = document.createElement('span');
        ch.className = 'acr-char';
        ch.style.display = 'inline-block';
        ch.style.whiteSpace = 'pre';
        ch.style.setProperty('--i', idx++);
        ch.textContent = char;
        container.appendChild(ch);
      };
      for (var t = 0; t < tokens.length; t++) {
        var token = tokens[t];
        if (!token) continue;
        if (/^\s+$/.test(token)) {
          for (var s = 0; s < token.length; s++) { makeChar(token[s], full); }
        } else {
          var wordWrap = document.createElement('span');
          wordWrap.style.display = 'inline-block';
          for (var c = 0; c < token.length; c++) { makeChar(token[c], wordWrap); }
          full.appendChild(wordWrap);
        }
      }
      // lock the card's own footprint to its natural size before any
      // letter switches to absolute positioning, so the card itself
      // never jumps once the letters start moving independently
      full.style.width = full.offsetWidth + 'px';
      full.style.height = full.offsetHeight + 'px';

      var chars = full.querySelectorAll('.acr-char');
      var lefts = [], tops = [], k;
      for (k = 0; k < chars.length; k++) {
        lefts.push(chars[k].offsetLeft);
        tops.push(chars[k].offsetTop);
      }
      for (k = 0; k < chars.length; k++) {
        chars[k].style.position = 'absolute';
        chars[k].style.left = lefts[k] + 'px';
        chars[k].style.top = tops[k] + 'px';
        chars[k].style.setProperty('--tx', (-lefts[k]) + 'px');
      }
    };

    acronymEls.forEach(function (el) { buildAcronym(el); });

    var acronymResizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(acronymResizeTimer);
      acronymResizeTimer = setTimeout(function () {
        acronymEls.forEach(function (el) { buildAcronym(el); });
      }, 200);
    });

    acronymEls.forEach(function (el) {
      var open = function () { el.classList.add('is-open'); };
      var close = function () { el.classList.remove('is-open'); };
      el.addEventListener('mouseenter', open);
      el.addEventListener('mouseleave', close);
      el.addEventListener('focus', open);
      el.addEventListener('blur', close);
      el.addEventListener('click', function (e) {
        e.preventDefault();
        el.classList.toggle('is-open');
      });
    });
  }
});

// Scroll-reveal: content fades and lifts in as it enters the viewport.
// Progressive enhancement — if IntersectionObserver isn't available, or
// the person has asked for reduced motion, everything just shows up
// immediately instead.
document.addEventListener('DOMContentLoaded', function () {
  var revealSelectors = [
    '.detail-block',
    '.route-card',
    '.stat',
    '.card',
    '.case-card',
    '.insight-card',
    '.flow-node',
    '.founder',
    '.steps > li',
    'section > .wrap > h2',
    '#who-we-are p',
    '.contact',
    '.three > div'
  ];

  var targets = [];
  revealSelectors.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      if (targets.indexOf(el) === -1) targets.push(el);
    });
  });
  if (!targets.length) return;

  targets.forEach(function (el) { el.classList.add('reveal'); });

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced || typeof IntersectionObserver === 'undefined') {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  targets.forEach(function (el) { io.observe(el); });

  // Safety net: on some phones (slow layout, a resize mid-scroll, a tab
  // restored from the background) the observer can miss an element that's
  // already sitting in view. Nothing should stay invisible forever, so
  // anything not revealed within a couple of seconds is shown anyway.
  setTimeout(function () {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    io.disconnect();
  }, 2000);
});
