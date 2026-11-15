// land2grid — shared behaviour

document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('nav.primary');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? '✕' : '☰';
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = '☰';
      });
    });
  }

  // mark current nav link as active
  var here = location.pathname.replace(/\/index\.html$/, '/');
  document.querySelectorAll('nav.primary > a, .sub-menu a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (!href) return;
    var target = href.replace(/\/index\.html$/, '/');
    if (target === here || (target !== '/' && here.endsWith(target))) {
      link.classList.add('active');
    }
  });
});
