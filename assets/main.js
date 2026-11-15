// land2grid — shared behaviour

// Homepage hero: rotate through a set of renewable-energy background clips,
// cross-fading to the next one every 6 seconds. Two stacked <video>
// elements (see index.html) swap which is on top so the change is a fade,
// not a cut. Clip list and credits: assets/VIDEO-CREDITS.md.
var HERO_CLIPS = [
  'https://cdn.coverr.co/videos/coverr-wind-turbines-in-the-field-7853/1080p.mp4',
  'https://cdn.coverr.co/videos/coverr-wind-turbines-in-a-field-5831/720p.mp4',
  'https://cdn.coverr.co/videos/coverr-wind-turbines-in-madeira-island-56/720p.mp4',
  'https://cdn.coverr.co/videos/coverr-close-up-of-a-wind-turbine-7742/720p.mp4'
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
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
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

  // chat widget — a plain shortcut to the contact page, not a simulated
  // live agent. Shows once per browser session so it doesn't nag on
  // every page view; works from the root or from /services/.
  var contactHref = location.pathname.indexOf('/services/') !== -1 ? '../contact.html' : 'contact.html';
  var fab = document.createElement('button');
  fab.className = 'chat-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Contact land2grid');
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H11l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="chat-dot" aria-hidden="true"></span>';

  var greeting = document.createElement('div');
  greeting.className = 'chat-greeting';
  greeting.innerHTML = '<span>Hi! Have a project in mind? <a href="' + contactHref + '">Tell us about it →</a></span>' +
    '<button type="button" class="chat-greeting-close" aria-label="Dismiss">×</button>';

  document.body.appendChild(fab);

  var dismissed = sessionStorage.getItem('l2g-chat-dismissed') === '1';
  if (!dismissed) {
    document.body.appendChild(greeting);
    greeting.querySelector('.chat-greeting-close').addEventListener('click', function () {
      greeting.remove();
      sessionStorage.setItem('l2g-chat-dismissed', '1');
    });
  }

  fab.addEventListener('click', function () {
    if (document.body.contains(greeting)) {
      greeting.remove();
    } else {
      document.body.appendChild(greeting);
    }
  });
});
