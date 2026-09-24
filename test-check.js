/* Unit tests for the How We Work Check scoring + pattern logic (§11.4–11.8).
   Runs the real engine in a real browser, so what is tested is what ships. */
const { chromium } = require('playwright');
const BASE = process.env.QA_BASE_URL || 'http://localhost:8788/';
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
  : {};

const CASES = [
  // --- §18 QA: test cases at 0, 50, 75, 100 -----------------------------
  { name: '0 — all "Not at all"', points: { MEET:[0,0,0,0], DECIDE:[0,0,0,0], SHARE:[0,0,0,0], AGREE:[0,0,0,0], ALIGN:[0,0,0,0] },
    expect: { overall: 0, band: 'Running on Defaults', dims: { MEET:0, DECIDE:0, SHARE:0, AGREE:0, ALIGN:0 },
              patternIncludes: 'default-operating-system' } },

  { name: '50 — all "Sometimes"', points: { MEET:[2,2,2,2], DECIDE:[2,2,2,2], SHARE:[2,2,2,2], AGREE:[2,2,2,2], ALIGN:[2,2,2,2] },
    expect: { overall: 50, band: 'Too Much Left to Chance', dims: { MEET:50, DECIDE:50, SHARE:50, AGREE:50, ALIGN:50 },
              patternIncludes: 'default-operating-system' } },

  { name: '75 — all "Mostly"', points: { MEET:[3,3,3,3], DECIDE:[3,3,3,3], SHARE:[3,3,3,3], AGREE:[3,3,3,3], ALIGN:[3,3,3,3] },
    expect: { overall: 75, band: 'Mostly Intentional', dims: { MEET:75, DECIDE:75, SHARE:75, AGREE:75, ALIGN:75 },
              noPatterns: true } },

  { name: '100 — all "Absolutely"', points: { MEET:[4,4,4,4], DECIDE:[4,4,4,4], SHARE:[4,4,4,4], AGREE:[4,4,4,4], ALIGN:[4,4,4,4] },
    expect: { overall: 100, band: 'Deliberately Designed', dims: { MEET:100, DECIDE:100, SHARE:100, AGREE:100, ALIGN:100 },
              noPatterns: true } },

  { name: "I don't know scores 1", points: { MEET:[1,1,1,1], DECIDE:[4,4,4,4], SHARE:[4,4,4,4], AGREE:[4,4,4,4], ALIGN:[4,4,4,4] },
    expect: { dims: { MEET: 25 } } },

  // --- §11.7 pattern triggers, one at a time ----------------------------
  { name: 'meeting problem is a decision problem (MEET<60, DECIDE<60)',
    points: { MEET:[2,2,2,2], DECIDE:[2,2,2,2], SHARE:[4,4,4,4], AGREE:[4,4,4,4], ALIGN:[4,4,4,4] },
    expect: { primaryPattern: 'meeting-not-meeting' } },

  { name: 'the meeting is the information system (MEET<60, SHARE<60)',
    points: { MEET:[2,2,2,2], DECIDE:[4,4,4,4], SHARE:[2,2,2,2], AGREE:[4,4,4,4], ALIGN:[4,4,4,4] },
    expect: { primaryPattern: 'meeting-is-information-system' } },

  { name: 'the permission problem (DECIDE<50, ALIGN>=65)',
    points: { MEET:[4,4,4,4], DECIDE:[1,1,1,1], SHARE:[4,4,4,4], AGREE:[4,4,4,4], ALIGN:[3,3,3,3] },
    expect: { primaryPattern: 'permission-problem', friction: 'DECIDE' } },

  { name: 'the ta-da organization (SHARE<50, ALIGN<60)',
    points: { MEET:[4,4,4,4], DECIDE:[4,4,4,4], SHARE:[1,1,1,1], AGREE:[4,4,4,4], ALIGN:[2,2,2,2] },
    expect: { primaryPattern: 'ta-da-organization', friction: 'SHARE' } },

  { name: 'the heroic team (OVERALL>=65, AGREE<50)',
    points: { MEET:[4,4,4,4], DECIDE:[4,4,4,4], SHARE:[3,3,3,3], AGREE:[1,1,1,1], ALIGN:[4,4,4,4] },
    expect: { primaryPattern: 'heroic-team', friction: 'AGREE' } },

  { name: 'the default operating system (4+ dimensions < 60)',
    points: { MEET:[2,2,2,2], DECIDE:[2,2,2,2], SHARE:[2,2,2,2], AGREE:[2,2,2,2], ALIGN:[4,4,4,4] },
    expect: { patternIncludes: 'default-operating-system' } },

  // --- §11.8 selection rules -------------------------------------------
  { name: 'multiple patterns: the one containing the lowest dimension wins',
    // MEET 50, DECIDE 50, SHARE 50 -> both meeting patterns fire; AGREE is lowest at 25
    points: { MEET:[2,2,2,2], DECIDE:[2,2,2,2], SHARE:[2,2,2,2], AGREE:[1,1,1,1], ALIGN:[4,4,4,4] },
    expect: { friction: 'AGREE', recommendation: 'A Team Agreements workshop' } },

  { name: 'recommendation follows the lowest dimension, not the pattern',
    points: { MEET:[1,1,1,1], DECIDE:[2,2,2,2], SHARE:[4,4,4,4], AGREE:[4,4,4,4], ALIGN:[4,4,4,4] },
    expect: { friction: 'MEET', recommendation: 'Better Meetings', primaryPattern: 'meeting-not-meeting' } },

  { name: 'ties are surfaced, not fabricated away',
    points: { MEET:[1,1,1,1], DECIDE:[1,1,1,1], SHARE:[4,4,4,4], AGREE:[4,4,4,4], ALIGN:[4,4,4,4] },
    expect: { frictionTiedCount: 2 } },

  // --- §11.5 band boundaries are inclusive at the lower edge -------------
  { name: 'band boundary 85 exactly is Deliberately Designed',
    // 16+16+16+12+8 = 68 points = 85.0%
    points: { MEET:[4,4,4,4], DECIDE:[4,4,4,4], SHARE:[4,4,4,4], AGREE:[3,3,3,3], ALIGN:[2,2,2,2] },
    expect: { overall: 85, band: 'Deliberately Designed' } },

  { name: 'just under 85 falls to Mostly Intentional',
    // 16+16+16+12+7 = 67 points = 83.75% -> 84
    points: { MEET:[4,4,4,4], DECIDE:[4,4,4,4], SHARE:[4,4,4,4], AGREE:[3,3,3,3], ALIGN:[2,2,2,1] },
    expect: { overall: 84, band: 'Mostly Intentional' } },

  { name: 'band boundary 70 is Mostly Intentional',
    points: { MEET:[3,3,3,3], DECIDE:[3,3,3,3], SHARE:[3,3,3,3], AGREE:[3,3,3,3], ALIGN:[2,2,2,2] },
    expect: { overall: 70, band: 'Mostly Intentional' } },

  { name: 'band boundary 50 is Too Much Left to Chance',
    points: { MEET:[2,2,2,2], DECIDE:[2,2,2,2], SHARE:[2,2,2,2], AGREE:[2,2,2,2], ALIGN:[2,2,2,2] },
    expect: { overall: 50, band: 'Too Much Left to Chance' } },

  { name: 'band boundary 49 is Running on Defaults',
    points: { MEET:[2,2,2,2], DECIDE:[2,2,2,2], SHARE:[2,2,2,2], AGREE:[2,2,2,2], ALIGN:[2,2,1,2] },
    expect: { overall: 49, band: 'Running on Defaults' } },
];

