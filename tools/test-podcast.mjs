import assert from 'node:assert/strict';
import { parseEpisodes, onRequestGet } from '../functions/api/podcast.js';
const item = (title, date, extra = '') => `<item><title>${title}</title><pubDate>${date}</pubDate><enclosure url="https://example.com/test.mp3"/><description><![CDATA[<p>First &amp; second<br/><br/>Long notes</p>]]></description><itunes:duration>47:45</itunes:duration>${extra}</item>`;
const feed = '<rss><channel><itunes:image href="https://example.com/cover.jpg"/>' +
  item('Older', '2026-09-01') + item('New &amp; latest', '2026-09-23') +
  item('Future', '2099-01-01') + item('Invalid', 'invalid') + '</channel></rss>';
const episodes = parseEpisodes(feed, Date.parse('2026-09-24'));
assert.equal(episodes.length, 2);
assert.equal(episodes[0].title, 'New & latest');
assert.equal(episodes[0].description, 'First & second');
assert.equal(episodes[0].duration, '48 min');
assert.equal(episodes[0].url, 'https://example.com/test');
assert.equal(episodes[0].image, 'https://example.com/cover.jpg');
assert.deepEqual(parseEpisodes('<html>unavailable</html>'), []);
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response(feed);
  const response = await onRequestGet();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).episodes[0].title, 'New & latest');
  globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
  assert.equal((await onRequestGet()).status, 502);
  globalThis.fetch = async () => new Response('<rss/>');
  assert.equal((await onRequestGet()).status, 502);
} finally { globalThis.fetch = originalFetch; }
console.log('Podcast parsing, latest selection, and endpoint failure checks passed.');

// Saved data must not prevent the browser from requesting the live episode.
const { readFileSync } = await import('node:fs');
const { runInNewContext } = await import('node:vm');
const client = readFileSync(new URL('../assets/js/podcast.js', import.meta.url), 'utf8');
for (const fails of [false, true]) {
  const calls = [];
  const block = { innerHTML: '', getAttribute: () => '/api/podcast', querySelector: () => null };
  const saved = { episodes: [{ title: 'Saved episode', url: 'https://example.com/saved' }] };
  runInNewContext(client, {
    document: { getElementById: () => block },
    window: { __oiEpisodes: saved, location: { protocol: 'http:' } },
    fetch: async (url) => {
      calls.push(url);
      if (fails && url === '/api/podcast') throw new Error('Offline');
      return { ok: true, json: async () => fails ? saved : { episodes: [{ title: 'New live episode', url: 'https://example.com/new' }] } };
    }
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls[0], '/api/podcast');
  assert.ok(block.innerHTML.includes(fails ? 'Saved episode' : 'New live episode'));
}
console.log('Browser refresh and saved fallback checks passed.');
