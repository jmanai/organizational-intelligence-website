/* Build QA — §18 of the brief, run against the real pages in a real browser. */
const { chromium } = require('playwright');

const PAGES = ['index.html', 'lego-serious-play.html', 'podcast.html', 'about.html', 'book.html', 'how-we-work-check.html', 'privacy.html', '404.html'];
const BASE = process.env.QA_BASE_URL || 'http://localhost:8788/';
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {};

const issues = [];
const notes = [];
function fail(page, msg) { issues.push(`${page}: ${msg}`); }

/* WCAG relative luminance / contrast ratio */
function lum(hex) {
  const c = hex.match(/\w\w/g).map(h => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

(async () => {
  const browser = await chromium.launch(launchOptions);

  /* ---- 1. Palette contrast (design-system level, once) ---------------- */
  const PAL = { ink: '111111', paper: 'F4F2EF', cobalt: '004AFF', white: 'FFFFFF',
                lime: '9FEF04', yellow: 'FCC304', red: 'FC442E', cyan: '18C8F0' };
  const pairs = [
    ['ink on paper', PAL.ink, PAL.paper, 4.5],
    ['paper on ink', PAL.paper, PAL.ink, 4.5],
    ['white on cobalt (buttons)', PAL.white, PAL.cobalt, 4.5],
    ['lime on ink (accents)', PAL.lime, PAL.ink, 4.5],
    ['ink on yellow (highlighter)', PAL.ink, PAL.yellow, 4.5],
    ['ink on lime', PAL.ink, PAL.lime, 4.5],
    ['ink on cyan', PAL.ink, PAL.cyan, 4.5],
    ['white on ink', PAL.white, PAL.ink, 4.5],
  ];
  pairs.forEach(([name, fg, bg, min]) => {
    const r = ratio(fg, bg);
    if (r < min) fail('palette', `${name} contrast ${r.toFixed(2)}:1 < ${min}:1`);
    else notes.push(`  ${name}: ${r.toFixed(2)}:1`);
  });
  // Informational: red on paper is used for error text
  notes.push(`  red on paper: ${ratio(PAL.red, PAL.paper).toFixed(2)}:1 (error text — large/bold only)`);

  for (const file of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    const resp = await page.goto(BASE + file, { waitUntil: 'networkidle' });
    if (!resp.ok()) fail(file, `HTTP ${resp.status()}`);

    const audit = await page.evaluate(() => {
      const out = {};
      out.title = document.title;
      out.desc = (document.querySelector('meta[name="description"]') || {}).content || '';
      out.canonical = !!document.querySelector('link[rel="canonical"]');
      out.lang = document.documentElement.lang;
      out.h1s = [...document.querySelectorAll('h1')].map(h => h.textContent.trim());
      out.headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => +h.tagName[1]);
      out.imgsNoAlt = [...document.querySelectorAll('img')]
        .filter(i => i.getAttribute('alt') === null).map(i => i.getAttribute('src'));
      out.emptyAltNoPresentation = [...document.querySelectorAll('img[alt=""]')]
        .filter(i => i.getAttribute('role') !== 'presentation').map(i => i.getAttribute('src'));
      out.links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'));
      out.anchors = [...document.querySelectorAll('[id]')].map(e => e.id);
      out.emptyLinks = [...document.querySelectorAll('a')]
        .filter(a => !a.textContent.trim() && !a.getAttribute('aria-label')).length;
      out.buttonsNoName = [...document.querySelectorAll('button')]
        .filter(b => !b.textContent.trim() && !b.getAttribute('aria-label')).length;
      out.inputsNoLabel = [...document.querySelectorAll('input,select,textarea')]
        .filter(i => i.type !== 'hidden' && !i.closest('label') &&
                     !i.getAttribute('aria-label') &&
                     !document.querySelector(`label[for="${i.id}"]`)).length;
      out.skipLink = !!document.querySelector('.skip-link');
      out.hasOg = !!document.querySelector('meta[property="og:title"]');
      out.robots = (document.querySelector('meta[name="robots"]') || {}).content || '';
      // horizontal overflow
      out.docWidth = document.documentElement.scrollWidth;
      out.winWidth = window.innerWidth;
      return out;
    });

    if (!audit.title || audit.title.length > 65) fail(file, `title length ${audit.title.length} ("${audit.title}")`);
    if (!audit.desc || audit.desc.length < 60 || audit.desc.length > 175) fail(file, `meta description length ${audit.desc.length}`);
    const is404 = file === '404.html';
    if (!is404 && !audit.canonical) fail(file, 'no canonical');
    if (audit.lang !== 'en') fail(file, 'html lang missing');
    if (audit.h1s.length !== 1) fail(file, `${audit.h1s.length} h1 elements`);
    if (audit.imgsNoAlt.length) fail(file, `img without alt: ${audit.imgsNoAlt.join(', ')}`);
    if (audit.emptyAltNoPresentation.length) fail(file, `empty alt without role=presentation: ${audit.emptyAltNoPresentation.join(', ')}`);
    if (audit.emptyLinks) fail(file, `${audit.emptyLinks} link(s) with no accessible name`);
    if (audit.buttonsNoName) fail(file, `${audit.buttonsNoName} button(s) with no accessible name`);
    if (audit.inputsNoLabel) fail(file, `${audit.inputsNoLabel} form control(s) with no label`);
    if (!audit.skipLink) fail(file, 'no skip link');
    if (!is404 && !audit.hasOg) fail(file, 'no og:title');
    if (is404 && !audit.robots.includes('noindex')) fail(file, '404 page must be noindex');
    if (audit.docWidth > audit.winWidth + 1) fail(file, `horizontal overflow at 1440 (${audit.docWidth}px)`);

    // heading order: never skip a level going down
    for (let i = 1; i < audit.headings.length; i++) {
      if (audit.headings[i] - audit.headings[i - 1] > 1) {
        fail(file, `heading jumps h${audit.headings[i - 1]} -> h${audit.headings[i]}`);
        break;
      }
    }

    // internal links resolve; in-page anchors exist
    for (const href of audit.links) {
      if (/^(https?:|mailto:|tel:)/.test(href)) continue;
      if (href === '#') continue; // documented CMS placeholder
      if (href.startsWith('#')) {
        if (!audit.anchors.includes(href.slice(1))) fail(file, `dead in-page anchor ${href}`);
        continue;
      }
      const [path, hash] = href.split('#');
      if (!path || path === '/') continue;
      const r = await page.request.get(BASE + path);
      if (!r.ok()) fail(file, `broken link ${href} (HTTP ${r.status()})`);
      else if (hash) {
        const p2 = await browser.newPage();
        await p2.goto(BASE + path, { waitUntil: 'domcontentloaded' });
        const ok = await p2.evaluate(h => !!document.getElementById(h), hash);
        if (!ok) fail(file, `link ${href} points at a missing anchor`);
        await p2.close();
      }
    }

    // mobile: no horizontal overflow, tap targets big enough
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(300);
    const mob = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      smallTargets: [...document.querySelectorAll('a.btn, button, .nav-drawer a')]
        .filter(e => e.offsetParent !== null)
        .filter(e => { const r = e.getBoundingClientRect(); return r.height > 0 && r.height < 40; })
        .map(e => (e.textContent || '').trim().slice(0, 30))
    }));
    if (mob.overflow > 1) fail(file, `horizontal overflow at 375 (+${mob.overflow}px)`);
    if (mob.smallTargets.length) fail(file, `tap targets under 40px: ${mob.smallTargets.join(' | ')}`);

    // keyboard: skip link is first stop and reveals itself
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => {
      const a = document.activeElement;
      return { cls: a.className, left: a.getBoundingClientRect().left };
    });
    if (!String(firstFocus.cls).includes('skip-link')) fail(file, `first tab stop is not the skip link (${firstFocus.cls})`);
    else if (firstFocus.left < -100) fail(file, 'skip link does not become visible on focus');

    if (errors.length) fail(file, 'JS errors: ' + errors.join(' | '));
    await page.close();
    if (!issues.some(i => i.startsWith(file))) console.log(`✓ ${file}`);
  }

  /* ---- mobile nav actually opens -------------------------------------- */
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
    await page.goto(BASE + 'index.html', { waitUntil: 'networkidle' });
    await page.click('.nav-toggle');
    const open = await page.evaluate(() => {
      const d = document.getElementById('nav-drawer');
      return { open: d.getAttribute('data-open'), expanded: document.querySelector('.nav-toggle').getAttribute('aria-expanded'), visible: d.offsetHeight > 0 };
    });
    if (open.open !== 'true' || open.expanded !== 'true' || !open.visible) fail('index.html', 'mobile nav does not open correctly');
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => document.getElementById('nav-drawer').getAttribute('data-open'));
    if (closed !== 'false') fail('index.html', 'Escape does not close the mobile nav');
    else console.log('✓ mobile nav opens, Escape closes it');
    await page.close();
  }

  /* ---- the check completes on mobile without confusion ---------------- */
  {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(BASE + 'how-we-work-check.html', { waitUntil: 'networkidle' });
    await page.fill('input[name="team"]', 'QA team');
    await page.selectOption('select[name="teamSize"]', { label: '6–10' });
    await page.click('button[type="submit"]');
    for (const key of ['MEET', 'DECIDE', 'SHARE', 'AGREE', 'ALIGN']) {
      for (let q = 0; q < 4; q++) await page.check(`input[name="${key}-${q}"][value="1"]`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(200);
    }
    const done = await page.evaluate(() => ({
      heading: (document.querySelector('#check h1') || {}).textContent,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      gated: !!document.querySelector('[data-lead]')
    }));
    if (!done.heading) fail('how-we-work-check.html', 'no result heading on mobile run');
    if (done.overflow > 1) fail('how-we-work-check.html', `results overflow at 375 (+${done.overflow}px)`);
    if (!done.gated) fail('how-we-work-check.html', 'lead capture missing from results');
    if (errs.length) fail('how-we-work-check.html', 'JS errors during mobile run: ' + errs.join(' | '));
    else console.log('✓ check completes on a 375px viewport and reaches the report delivery gate');
    await page.close();
  }

  /* ---- validation actually blocks an incomplete section ---------------- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + 'how-we-work-check.html', { waitUntil: 'networkidle' });
    await page.click('button[type="submit"]');           // no team name
    let blocked = await page.evaluate(() => !!document.querySelector('#check form [data-error]:not([hidden])'));
    if (!blocked) fail('how-we-work-check.html', 'intro submits with no team name');
    await page.fill('input[name="team"]', 'QA');
    await page.selectOption('select[name="teamSize"]', { label: '2–5' });
    await page.click('button[type="submit"]');
    await page.check('input[name="MEET-0"][value="0"]');  // only one of four
    await page.click('button[type="submit"]');
    blocked = await page.evaluate(() => {
      const e = document.querySelector('#check form [data-error]:not([hidden])');
      return e ? e.textContent : null;
    });
    if (!blocked) fail('how-we-work-check.html', 'a section submits with unanswered questions');
    else console.log('✓ incomplete sections are blocked with a specific message');
    await page.close();
  }

  console.log('\nContrast ratios:');
  console.log(notes.join('\n'));
  console.log('\n' + '='.repeat(64));
  if (issues.length) { console.log('ISSUES:\n' + issues.map(i => '  ✗ ' + i).join('\n')); }
  else console.log('No issues found.');
  await browser.close();
  process.exit(issues.length ? 1 : 0);
})();
