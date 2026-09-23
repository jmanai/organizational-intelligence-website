const FEED = 'https://feeds.buzzsprout.com/2639017.rss';

function decode(value = '') {
  return value.replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi, (match, code, name) => {
    if (!code) return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[name.toLowerCase()];
    const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
  });
}
function tag(xml, name) {
  const value = xml.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '\\s*>', 'i'))?.[1] || '';
  const cdata = value.trim().match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return (cdata ? cdata[1] : decode(value)).trim();
}
function attr(xml, name, attribute) {
  const element = xml.match(new RegExp('<' + name + '\\b[^>]*>', 'i'))?.[0] || '';
  return decode(element.match(new RegExp('\\s' + attribute + '\\s*=\\s*(["\'])(.*?)\\1', 'i'))?.[2] || '');
}
function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}

export function parseEpisodes(xml, now = Date.now()) {
  const channel = xml.split(/<item(?:\s|>)/i)[0];
  const artwork = safeUrl(attr(channel, 'itunes:image', 'href'));
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>/gi)].map((match) => {
    const item = match[1];
    const audio = safeUrl(attr(item, 'enclosure', 'url'));
    const rawDuration = tag(item, 'itunes:duration');
    const seconds = /^\d+(?::\d+){0,2}$/.test(rawDuration)
      ? rawDuration.split(':').reduce((total, part) => total * 60 + Number(part), 0) : 0;
    const description = decode(tag(item, 'description').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]*>/g, ''));
    const summary = description.split(/\n/).map(line => line.trim()).find(Boolean) || '';
    return {
      number: tag(item, 'itunes:episode'), title: tag(item, 'title'),
      description: summary.length > 320 ? summary.slice(0, 317) + '…' : summary,
      published: tag(item, 'pubDate'), duration: seconds ? Math.round(seconds / 60) + ' min' : '',
      url: safeUrl(tag(item, 'link')) || audio.replace(/\.mp3(?=\?|$)/i, ''),
      audio, image: safeUrl(attr(item, 'itunes:image', 'href')) || artwork
    };
  }).filter(ep => ep.title && ep.audio && ep.url && Number.isFinite(Date.parse(ep.published)) && Date.parse(ep.published) <= now)
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
}

export async function onRequestGet() {
  try {
    const response = await fetch(FEED, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!response.ok) throw new Error('Feed unavailable');
    const episodes = parseEpisodes(await response.text());
    if (!episodes.length) throw new Error('No published episodes');
    return Response.json({ episodes: episodes.slice(0, 1) }, {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=300' }
    });
  } catch {
    return Response.json({ error: 'Podcast feed temporarily unavailable' }, {
      status: 502, headers: { 'Cache-Control': 'no-store' }
    });
  }
}
