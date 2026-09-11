/* Consultation enquiry form.
 *
 * ── ONE THING TO SET BEFORE LAUNCH ───────────────────────────────────────
 * The same-origin Cloudflare Pages Function keeps email credentials on the
 * server and gives preview and production deployments separate secrets.
 * ─────────────────────────────────────────────────────────────────────────
 */
var FORM_ENDPOINT = '/api/contact';

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

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form).entries()))
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          if (!r.ok) throw new Error(body.error || r.status);
        });
      })
      .then(function () {
        succeed();
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = 'Send it over';
        fail(err.message && !/^\d+$/.test(err.message) ? err.message :
             'That didn\'t send. Please try again, or email hello@orgintelligence.io directly.');
      });
  });
})();
