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

  // chat widget — a basic, rule-based assistant: it either points the
  // visitor at the right page (keyword match against a fixed list of
  // intents) or collects a few basic details and hands them to the team
  // by email. No AI, no live agent on the other end — the panel says so
  // up front rather than pretending otherwise.
  var inServices = location.pathname.indexOf('/services/') !== -1;
  var rel = function (href) { return inServices ? '../' + href : href; };

  var CHAT_INTENTS = [
    { keywords: ['land', 'lease', 'title', 'parcel', 'acquisition of land'], label: 'Land management', href: rel('services/land-management.html') },
    { keywords: ['grid', 'connectivity', 'transmission', 'substation', 'interconnect', 'evacuation'], label: 'Grid connectivity', href: rel('services/grid-connectivity.html') },
    { keywords: ['customer', 'offtake', 'ppa', 'buyer', 'c&i', 'industrial customer'], label: 'Customer acquisition', href: rel('services/customer-acquisition.html') },
    { keywords: ['project', 'dashboard', 'listing', 'available', 'find projects'], label: 'Find projects', href: rel('dashboard.html') },
    { keywords: ['case study', 'case studies', 'experience', 'track record', 'portfolio'], label: 'Our experience', href: rel('case-studies.html') },
    { keywords: ['career', 'job', 'hire', 'join', 'vacanc'], label: 'Careers', href: rel('careers.html') },
    { keywords: ['insight', 'news', 'blog', 'article'], label: 'News & insights', href: rel('insights.html') },
    { keywords: ['about', 'who are you', 'team', 'company'], label: 'About us', href: rel('about.html') },
    { keywords: ['privacy'], label: 'Privacy policy', href: rel('privacy.html') },
    { keywords: ['terms'], label: 'Terms', href: rel('terms.html') },
    { keywords: ['cookie'], label: 'Cookie policy', href: rel('cookie-policy.html') },
    { keywords: ['contact', 'talk', 'reach', 'call', 'email', 'enquiry', 'enquire', 'speak', 'quote'], label: 'Talk to the team', action: 'lead-form' }
  ];

  var QUICK_REPLIES = ['Land management', 'Grid connectivity', 'Customer acquisition', 'Find projects', 'Talk to the team'];
  var BOT_NAME = 'Bot'; // placeholder display name — swap for a real one later

  var botInitial = BOT_NAME.charAt(0).toUpperCase();

  var fab = document.createElement('button');
  fab.className = 'chat-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Chat with ' + BOT_NAME);
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H11l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="chat-dot" aria-hidden="true"></span>';

  var greeting = document.createElement('div');
  greeting.className = 'chat-greeting';
  greeting.innerHTML = '<span>Hi! Need something? <a href="#" class="chat-greeting-open">Ask ' + BOT_NAME + ' →</a></span>' +
    '<button type="button" class="chat-greeting-close" aria-label="Dismiss">×</button>';

  document.body.appendChild(fab);

  var consentAlready = null;
  try { consentAlready = localStorage.getItem('l2g-cookie-consent'); } catch (e) {}
  var dismissed = sessionStorage.getItem('l2g-chat-dismissed') === '1';
  if (!dismissed && consentAlready) {
    document.body.appendChild(greeting);
  }
  greeting.querySelector('.chat-greeting-close').addEventListener('click', function () {
    greeting.remove();
    sessionStorage.setItem('l2g-chat-dismissed', '1');
  });

  var panel = null;
  var panelBody = null;

  function avatarEl() {
    var av = document.createElement('div');
    av.className = 'chat-avatar';
    av.textContent = botInitial;
    av.setAttribute('aria-hidden', 'true');
    return av;
  }

  function addBotMessage(html) {
    var row = document.createElement('div');
    row.className = 'chat-row';
    var msg = document.createElement('div');
    msg.className = 'chat-msg bot';
    msg.innerHTML = html;
    row.appendChild(avatarEl());
    row.appendChild(msg);
    panelBody.appendChild(row);
    panelBody.scrollTop = panelBody.scrollHeight;
    return row;
  }

  // shows a bouncing-dots "typing" row for a moment, then swaps it for the
  // real message — a small delay so replies don't just snap into place
  function addBotMessageDelayed(html, callback) {
    var row = document.createElement('div');
    row.className = 'chat-row';
    var typing = document.createElement('div');
    typing.className = 'chat-msg bot chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    row.appendChild(avatarEl());
    row.appendChild(typing);
    panelBody.appendChild(row);
    panelBody.scrollTop = panelBody.scrollHeight;

    setTimeout(function () {
      row.remove();
      var result = addBotMessage(html);
      if (typeof callback === 'function') callback(result);
    }, 550 + Math.random() * 350);
  }

  function addUserMessage(text) {
    var msg = document.createElement('div');
    msg.className = 'chat-msg user';
    msg.textContent = text;
    panelBody.appendChild(msg);
    panelBody.scrollTop = panelBody.scrollHeight;
  }

  function addQuickReplies(labels) {
    var row = document.createElement('div');
    row.className = 'chat-quick';
    labels.forEach(function (label) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chat-chip';
      chip.textContent = label;
      chip.addEventListener('click', function () { handleUserText(label); });
      row.appendChild(chip);
    });
    panelBody.appendChild(row);
    panelBody.scrollTop = panelBody.scrollHeight;
  }

  function matchIntent(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < CHAT_INTENTS.length; i++) {
      var intent = CHAT_INTENTS[i];
      for (var j = 0; j < intent.keywords.length; j++) {
        if (lower.indexOf(intent.keywords[j]) !== -1) return intent;
      }
    }
    return null;
  }

  function showLeadForm() {
    var wrap = document.createElement('form');
    wrap.className = 'chat-lead';
    wrap.innerHTML =
      '<label>Your name<input type="text" name="name" required></label>' +
      '<label>Email<input type="email" name="email" required></label>' +
      '<label>Company<input type="text" name="company"></label>' +
      '<label>What do you need help with?' +
      '<select name="need">' +
      '<option>Land management</option>' +
      '<option>Grid connectivity</option>' +
      '<option>Industrial customer acquisition</option>' +
      '<option>All three</option>' +
      '<option>Not sure yet</option>' +
      '</select></label>' +
      '<label>Message<textarea name="message" placeholder="Location, capacity, timeline — anything that helps."></textarea></label>' +
      '<button type="submit" class="btn">Send to the team</button>';

    addBotMessageDelayed('Share a few details and I’ll open an email to our team with everything filled in.', function () {
      panelBody.appendChild(wrap);
      panelBody.scrollTop = panelBody.scrollHeight;
    });

    wrap.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(wrap);
      var name = (data.get('name') || '').toString().trim();
      var email = (data.get('email') || '').toString().trim();
      var company = (data.get('company') || '').toString().trim();
      var need = (data.get('need') || '').toString();
      var message = (data.get('message') || '').toString().trim();

      var bodyLines = [
        'Name: ' + name,
        'Email: ' + email,
        'Company: ' + (company || '-'),
        'Need: ' + need,
        '',
        message || '(no additional message)'
      ];
      var mailto = 'mailto:hello@land2grid.com' +
        '?subject=' + encodeURIComponent('New enquiry from ' + (name || 'website chat')) +
        '&body=' + encodeURIComponent(bodyLines.join('\n'));

      wrap.remove();
      addUserMessage('Sent: ' + name + ' (' + need + ')');
      addBotMessageDelayed('Thanks, ' + (name.split(' ')[0] || 'there') +
        ' — that should have opened your email app with the details filled in. ' +
        'Nothing happen? Write to us directly at <a class="chat-link" href="mailto:hello@land2grid.com">hello@land2grid.com</a>.');
      window.location.href = mailto;
    });
  }

  function handleUserText(text) {
    if (!text) return;
    addUserMessage(text);
    var intent = matchIntent(text);
    if (intent && intent.action === 'lead-form') {
      showLeadForm();
    } else if (intent) {
      addBotMessageDelayed('That lives on our ' + intent.label + ' page — ' +
        '<a class="chat-link" href="' + intent.href + '">open it →</a>');
    } else {
      addBotMessageDelayed('I couldn’t find a page for that. Want me to pass it to the team instead?', function () {
        addQuickReplies(['Talk to the team']);
      });
    }
  }

  function openPanel() {
    if (panel) { panel.remove(); panel = null; return; }
    if (document.body.contains(greeting)) greeting.remove();

    panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'land2grid chat');
    panel.innerHTML =
      '<div class="chat-panel-head">' +
      '<div><strong>' + BOT_NAME + ' · land2grid</strong><span>Automated — find a page or reach the team</span></div>' +
      '<button type="button" class="chat-panel-close" aria-label="Close chat">×</button>' +
      '</div>' +
      '<div class="chat-panel-body"></div>' +
      '<form class="chat-panel-input">' +
      '<input type="text" placeholder="Ask about land, grid, offtake…" aria-label="Your message">' +
      '<button type="submit" aria-label="Send">' +
      '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12 20 4l-6 16-2.5-7L4 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>' +
      '</button>' +
      '</form>';
    document.body.appendChild(panel);

    panelBody = panel.querySelector('.chat-panel-body');
    addBotMessageDelayed('Hi, I’m ' + BOT_NAME + ' — land2grid’s site assistant, not a live person. ' +
      'Tell me what you’re looking for, or pick one below:', function () {
      addQuickReplies(QUICK_REPLIES);
    });

    panel.querySelector('.chat-panel-close').addEventListener('click', openPanel);
    var form = panel.querySelector('.chat-panel-input');
    var input = form.querySelector('input');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = input.value.trim();
      if (!val) return;
      input.value = '';
      handleUserText(val);
    });
    input.focus();
  }

  fab.addEventListener('click', openPanel);
  greeting.querySelector('.chat-greeting-open').addEventListener('click', function (e) {
    e.preventDefault();
    openPanel();
  });

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
