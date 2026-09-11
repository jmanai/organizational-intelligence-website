const { chromium } = require('playwright');
const CARDS = [
  { file:'og-home',  kicker:'A ways-of-working & facilitation studio', title:'Make work<br>work better.', accent:'#004AFF', ink:false },
  { file:'og-lsp',   kicker:'LEGO® SERIOUS PLAY®',  title:'Think with<br>your hands.', accent:'#9FEF04', ink:true },
  { file:'og-check', kicker:'Meet · Decide · Share · Agree · Align', title:'The How We<br>Work Check', accent:'#18C8F0', ink:false },
  { file:'og-about', kicker:'About', title:'Notice. Question.<br>Adapt. Evolve.', accent:'#FCC304', ink:true },
  { file:'og-ideas', kicker:'Ideas', title:'Ideas about<br>how work works.', accent:'#FC442E', ink:false },
];
const html = c => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="assets/css/fonts.css"><style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;position:relative;
  background:${c.ink?'#111111':'#F4F2EF'};color:${c.ink?'#F4F2EF':'#111111'};
  font-family:'Courier Prime',monospace;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.k{font-size:19px;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:14px}
.k::before{content:"";width:20px;height:20px;background:${c.accent}}
h1{font-family:'Anton',sans-serif;font-weight:400;font-size:104px;line-height:.9;letter-spacing:-.005em}
.f{display:flex;align-items:flex-end;justify-content:space-between;gap:32px}
.w{font-family:'Anton',sans-serif;font-size:26px;line-height:.86}
.lock{display:flex;align-items:center;gap:12px}
.t{font-size:19px;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
.dots{position:absolute;top:56px;right:64px;width:200px;height:140px;opacity:${c.ink?'.3':'.5'};
  background-image:radial-gradient(${c.ink?'#F4F2EF':'#111111'} 42%,transparent 43%);background-size:19px 19px}
</style></head><body>
<div class="dots"></div>
<div class="k">${c.kicker}</div>
<h1>${c.title}</h1>
<div class="f">
  <div class="lock"><div class="w">Organizational<br>Intelligence</div>
  <svg width="30" height="30" viewBox="0 0 24 24"><circle cx="6" cy="6" r="5.5" fill="#004AFF"/><rect x="12.5" y=".5" width="11" height="11" fill="#FF5A4D"/><path d="M11.5 12.5 L11.5 23.5 L2 18 Z" fill="#9FEF04"/><circle cx="18" cy="18" r="5.5" fill="#7A1FCC"/></svg></div>
  <div class="t">organizationalintelligence.com</div>
</div></body></html>`;
(async () => {
  const fs = require('fs');
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport:{width:1200,height:630}, deviceScaleFactor:1 });
  for (const c of CARDS) {
    fs.writeFileSync('/root/oi/site/_og.html', html(c));
    await p.goto('http://localhost:8899/_og.html', { waitUntil:'networkidle' });
    await p.waitForTimeout(400);
    await p.screenshot({ path:`/root/oi/site/assets/img/${c.file}.png` });
    console.log('✓', c.file);
  }
  fs.unlinkSync('/root/oi/site/_og.html');
  await b.close();
})();
