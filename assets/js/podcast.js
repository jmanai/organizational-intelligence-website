/* Fetch the latest published RSS episode through our same-origin endpoint.
 * Saved data and HTML keep the player available if the feed is unavailable.
 */
(function () {
  var block = document.getElementById('latest-episode');
  if (!block) return;

  var endpoint = block.getAttribute('data-feed-endpoint');
  var sources = (endpoint ? [endpoint] : []).concat(['assets/data/episodes.json']);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function when(raw) {
    var d = new Date(raw);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function render(ep) {
    if (!ep || !ep.title) return;
    var meta = [ep.number ? 'Episode ' + ep.number : '', ep.duration, when(ep.published)]
      .filter(Boolean).join('  ·  ');

    /* Play it here rather than sending people away. The audio file is served
       cross-origin by the podcast host, which is fine for <audio> playback —
       CORS only restricts reading the bytes, not playing them. Custom controls
       rather than the browser default, which would look foreign in this design. */
    var player = ep.audio
      ? '<div class="player" data-player>' +
          '<audio preload="none" src="' + esc(ep.audio) + '"></audio>' +
          '<button class="player__play" type="button" data-play aria-label="Play episode">' +
            '<span class="player__icon" data-icon aria-hidden="true"></span>' +
          '</button>' +
          '<div class="player__track">' +
            '<input class="player__seek" type="range" min="0" max="1000" value="0" step="1" ' +
              'aria-label="Seek within episode" data-seek>' +
            '<p class="player__time"><span data-now>0:00</span> / <span data-dur>' + esc(ep.duration || '0:00') + '</span></p>' +
          '</div>' +
        '</div>'
      : '';

    /* Episode artwork, when the feed carries it. Decorative: the title is
       right beside it, so an alt text would only repeat what is already read. */
    var art = ep.image
      ? '<img class="ep-art" src="' + esc(ep.image) + '" alt="" role="presentation" aria-hidden="true" width="300" height="300" loading="lazy">'
      : '';

    block.innerHTML =
      '<p class="card__index">Latest episode</p>' +
      art +
      '<h3>' + esc(ep.title) + '</h3>' +
      (ep.description ? '<p class="card__prompt" style="color:var(--paper);">' + esc(ep.description) + '</p>' : '') +
      (meta ? '<p class="idea__meta meta mt-3" style="color:var(--paper);">' + esc(meta) + '</p>' : '') +
      player +
      '<p class="meta mt-3" style="color:var(--paper);opacity:.7;">' +
      '<a href="' + esc(ep.url) + '" target="_blank" rel="noopener" ' +
      'data-event="podcast_listen" data-placement="latest_episode_notes">Show notes and other platforms &rarr;</a></p>';

    EP_URL = ep.url || '';

    /* Artwork is hosted by the podcast host. If it does not load, drop the
       element rather than leaving a broken-image box in the card. */
    var artEl = block.querySelector('.ep-art');
    if (artEl) {
      artEl.addEventListener('error', function () {
        if (artEl.parentNode) artEl.parentNode.removeChild(artEl);
      });
    }

    if (ep.audio) wirePlayer(block.querySelector('[data-player]'));
  }

  /* ---- Player ------------------------------------------------------------ */
  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  var EP_URL = '';

  function wirePlayer(root) {
    var audio = root.querySelector('audio');
    var btn   = root.querySelector('[data-play]');
    var seek  = root.querySelector('[data-seek]');
    var now   = root.querySelector('[data-now]');
    var dur   = root.querySelector('[data-dur]');
    var scrubbing = false;
    var counted = false;

    /* One visible failure path, whatever the cause. */
    function fail() {
      if (root.getAttribute('data-error') === 'true') return;
      root.setAttribute('data-error', 'true');
      var note = document.createElement('p');
      note.className = 'player__error';
      note.setAttribute('role', 'status');
      note.innerHTML = 'This player could not load the audio here. ' +
        '<a href="' + esc(EP_URL) + '" target="_blank" rel="noopener">Play it on the episode page</a>.';
      root.appendChild(note);
    }

    audio.addEventListener('error', fail);

    function setState(playing) {
      root.setAttribute('data-playing', playing ? 'true' : 'false');
      btn.setAttribute('aria-label', playing ? 'Pause episode' : 'Play episode');
    }

    btn.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().catch(function () {
          /* Blocked or unreachable: say so rather than sitting there looking
             broken. The most common cause is a sandboxed preview that forbids
             external media, so point at the episode page as the way through. */
          fail();
        });
      } else { audio.pause(); }
    });

    audio.addEventListener('play', function () {
      setState(true);
      if (!counted) {                       /* count a play once, like a click */
        counted = true;
        try {
          var detail = { event: 'podcast_listen', placement: 'latest_episode_player', label: 'play' };
          document.dispatchEvent(new CustomEvent('oi:track', { detail: detail }));
        } catch (e) {}
      }
    });
    audio.addEventListener('pause', function () { setState(false); });
    audio.addEventListener('ended', function () { setState(false); seek.value = 0; now.textContent = '0:00'; });

    audio.addEventListener('loadedmetadata', function () {
      if (isFinite(audio.duration)) dur.textContent = fmt(audio.duration);
    });

    audio.addEventListener('timeupdate', function () {
      if (scrubbing || !isFinite(audio.duration)) return;
      seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
      now.textContent = fmt(audio.currentTime);
      root.style.setProperty('--played', (audio.currentTime / audio.duration) * 100 + '%');
    });

    seek.addEventListener('input', function () {
      scrubbing = true;
      root.style.setProperty('--played', (seek.value / 10) + '%');
      if (isFinite(audio.duration)) now.textContent = fmt((seek.value / 1000) * audio.duration);
    });
    seek.addEventListener('change', function () {
      if (isFinite(audio.duration)) audio.currentTime = (seek.value / 1000) * audio.duration;
      scrubbing = false;
    });
  }

  /* Show the saved episode immediately, then refresh from the live feed. */
  if (window.__oiEpisodes && window.__oiEpisodes.episodes && window.__oiEpisodes.episodes.length) {
    render(window.__oiEpisodes.episodes[0]);
    if (!endpoint || window.location.protocol === 'file:') return;
  }

  (function attempt(i) {
    if (i >= sources.length) return;                 // keep the markup fallback
    fetch(sources[i], { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var eps = data && (data.episodes || data.items);
        if (eps && eps.length) render(eps[0]);
        else throw new Error('empty feed');
      })
      .catch(function () { attempt(i + 1); });
  })(0);
})();
