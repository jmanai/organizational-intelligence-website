/* Consultation enquiry form.
 *
 * ── ONE THING TO SET BEFORE LAUNCH ───────────────────────────────────────
 * FORM_ENDPOINT is the URL that receives submissions. Options that work with
 * a static site: Formspree, Basin, Tally, Netlify Forms, or a HubSpot form
 * endpoint. Paste the URL below and the form goes live.
 *
 * While it is empty the form deliberately refuses to submit and points the
 * visitor at the email address instead. That is on purpose: a form that
 * silently loses an enquiry is worse than one that admits it isn't ready.
 * ─────────────────────────────────────────────────────────────────────────
 */
var FORM_ENDPOINT = '';

(function () {
  var form = document.getElementById('booking-form');
  if (!form) return;

  var errorEl = document.getElementById('form-error');

  /* Carry the campaign parameters site.js put in the query string into the
     payload, so source attribution survives the last step. */
  var qs = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(function (k) {
    var input = form.querySelector('[name="' + k + '"]');
    if (input) input.value = qs.get(k) || '';
  });

  function fail(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function succeed() {
    var done = document.createElement('div');
    done.className = 'q-card';
    done.setAttribute('role', 'status');
    done.innerHTML =
      '<p class="kicker kicker--plain">Sent</p>' +
      '<h2 style="font-size:var(--t-h3);max-width:26ch;">This is the part where most websites just say &ldquo;Thank you.&rdquo;</h2>' +
      '<p class="ui-text mt-2" style="max-width:44ch;">So&hellip; thank you. Truly. We&rsquo;re really glad you reached out.</p>' +
      '<p class="ui-text mt-2" style="max-width:44ch;">Your message is safely with us, and we promise, a real human will read it. ' +
      'We&rsquo;ll be in touch soon, and we&rsquo;re looking forward to connecting with you.</p>';
    form.replaceWith(done);
    done.scrollIntoView({ block: 'center', behavior: 'smooth' });
    /* Same shape site.js pushes for click events, so the loop from
       placement → enquiry closes without a second analytics path. */
    try {
      var detail = { event: 'consultation_booked', placement: 'book_form', label: 'Send it over' };
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(detail);
      document.dispatchEvent(new CustomEvent('oi:track', { detail: detail }));
    } catch (err) { /* analytics must never break the confirmation */ }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    /* Honeypot: a real person never fills this in. */
    var hp = form.querySelector('[name="website"]');
    if (hp && hp.value) { succeed(); return; }   // silently drop, don't tip off the bot

    var missing = [];
    ['firstName', 'email', 'company', 'message'].forEach(function (n) {
      var f = form.querySelector('[name="' + n + '"]');
      if (!f.value.trim()) missing.push(f.closest('.field').querySelector('span').textContent.replace('*', '').trim());
    });
    if (missing.length) {
      fail('Still needed: ' + missing.join(', ') + '.');
      return;
    }

    var email = form.querySelector('[name="email"]');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      fail('That email address doesn\'t look right. Could you check it?');
      email.focus();
      return;
    }

    if (!FORM_ENDPOINT) {
      fail('This form isn\'t connected yet. Please email hello@orgintelligence.io ' +
           'and we\'ll pick it up from there.');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    })
      .then(function (r) {
        if (!r.ok) throw new Error(r.status);
        succeed();
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Send it over';
        fail('That didn\'t send. Please try again, or email ' +
             'hello@orgintelligence.io directly.');
      });
  });
})();
