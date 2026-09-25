/* Workshop applications use the same-origin Cloudflare Pages function. */
(function () {
  var form = document.getElementById('bt-form');
  if (!form) return;

  var errorEl = document.getElementById('form-error');
  var submitting = false;
  var BTN_LABEL = 'Apply for a complimentary workshop';

  /* Carry campaign parameters into the payload so source attribution survives. */
  var qs = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(function (k) {
    var input = form.querySelector('[name="' + k + '"]');
    if (input) input.value = qs.get(k) || '';
  });

  function fail(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
    errorEl.focus();
  }

  function succeed() {
    var done = document.createElement('div');
    done.className = 'q-card';
    done.setAttribute('role', 'status');
    done.innerHTML =
      '<p class="kicker kicker--plain">Application received</p>' +
      '<h2 style="font-size:var(--t-h3);max-width:22ch;">Thank you for telling me about your team.</h2>' +
      '<p class="ui-text mt-2" style="max-width:44ch;">I&rsquo;ll read every application personally. ' +
      'Once I&rsquo;ve chosen the two teams, I&rsquo;ll be in touch either way.</p>';
    done.tabIndex = -1;
    form.replaceWith(done);
    done.focus();
    done.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    try {
      var detail = { event: 'bt_application_submitted', placement: 'bt_form', label: BTN_LABEL };
      document.dispatchEvent(new CustomEvent('oi:track', { detail: detail }));
    } catch (err) { /* analytics must never break the confirmation */ }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitting) return;
    errorEl.hidden = true;

    /* Honeypot: a real person never fills this in. */
    var hp = form.querySelector('[name="website"]');
    if (hp && hp.value) { succeed(); return; }

    var missing = [];
    ['firstName', 'lastName', 'email', 'company', 'whatsapp', 'teamSize',
     'teamTenure', 'valueNow', 'improveOneThing', 'location'].forEach(function (n) {
      var f = form.querySelector('[name="' + n + '"]');
      if (!f.value.trim()) missing.push(f.closest('.field').querySelector('span').textContent.replace('*', '').trim());
    });
    if (missing.length) {
      var list = missing.join('; ');
      fail('Still needed: ' + list + (/[?.]$/.test(list) ? '' : '.'));
      return;
    }

    var email = form.querySelector('[name="email"]');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      fail('That email address doesn\'t look right. Could you check it?');
      email.focus();
      return;
    }

    var phone = form.querySelector('[name="whatsapp"]');
    if (phone.value.replace(/\D/g, '').length < 7) {
      fail('That WhatsApp number looks too short. Could you check it, including the country code?');
      phone.focus();
      return;
    }

    var consent = form.querySelector('[name="consent"]');
    if (!consent.checked) {
      fail('Please tick the confirmation box so I know the format works for your team.');
      consent.focus();
      return;
    }

    var payload = Object.fromEntries(new FormData(form).entries());
    var btn = form.querySelector('button[type="submit"]');
    submitting = true;
    btn.disabled = true;
    btn.textContent = 'Sending…';

    fetch('/api/better-together', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    })
      .then(async function (response) {
        var result = await response.json();
        if (!response.ok || result.ok !== true) throw new Error('Submission failed');
        succeed();
      })
      .catch(function () {
        submitting = false;
        btn.disabled = false;
        btn.textContent = BTN_LABEL;
        fail('That did not send. Please try again, or email hello@orgintelligence.io directly. Your answers are still here.');
      });
  });
})();
