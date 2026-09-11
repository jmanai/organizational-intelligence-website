/* OI — site chrome. Mobile nav + reveal-on-scroll for bars. */
(function () {
  'use strict';

  /* ---- Mobile navigation ------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var drawer = document.getElementById('nav-drawer');

  if (toggle && drawer) {
    var setOpen = function (open) {
      drawer.setAttribute('data-open', open ? 'true' : 'false');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? 'Close' : 'Menu';
    };
    toggle.addEventListener('click', function () {
      setOpen(drawer.getAttribute('data-open') !== 'true');
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.getAttribute('data-open') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1040) setOpen(false);
    });
  }

  /* ---- Preserve referrer/UTM through to the booking flow ------------ */
  try {
    var params = new URLSearchParams(window.location.search);
    var carry = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var kept = new URLSearchParams();
    carry.forEach(function (k) { if (params.get(k)) kept.set(k, params.get(k)); });
    if (document.referrer && !kept.get('utm_source')) kept.set('ref', document.referrer);

    if ([].concat.apply([], [kept.keys()]).length !== 0 || Array.from(kept).length) {
      document.querySelectorAll('a[data-carry-source]').forEach(function (a) {
        var url = new URL(a.getAttribute('href'), window.location.href);
        Array.from(kept).forEach(function (pair) { url.searchParams.set(pair[0], pair[1]); });
        a.setAttribute('href', url.pathname + url.search + url.hash);
      });
    }
  } catch (err) { /* analytics niceties must never break the page */ }

  /* ---- Conversion event hooks --------------------------------------
     Fires a CustomEvent + pushes to dataLayer if one exists, so the
     analytics spec in §15 of the brief can be wired without code edits. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-event]');
    if (!el) return;
    var detail = {
      event: el.getAttribute('data-event'),
      placement: el.getAttribute('data-placement') || 'unknown',
      label: (el.textContent || '').trim()
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(detail);
    document.dispatchEvent(new CustomEvent('oi:track', { detail: detail }));
  });
})();
