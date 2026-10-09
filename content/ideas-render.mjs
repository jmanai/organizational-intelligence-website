// Shared server-side rendering. Editorial values are escaped before entering HTML.
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const e = escapeHTML;
export function safeLink(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return '';
  if (/^(https?:\/\/|mailto:)/i.test(value) || /^\/(?!\/)/.test(value) || /^#[\w-]+$/.test(value)) return value;
  return '';
}
export function assetURL(value) {
  try {const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'cdn.sanity.io' ? url : null;} catch {return null;}
}
export function imageURL(image, width = 1200) {
  const url = assetURL(image?.url); if (!url) return '';
  url.searchParams.set('w', String(width)); url.searchParams.set('auto', 'format'); url.searchParams.set('fit', 'max');
  const {width: w, height: h} = image.dimensions || {};
  const c = image.crop;
  if (c && w && h) {
    const x = Math.round((c.left || 0) * w), y = Math.round((c.top || 0) * h);
    const cw = Math.max(1, Math.round(w * (1 - (c.left || 0) - (c.right || 0))));
    const ch = Math.max(1, Math.round(h * (1 - (c.top || 0) - (c.bottom || 0))));
    url.searchParams.set('rect', `${x},${y},${cw},${ch}`);
  }
  return url.href;
}
const plain = block => (block.children || []).map(child => child.text || '').join('');
export const readingTime = article => Math.max(1, Math.ceil((article.body || []).map(plain).join(' ').split(/\s+/).filter(Boolean).length / 220));
const date = value => new Date(value).toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric', timeZone:'UTC'});
const articlePath = article => `/ideas/${article.slug}`;
const toolPath = article => `/ideas/tools/${article.slug}`;
export const topics = [['team-agreements','Team Agreements'],['better-meetings','Better Meetings'],['team-identity','Team Identity'],['strategy','Strategy']];
export function listURL({topic = '', q = '', page = 1} = {}) {
  const params = new URLSearchParams(); if (topic) params.set('topic', topic); if (q) params.set('q', q); if (page > 1) params.set('page', page);
  return '/ideas' + (params.size ? `?${params}` : '');
}
function inline(block) {
  return (block.children || []).map(child => {
    let text = e(child.text).replace(/\n/g, '<br>');
    for (const mark of child.marks || []) {
      if (mark === 'strong' || mark === 'em') text = `<${mark}>${text}</${mark}>`;
      else {const def = (block.markDefs || []).find(d => d._key === mark); const href = safeLink(def?.href); if (def?._type === 'link' && href) text = `<a href="${e(href)}">${text}</a>`;}
    }
    return text;
  }).join('');
}
export function renderBody(body = []) {
  let html = ''; const headings = [];
  // Normalize nested lists to valid HTML, including changes between bullet and numbered lists.
  const stack = [];
  const closeList = () => {html += `</li></${stack.pop()}>`;};
  body.forEach((block, index) => {
    if (block._type === 'block' && block.listItem) {
      const tag = block.listItem === 'number' ? 'ol' : 'ul';
      const level = Math.min(6, Math.max(1, Number(block.level) || 1), stack.length + 1);
      while (stack.length > level) closeList();
      if (stack.length === level && stack.at(-1) !== tag) closeList();
      if (stack.length < level) {html += `<${tag}><li>`; stack.push(tag);} else html += '</li><li>';
      html += inline(block); return;
    }
    while (stack.length) closeList();
    if (block._type === 'editorialImage') {html += imageMarkup(block, 'body-image', false, true); return;}
    if (block._type !== 'block') return;
    const tag = ['h2','h3','blockquote'].includes(block.style) ? block.style : 'p';
    const id = `section-${index + 1}`;
    if (tag === 'h2') headings.push({id, title: plain(block)});
    html += `<${tag}${tag === 'h2' || tag === 'h3' ? ` id="${id}"` : ''}>${inline(block)}</${tag}>`;
  });
  while (stack.length) closeList();
  return {html, headings};
}
function imageMarkup(image, className, priority = false, caption = false) {
  if (!imageURL(image)) return '';
  const position = image.hotspot ? `object-position:${Math.round((image.hotspot.x || .5)*100)}% ${Math.round((image.hotspot.y || .5)*100)}%` : '';
  return `<figure class="${className}"><img src="${e(imageURL(image))}" srcset="${[480,800,1200,1600].map(w => `${e(imageURL(image,w))} ${w}w`).join(', ')}" sizes="(max-width: 700px) 90vw, 65vw" alt="${e(image.alt)}" width="${Number(image.dimensions?.width) || 1200}" height="${Number(image.dimensions?.height) || 800}" style="${position}" ${priority ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">${caption && image.caption ? `<figcaption>${e(image.caption)}</figcaption>` : ''}</figure>`;
}
const topicLabel = article => article.topics?.map(t => e(t.title)).join(' / ') || 'Ways of working';
function card(article) {
  return `<article class="idea-card">${imageMarkup(article.heroImage, 'idea-card__image')}<p class="ideas-kicker">Article / ${topicLabel(article)}</p><h3><a href="${e(articlePath(article))}">${e(article.title)}</a></h3><p>${e(article.excerpt)}</p><a class="ideas-link" href="${e(articlePath(article))}">Read the article<span class="vh">: ${e(article.title)}</span></a></article>`;
}
const navigation = `<a href="/#what-we-do">What We Do</a><a href="/lego-serious-play">LEGO&reg; Serious Play&reg;</a><a href="/ideas" aria-current="page">Ideas</a><a href="/podcast">Podcast</a><a href="/about">About</a>`;
const header = `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="wrap"><a class="logo" href="/" aria-label="Organizational Intelligence, home"><img class="logo__img" src="/assets/img/logo-ink.png" width="640" height="282" alt="Organizational Intelligence"></a><nav class="nav nav--desktop" aria-label="Primary">${navigation}</nav><a class="btn btn--yellow btn--sm header-cta" href="/how-we-work-check" data-carry-source data-event="start_check" data-placement="header">WOW Assessment</a><a class="btn btn--primary btn--sm header-cta" href="/book" data-carry-source data-event="book_consultation" data-placement="header">Book a Free Consultation</a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-drawer">Menu</button></div></header><div class="nav-drawer" id="nav-drawer" data-open="false">${navigation}<a class="btn btn--yellow" href="/how-we-work-check" data-carry-source data-event="start_check" data-placement="mobile_nav">WOW Assessment</a><a class="btn btn--primary" href="/book" data-carry-source data-event="book_consultation" data-placement="mobile_nav">Book a Free Consultation</a></div>`;
const newsletter = `<section class="ideas-newsletter" id="newsletter" aria-labelledby="newsletter-title"><div><p class="ideas-kicker">Insights to your inbox</p><h2 id="newsletter-title">Occasional, practical,<br>written by a person.</h2></div><div><form class="signup__form" id="newsletter-form" novalidate><label class="vh" for="nl-email">Email address</label><input class="input" id="nl-email" name="email" type="email" autocomplete="email" placeholder="Email address" required><div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div><button class="btn btn--primary" type="submit" data-event="newsletter_signup" data-placement="ideas">Subscribe</button><p class="signup__msg" role="alert" hidden></p></form><p class="ideas-fineprint">Practical ideas about how work works. <a href="/privacy">Privacy policy</a>.</p></div></section>`;
const footer = () => `<footer class="ideas-footer"><div class="wrap"><div><strong>Organizational Intelligence</strong><p>Make work work better.</p></div><div><nav aria-label="Footer"><a href="/about">About</a><a href="/podcast">Podcast</a><a href="/privacy">Privacy</a></nav><p>&copy; ${new Date().getFullYear()} Organizational Intelligence</p></div></div></footer>`;
export function pageShell({title, description, path = '/ideas', origin, main, image, article, noindex = false}) {
  const canonical = origin + path; const social = imageURL(image,1200) || origin + '/assets/img/og-home.png';
  const schema = article ? JSON.stringify({'@context':'https://schema.org','@type':'BlogPosting',headline:article.title,description,datePublished:article.publishedAt,dateModified:article._updatedAt || article.publishedAt,author:{'@type':'Person',name:article.author?.name || 'Organizational Intelligence'},publisher:{'@type':'Organization',name:'Organizational Intelligence'},mainEntityOfPage:canonical,image:social}).replace(/</g,'\\u003c') : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(description)}"><link rel="canonical" href="${e(canonical)}">${noindex ? '<meta name="robots" content="noindex, follow">' : ''}<meta property="og:type" content="${article ? 'article' : 'website'}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${e(canonical)}"><meta property="og:image" content="${e(social)}"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml"><link rel="preload" href="/assets/fonts/anton-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/css/fonts.css"><link rel="stylesheet" href="/assets/css/oi.css?v=20261009-ideas"><link rel="stylesheet" href="/assets/css/ideas.css?v=20261009-share-icons">${schema ? `<script type="application/ld+json">${schema}</script>` : ''}</head><body class="ideas-page">${header}<main id="main" class="wrap ideas-main">${main}${newsletter}</main>${footer()}<script src="/assets/js/site.js?v=20261001-funnels" defer></script><script src="/assets/js/newsletter.js?v=20261001-funnels" defer></script><script src="/assets/js/ideas.js?v=20261009-share" defer></script></body></html>`;
}
export function renderIndex({articles, topic, q, page, hasNext, origin}) {
  const browsing = !topic && !q && page === 1;
  const featured = browsing ? (articles.find(a => a.featured) || articles[0]) : null;
  const rest = articles.filter(a => a !== featured);
  const filterTopics = [...topics];
  for (const a of articles) for (const t of a.topics || []) if (t.slug && !filterTopics.some(([slug]) => slug === t.slug)) filterTopics.push([t.slug,t.title]);
  const filters = `<div class="ideas-toolbar"><nav class="ideas-topics" aria-label="Filter by topic">${[['','All ideas'],...filterTopics].map(([slug,title]) => `<a href="${e(listURL({topic:slug,q}))}" ${topic === slug ? 'aria-current="true"' : ''}>${e(title)}</a>`).join('')}</nav><form class="ideas-search" action="/ideas" role="search">${topic ? `<input type="hidden" name="topic" value="${e(topic)}">` : ''}<label class="vh" for="idea-search">Search ideas</label><input id="idea-search" name="q" type="search" value="${e(q)}" placeholder="Search ideas" maxlength="120"><button type="submit">Search</button></form></div>`;
  const feature = featured ? `<section class="ideas-feature" aria-labelledby="featured-title">${imageMarkup(featured.heroImage,'ideas-feature__image',true)}<div><p class="ideas-kicker">${featured.featured ? 'Featured article' : 'Latest article'} / ${topicLabel(featured)}</p><h2 id="featured-title"><a href="${e(articlePath(featured))}">${e(featured.title)}</a></h2><p class="ideas-feature__summary">${e(featured.excerpt)}</p><div class="ideas-feature__meta"><span>${e(date(featured.publishedAt))}</span><a class="ideas-link" href="${e(articlePath(featured))}">Read the article</a></div></div></section>` : '';
  const results = rest.length ? `<section class="ideas-results" aria-labelledby="results-title"><div class="ideas-section-head"><h2 id="results-title">${browsing ? 'More to put to work.' : 'Ideas to put to work.'}</h2>${q || topic ? `<a href="/ideas">Clear filters</a>` : ''}</div>${q ? `<p>Search results for “${e(q)}”</p>` : ''}<div class="ideas-grid">${rest.map(card).join('')}</div></section>` : !featured ? `<section class="ideas-empty"><h2>${q || topic ? 'No ideas found.' : 'New ideas are on their way.'}</h2><p>${q || topic ? 'Try another search or explore all ideas.' : 'Visit again soon for practical thinking about working together.'}</p><a class="ideas-link" href="/ideas">${q || topic ? 'Clear filters' : 'Refresh ideas'}</a></section>` : '';
  const pagination = page > 1 || hasNext ? `<nav class="ideas-pagination" aria-label="Article pages">${page > 1 ? `<a href="${e(listURL({topic,q,page:page-1}))}">Previous page</a>` : '<span></span>'}<span>Page ${page}</span>${hasNext ? `<a href="${e(listURL({topic,q,page:page+1}))}">Next page</a>` : ''}</nav>` : '';
  return pageShell({title:'Ideas | Organizational Intelligence',description:'Practical thinking for the everyday work of working together. Explore articles and tools from Organizational Intelligence.',origin,path:listURL({topic,q,page}),noindex:!!(q || topic || page > 1),main:`<section class="ideas-intro"><div><p class="ideas-kicker">Ideas / Tools / Conversations</p><h1>Ideas for better<br>ways of working.</h1></div><p>Practical thinking for the everyday<br>work of working together.</p></section>${filters}${feature}${results}${pagination}`});
}
const shareIcons = {
  LinkedIn: '<path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96C2 21.32 2.69 22 3.55 22h16.9c.86 0 1.55-.68 1.55-1.52V3.52C22 2.68 21.31 2 20.45 2ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.51V9.2h2.83v1.3h.04c.4-.75 1.36-1.55 2.8-1.55 3 0 3.57 1.98 3.57 4.55v5.25Z"/>',
  Facebook: '<path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.25c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"/>',
  X: '<path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.42L5.56 22H2.43l8.15-9.32L2.8 2h6.41l4.43 6.77L18.9 2Zm-1.1 18h1.73L8.27 3.87H6.41L17.8 20Z"/>',
  WhatsApp: '<path d="M20.52 3.48A11.9 11.9 0 0 0 12.05 0C5.45 0 .08 5.37.08 11.97c0 2.11.55 4.18 1.6 6L0 24l6.17-1.62a11.98 11.98 0 0 0 5.87 1.5h.01C18.65 23.88 24 18.51 24 11.92c0-3.2-1.24-6.2-3.48-8.44ZM12.05 21.86a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.67.96.98-3.58-.23-.37a9.87 9.87 0 0 1-1.51-5.31c0-5.49 4.46-9.95 9.95-9.95a9.9 9.9 0 0 1 7.04 2.92 9.88 9.88 0 0 1 2.91 7.04c0 5.49-4.47 9.95-9.96 9.95Zm5.46-7.45c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.95 1.17-.17.2-.35.23-.65.08-.3-.15-1.26-.46-2.4-1.49-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.11 4.52.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35Z"/>',
  Email: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
};
export function renderArticle({article:a, related, origin}) {
  const shareURL = encodeURIComponent(origin + articlePath(a));
  const shareText = encodeURIComponent(a.title + '\n' + origin + articlePath(a));
  const shareLinks = [
    ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + shareURL],
    ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + shareURL],
    ['X', 'https://twitter.com/intent/tweet?url=' + shareURL + '&text=' + encodeURIComponent(a.title)],
    ['WhatsApp', 'https://wa.me/?text=' + shareText],
    ['Email', 'mailto:?subject=' + encodeURIComponent(a.title) + '&body=' + shareText]
  ].map(([label, href]) => `<li><a href="${e(href)}"${label === 'Email' ? '' : ' target="_blank" rel="noopener noreferrer"'}><svg class="article-share-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false">${shareIcons[label]}</svg><span>${label}</span></a></li>`).join('');
  const {html,headings} = renderBody(a.body || []); const resource = assetURL(a.resource?.url);
  const toc = headings.length ? `<nav class="article-toc" aria-label="In this article"><p class="ideas-kicker">In this article</p>${headings.map(h => `<a href="#${h.id}">${e(h.title)}</a>`).join('')}</nav>` : '';
  const download = resource ? `<aside class="article-resource"><p class="ideas-kicker">Put it to work</p><h2>${e(a.resource.label || 'A tool for your team')}</h2><p>A practical resource to use with your team.</p><a class="btn btn--primary" href="${e(toolPath(a))}">View the tool</a></aside>` : '';
  const more = related?.length ? `<section class="article-related"><h2>Keep thinking.</h2><div class="ideas-grid">${related.map(card).join('')}</div></section>` : `<section class="article-related article-related--single"><h2>Keep thinking.</h2><a class="ideas-link" href="/podcast">Explore the OI Podcast</a><a class="ideas-link" href="/ideas">Browse all ideas</a></section>`;
  const main = `<nav class="ideas-breadcrumb" aria-label="Breadcrumb"><a href="/ideas">Ideas</a>${(a.topics || []).map(t => ` / <a href="${e(listURL({topic:t.slug}))}">${e(t.title)}</a>`).join('')}</nav><article><header class="article-heading"><p class="ideas-kicker">Practical thinking</p><h1>${e(a.title)}</h1><p class="article-standfirst">${e(a.excerpt)}</p><div class="article-meta"><span>By ${e(a.author?.name || 'Organizational Intelligence')}</span><span><time datetime="${e(a.publishedAt)}">${e(date(a.publishedAt))}</time> / ${readingTime(a)} min read</span><div class="article-share"><button type="button" data-copy-link>Copy link</button><details class="article-share-menu" data-share><summary>Share <span aria-hidden="true">▾</span></summary><nav class="article-share-options" aria-label="Share this article"><p>Share this article</p><ul>${shareLinks}</ul></nav></details><span class="vh" role="status" data-share-status></span></div></div></header><div class="article-layout ${resource ? '' : 'article-layout--no-resource'}"><aside>${toc}</aside><div class="article-content"><div class="article-summary"><p class="ideas-kicker">The short version</p><p>${e(a.excerpt)}</p></div>${imageMarkup(a.heroImage,'article-cover',true,true)}<div class="article-body">${html}</div>${a.author?.bio ? `<section class="article-author"><h2>About ${e(a.author.name)}</h2><p>${e(a.author.bio)}</p></section>` : ''}</div>${download}</div></article>${more}`;
  return pageShell({title:a.seoTitle || `${a.title} | OI`,description:a.seoDescription || a.excerpt,path:articlePath(a),origin,image:a.socialImage?.url ? a.socialImage : a.heroImage,article:a,main});
}
export function renderTool({article:a, origin}) {
  const url = assetURL(a.resource.url); const download = new URL(url); download.searchParams.set('dl',a.resource.filename || 'oi-resource.pdf');
  const label = a.resource.label || 'A tool for your team';
  return pageShell({title:`${label} | OI`,description:a.excerpt,path:toolPath(a),origin,image:a.heroImage,main:`<nav class="ideas-breadcrumb" aria-label="Breadcrumb"><a href="/ideas">Ideas</a> / <a href="${e(articlePath(a))}">${e(a.title)}</a> / Tool</nav><section class="tool-hero"><div><p class="ideas-kicker">A tool to use together</p><h1>${e(label)}</h1><p class="article-standfirst">${e(a.excerpt)}</p><p class="ideas-kicker">Printable resource / PDF${a.resource.size ? ` / ${Math.max(.1,a.resource.size/1048576).toFixed(1)} MB` : ''}</p><a class="btn btn--primary" href="${e(download.href)}" data-resource-download>Download the PDF</a><p class="ideas-fineprint">Free to use. No email required.</p></div><div class="tool-preview"><object data="${e(url.href)}#toolbar=0" type="application/pdf" aria-label="PDF preview: ${e(label)}"><p>Open the PDF to preview the resource.</p><a href="${e(url.href)}" target="_blank" rel="noopener">Preview the PDF</a></object><a href="${e(url.href)}" target="_blank" rel="noopener">Open PDF preview</a></div></section><section class="tool-guidance"><div class="ideas-section-head"><h2>Make it yours.</h2><p>Use this resource to start a conversation.<br>Keep the next steps specific enough to try.</p></div><div class="ideas-grid"><div><p class="ideas-kicker">01</p><h3>Start with the friction</h3><p>Name a situation that keeps slowing your team down.</p></div><div><p class="ideas-kicker">02</p><h3>Agree on one practice</h3><p>Write down what you will do, where, and with whom.</p></div><div><p class="ideas-kicker">03</p><h3>Come back to it</h3><p>Choose when to review what is helping and what needs to change.</p></div></div><a class="ideas-link" href="${e(articlePath(a))}">Read the accompanying article</a></section><section class="tool-cta"><div><h2>Need help making it stick?</h2><p>Bring the conversation to a facilitated session.</p></div><a class="btn" href="/#what-we-do">Explore how we work</a></section>`});
}
export function renderError({status,origin}) {
  const missing = status === 404;
  return pageShell({title:`${missing ? 'Article not found' : 'Ideas unavailable'} | OI`,description:'Explore ideas from Organizational Intelligence.',origin,noindex:true,main:`<section class="ideas-empty"><p class="ideas-kicker">${status}</p><h1>${missing ? 'This idea isn’t here.' : 'We couldn’t load these ideas.'}</h1><p>${missing ? 'The link may have changed, or the article may no longer be published.' : 'Please try again in a moment.'}</p><a class="btn btn--primary" href="/ideas">Back to Ideas</a></section>`});
}
