/* Footer newsletter signup.
 *
 * ── ONE THING TO SET BEFORE LAUNCH ───────────────────────────────────────
 * LIST_ENDPOINT is where subscribers go. Use a real email tool rather than a
 * generic form service: a subscriber list needs double opt-in, a working
 * unsubscribe, and consent records, which Buttondown / Kit / Mailchimp /
 * Beehiiv give you and a form endpoint does not.
 *
 * While it is empty the form refuses to submit and says so, rather than
 * swallowing an address. A signup box that silently does nothing is worse
 * than one that admits it is not ready: people use it casually and never
 * follow up, so they never find out.
 * ─────────────────────────────────────────────────────────────────────────
 */
var LIST_ENDPOINT = '';

(function () {
  var forms = document.querySelectorAll('#newsletter-form');
  if (!forms.length) return;

  Array.prototype.forEach.call(forms, function (form) {
    var msg = form.querySelector('.signup__msg');

    function say(text, ok) {
      msg.textContent = text;
      msg.hidden = false;
      msg.setAttribute('data-ok', ok ? 'true' : 'false');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.hidden = true;

      var hp = form.querySelector('[name="website"]');
      if (hp && hp.value) { form.reset(); say('Thanks. You’re on the list.', true); return; }

      var email = form.querySelector('[name="email"]').value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        say('That email address doesn’t look right. Could you check it?', false);
        return;
      }

      if (!LIST_ENDPOINT) {
        say('Not connected yet. Email hello@orgintelligence.io and we’ll add you.', false);
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      fetch(LIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form)
      })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          form.reset();
          say('Thanks. Check your email to confirm.', true);
          btn.textContent = 'Subscribed';
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'Subscribe';
          say('That didn’t send. Please try again in a moment.', false);
        });
    });
  });
})();
