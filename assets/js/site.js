/* OI — site chrome. Mobile nav + reveal-on-scroll for bars. */
(function () {
  'use strict';

  var GA_MEASUREMENT_ID = 'G-FT081H9N8L';
  var ANALYTICS_HOSTS = ['orgintelligence.io', 'www.orgintelligence.io'];
  var CONSENT_KEY = 'oi_analytics_consent';

  function analyticsAllowedHere() {
    return ANALYTICS_HOSTS.indexOf(window.location.hostname) !== -1;
  }

  function loadGoogleAnalytics() {
    if (!analyticsAllowedHere() || window.__oiGaLoaded) return;
    window.__oiGaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(script);
  }

  function consentValue() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (err) { return null; }
  }

  function saveConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (err) {}
  }

  function showConsent() {
    if (!analyticsAllowedHere() || document.querySelector('.cookie-notice')) return;
    var notice = document.createElement('section');
    notice.className = 'cookie-notice';
    notice.setAttribute('aria-label', 'Analytics choices');
    notice.innerHTML =
      '<div><p class="kicker">Your choice</p>' +
      '<p>May we use Google Analytics to understand which pages and calls to action are useful? ' +
      '<a href="/privacy">Privacy details</a>.</p></div>' +
      '<div class="cookie-notice__actions">' +
      '<button class="btn btn--primary" type="button" data-consent="accept">Accept analytics</button>' +
      '<button class="btn" type="button" data-consent="decline">Decline</button></div>';
    notice.addEventListener('click', function (event) {
      var button = event.target.closest('[data-consent]');
      if (!button) return;
      var accepted = button.getAttribute('data-consent') === 'accept';
      saveConsent(accepted ? 'granted' : 'denied');
      notice.remove();
      if (accepted) loadGoogleAnalytics();
    });
    document.body.appendChild(notice);
  }

  function addCookieChoicesLink() {
    if (!analyticsAllowedHere()) return;
    var footer = document.querySelector('.footer-bottom');
    if (!footer || footer.querySelector('[data-cookie-choices]')) return;
    var separator = document.createTextNode(' · ');
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'footer-link-button';
    button.setAttribute('data-cookie-choices', '');
    button.textContent = 'Cookie choices';
    button.addEventListener('click', showConsent);
    var container = footer.querySelector('span') || footer;
    container.appendChild(separator);
    container.appendChild(button);
  }

  if (analyticsAllowedHere()) {
    if (consentValue() === 'granted') loadGoogleAnalytics();
    else if (consentValue() !== 'denied') showConsent();
    addCookieChoicesLink();
  }

  function gaEventName(detail) {
    return ({
      book_consultation: 'consultation_cta_click',
      consultation_booked: 'consultation_submitted',
      start_check: 'wow_assessment_started',
      check_completed: 'wow_assessment_completed',
      check_lead_captured: 'wow_assessment_submitted',
      team_invite_clicked: 'wow_team_invite_clicked',
      team_response_completed: 'wow_team_response_completed',
      newsletter_signup: 'newsletter_cta_click',
      newsletter_subscribed: 'newsletter_subscribed',
      podcast_listen: 'podcast_listen',
      explore_lsp: 'lsp_explored'
    })[detail.event] || detail.event;
  }

  document.addEventListener('oi:track', function (event) {
    if (!window.gtag || !event.detail || !event.detail.event) return;
    var detail = event.detail;
    window.gtag('event', gaEventName(detail), {
      placement: detail.placement || 'unknown',
      label: detail.label || '',
      perspective: detail.perspective || ''
    });
  });

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

  /* ---- Conversion event hooks -------------------------------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-event]');
    if (!el) return;
    var detail = {
      event: el.getAttribute('data-event'),
      placement: el.getAttribute('data-placement') || 'unknown',
      label: (el.textContent || '').trim()
    };
    document.dispatchEvent(new CustomEvent('oi:track', { detail: detail }));
  });
})();