const GAP_CASES = [
  { leader: 80, team: 78, label: 'Shared reality' },
  { leader: 82, team: 70, label: 'Worth a conversation' },
  { leader: 82, team: 60, label: 'Perception gap' },
  { leader: 82, team: 43, label: 'Different realities' },
  { leader: 40, team: 75, label: 'Different realities' },
];

(async () => {
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(e.message));
  await page.goto(BASE + 'how-we-work-check.html', { waitUntil: 'networkidle' });

  let pass = 0, fail = 0;
  const failures = [];

  for (const c of CASES) {
    const r = await page.evaluate(pts => {
      const res = window.OICheck.score(pts);
      return {
        overall: res.overall,
        band: res.band.label,
        dims: res.dimensions,
        friction: res.friction.key,
        strength: res.strength.key,
        frictionTiedCount: res.frictionTied ? res.frictionTied.length : 1,
        primaryPattern: res.primaryPattern ? res.primaryPattern.id : null,
        patterns: res.patterns.map(p => p.id),
        recommendation: res.recommendation.title
      };
    }, c.points);

    const problems = [];
    const e = c.expect;
    if (e.overall !== undefined && r.overall !== e.overall) problems.push(`overall ${r.overall} != ${e.overall}`);
    if (e.band && r.band !== e.band) problems.push(`band "${r.band}" != "${e.band}"`);
    if (e.dims) for (const k of Object.keys(e.dims)) if (r.dims[k] !== e.dims[k]) problems.push(`${k} ${r.dims[k]} != ${e.dims[k]}`);
    if (e.friction && r.friction !== e.friction) problems.push(`friction ${r.friction} != ${e.friction}`);
    if (e.primaryPattern && r.primaryPattern !== e.primaryPattern) problems.push(`pattern "${r.primaryPattern}" != "${e.primaryPattern}"`);
    if (e.patternIncludes && !r.patterns.includes(e.patternIncludes)) problems.push(`patterns [${r.patterns}] missing ${e.patternIncludes}`);
    if (e.noPatterns && r.patterns.length) problems.push(`expected no patterns, got [${r.patterns}]`);
    if (e.recommendation && r.recommendation !== e.recommendation) problems.push(`rec "${r.recommendation}" != "${e.recommendation}"`);
    if (e.frictionTiedCount && r.frictionTiedCount !== e.frictionTiedCount) problems.push(`tied ${r.frictionTiedCount} != ${e.frictionTiedCount}`);

    if (problems.length) { fail++; failures.push(`✗ ${c.name}\n    ${problems.join('\n    ')}`); }
    else { pass++; console.log(`✓ ${c.name}`); }
  }

  for (const g of GAP_CASES) {
    const r = await page.evaluate(([l, t]) => window.OICheck.perceptionGap(l, t).band.label, [g.leader, g.team]);
    if (r !== g.label) { fail++; failures.push(`✗ gap ${g.leader}/${g.team}: "${r}" != "${g.label}"`); }
    else { pass++; console.log(`✓ gap ${g.leader}/${g.team} → ${r}`); }
  }

  // Every dimension must have exactly 4 questions in both wordings.
  const shape = await page.evaluate(() => window.OICheck.DIMENSIONS.map(d => ({
    key: d.key,
    n: d.questions.length,
    bothWordings: d.questions.every(q => q.leader && q.team),
    bands: d.bands.length
  })));
  shape.forEach(s => {
    if (s.n === 4 && s.bothWordings && s.bands === 3) { pass++; console.log(`✓ ${s.key} shape: 4 questions, leader+team wording, 3 bands`); }
    else { fail++; failures.push(`✗ ${s.key} shape wrong: ${JSON.stringify(s)}`); }
  });

  // Exercise the real reveal form: it must send the complete report, even
  // without the optional WhatsApp number. Intercept outbound submissions.
  const { validateAssessmentReport } = await import('./functions/_lib/assessment-pdf.js');
  for (const phone of ['', '+971500000000']) {
    let captured;
    await page.route('**/api/assessment', async route => {
      captured = route.request().postDataJSON();
      try {
        validateAssessmentReport(captured);
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      } catch (error) {
        await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: error.message }) });
      }
    });
    try {
      await page.goto(BASE + 'how-we-work-check.html');
      await page.locator('#check input[name="team"]').fill('QA review team');
      await page.locator('#check select[name="teamSize"]').selectOption({ index: 2 });
      await page.locator('#check button[type="submit"]').click();
      for (const key of ['MEET', 'DECIDE', 'SHARE', 'AGREE', 'ALIGN']) {
        for (let i = 0; i < 4; i++) await page.locator(`input[name="${key}-${i}"][value="2"]`).check();
        await page.locator('#check button[type="submit"]').click();
      }
      await page.locator('#check input[name="firstName"]').fill('QA');
      await page.locator('#check input[name="email"]').fill('qa@example.com');
      await page.locator('#check input[name="whatsapp"]').fill(phone);
      await page.locator('#check button[type="submit"]').click();
      await page.locator('#check .bar__track').first().waitFor({ timeout: 5000 });
      if (captured.whatsapp !== (phone || null)) throw new Error('Optional phone value changed');
      if (Object.values(captured.report.dimensions).flatMap(d => d.questions).length !== 20) throw new Error('Report questions missing');
      pass++;
      console.log(`✓ reveal form sends complete report (${phone ? 'with' : 'without'} WhatsApp)`);
    } catch (error) {
      fail++; failures.push('✗ reveal form: ' + error.message);
    } finally {
      await page.unroute('**/api/assessment');
    }
  }

  if (consoleErrors.length) { fail++; failures.push('✗ page errors: ' + consoleErrors.join(' | ')); }

  console.log('\n' + '-'.repeat(60));
  if (failures.length) console.log(failures.join('\n'));
  console.log(`${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
