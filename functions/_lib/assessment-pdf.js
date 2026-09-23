import { PDFDocument, PDFString, rgb, setCharacterSpacing, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const ORDER = ['MEET', 'DECIDE', 'SHARE', 'AGREE', 'ALIGN'];
const W = 595.28, H = 841.89, M = 42.52, WIDTH = W - 2 * M, BOTTOM = 786;
const color = hex => rgb(...hex.match(/\w\w/g).map(v => parseInt(v, 16) / 255));
const C = { ink: color('111111'), paper: color('F4F2EF'), white: rgb(1, 1, 1), lime: color('9FEF04'),
  red: color('FC442E'), violet: color('7A1FCC'), cyan: color('18C8F0'), blue: color('004AFF'),
  yellow: color('FCC304'), grey: color('626262'), line: color('D4D3D1') };
const ACCENT = { MEET: C.violet, DECIDE: C.cyan, SHARE: C.blue, AGREE: C.red, ALIGN: C.yellow };
const text = value => String(value ?? '').replace(/[\u2010-\u2015]/g, '-').replace(/\r\n?/g, '\n');

// Measure the actual embedded font rather than counting characters. No line limit
// is used: paragraphs grow, and sections move to a new page when needed.
function lines(value, font, size, width, tracking = 0) {
  const measure = value => font.widthOfTextAtSize(value, size) + Math.max(0, value.length - 1) * tracking;
  const result = [];
  for (const paragraph of text(value).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? line + ' ' + word : word;
      if (measure(candidate) <= width) { line = candidate; continue; }
      if (line) { result.push(line); line = ''; }
      for (const char of word) {
        if (line && measure(line + char) > width) { result.push(line); line = ''; }
        line += char;
      }
    }
    result.push(line);
  }
  return result;
}

class Layout {
  constructor(pdf, fonts) { this.pdf = pdf; this.fonts = fonts; this.pages = []; }
  page() {
    this.current = this.pdf.addPage([W, H]);
    this.pages.push(this.current);
    this.y = 58;
    this.rule(45, C.ink, 1.3);
  }
  rect(x, top, width, height, fill, border, borderWidth = 1) {
    this.current.drawRectangle({ x, y: H - top - height, width, height, color: fill,
      ...(border ? { borderColor: border, borderWidth } : {}) });
  }
  rule(top = this.y, stroke = C.line, thickness = 0.7, x = M, width = WIDTH) {
    this.current.drawLine({ start: { x, y: H - top }, end: { x: x + width, y: H - top }, thickness, color: stroke });
  }
  height(value, opts = {}) {
    const { font = 'body', size = 10.2, width = 410, leading = size * 1.55 } = opts;
    return lines(value, this.fonts[font], size, width).length * leading;
  }
  write(value, opts = {}) {
    const { font = 'body', size = 10.2, x = M, width = 410, leading = size * 1.55,
      color: fill = C.ink, flow = true, tracking = 0, italic = false } = opts;
    for (const line of lines(value, this.fonts[font], size, width, tracking)) {
      if (flow && this.y + leading > BOTTOM) this.page();
      this.current.pushOperators(setCharacterSpacing(tracking));
      this.current.drawText(line, { x, y: H - this.y - size, size, font: this.fonts[font], color: fill, ...(italic ? { ySkew: degrees(12) } : {}) });
      this.current.pushOperators(setCharacterSpacing(0));
      this.y += leading;
    }
    return this.y;
  }
  band(label, description) {
    const tokens = [{ value: label + '.', font: this.fonts.bold }, { value: description, font: this.fonts.body }]
      .flatMap(run => text(run.value).split(/\s+/).map(word => ({ word, font: run.font })));
    const size = 10.2, leading = 15.81, width = 410;
    let x = M;
    for (const { word, font } of tokens) {
      const wordWidth = font.widthOfTextAtSize(word, size);
      if (x > M && x + wordWidth > M + width) { x = M; this.y += leading; }
      if (this.y + leading > BOTTOM) this.page();
      this.current.drawText(word, { x, y: H - this.y - size, size, font, color: C.ink });
      x += wordWidth + font.widthOfTextAtSize(' ', size);
    }
    this.y += leading;
  }
  ensure(height) { if (this.y + height > BOTTOM) this.page(); }
  gap(height = 8) { this.y += height; }
  kicker(value, opts = {}) { this.write(text(value).toUpperCase(), { font: 'mono', size: 7.6, leading: 12, tracking: 1, ...opts }); }
  heading(value, opts = {}) { this.write(text(value).toUpperCase(), { font: 'heading', size: 19, leading: 19, width: 250, ...opts }); this.gap(5); }
  section(label, title) {
    this.ensure(110); this.rule(this.y, C.ink, 1.3); this.gap(13); this.kicker(label);
    if (title) this.heading(title);
  }
  image(image, x, top, width) {
    this.current.drawImage(image, { x, y: H - top - width * image.height / image.width,
      width, height: width * image.height / image.width });
  }
  link(x, top, width, height, url) {
    const annotation = this.pdf.context.register(this.pdf.context.obj({ Type: 'Annot', Subtype: 'Link',
      Rect: [x, H - top - height, x + width, H - top], Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) } }));
    this.current.node.addAnnot(annotation);
  }
}

function validate(input) {
  if (!input.report?.overallText || !input.report?.recommendation?.title || !input.report?.recommendation?.text)
    throw new Error('The complete assessment report is required.');
  for (const key of ORDER) {
    const d = input.report.dimensions?.[key];
    if (!d?.name || !d.question || !d.band?.label || !d.band.text || d.questions?.length !== 4 || d.questions.some(q => !q))
      throw new Error(`Missing assessment content for ${key}.`);
  }
}
export const validateAssessmentReport = validate;

function cover(l, d, logo) {
  l.page();
  // The template puts the rule below the wordmark, with a generous cover gap.
  l.rect(0, 0, W, 100, C.white);
  l.image(logo, M, 45, 62);
  const dateWidth = l.fonts.mono.widthOfTextAtSize(d.date.toUpperCase(), 7.6) + d.date.length - 1;
  l.y = 65; l.kicker(d.date, { x: W - M - dateWidth, width: dateWidth + 1 });
  l.rule(82, C.ink, 1.3);
  l.y = 243;
  l.kicker('Teams Ways of Working (WOW) Assessment');
  l.gap(8); l.heading('The How We Work\nCheck', { size: 41, leading: 39, width: WIDTH });
  l.gap(17);
  const bandWidth = l.fonts.mono.widthOfTextAtSize(d.band.toUpperCase(), 7.6) + d.band.length - 1 + 18;
  l.rect(M, l.y - 3, bandWidth, 18, C.red);
  l.kicker(d.band, { x: M + 9, color: C.white }); l.gap(12);
  const scoreTop = l.y;
  l.write(d.overall, { font: 'heading', size: 52, leading: 52 });
  const scoreWidth = l.fonts.heading.widthOfTextAtSize(String(d.overall), 52);
  l.y = scoreTop + 24;
  l.write('/100 overall', { font: 'heading', size: 17, color: C.grey, x: M + scoreWidth + 16 });
  l.y = scoreTop + 62;
  l.write(d.report.overallText, { size: 11.4, leading: 17.6, width: 410 });
  l.y = Math.max(638, l.y + 32);
  const rows = [ ['Team assessed', d.team, 'Company', d.company || 'Not specified'],
    ['Completed by', d.role || d.firstName, 'Team size', d.teamSize || 'Not specified'] ];
  for (const [a, av, b, bv] of rows) {
    const rowHeight = 25 + Math.max(l.height(av, { font: 'bold', width: WIDTH / 2 - 14 }), l.height(bv, { font: 'bold', width: WIDTH / 2 - 14 }));
    l.ensure(rowHeight); const top = l.y; l.rule(); l.gap(7); l.kicker(a, { color: C.grey });
    l.write(av, { font: 'bold', width: WIDTH / 2 - 14 });
    l.y = top + 7; l.kicker(b, { x: M + WIDTH / 2, color: C.grey });
    l.write(bv, { font: 'bold', x: M + WIDTH / 2, width: WIDTH / 2 - 14 });
    l.y = top + rowHeight;
  }
  l.rule(); l.gap(18);
  l.write("This report reflects one person's answers on one day. It is a starting point for a conversation, not a measurement of your team. Where it says ‘may’, that is deliberate: the assessment shows where friction is likely, not why it is there.", { size: 8.8, leading: 13.6, color: C.grey, width: WIDTH });
}

function overview(l, d) {
  l.page(); l.kicker('How to read this');
  l.heading('Five things every team\ndoes, whether or not it\ndecided how.');
  l.write('Every team meets, decides, shares information, agrees how to work, and aligns on direction. Most teams never chose how they do any of it. The score below is not a grade. It is an estimate of how much of your way of working was designed on purpose, and how much arrived by default.');
  l.gap(); l.write('A low score is not a verdict on the people. It usually means capable people are spending energy compensating for a system nobody sat down and built.');
  l.gap(18); l.section('The overall picture'); l.rule(l.y, C.ink, 1.3); l.gap(6);
  const top = l.y;
  l.write(d.overall, { font: 'heading', size: 52, leading: 52 });
  l.y = top + 24;
  const offset = l.fonts.heading.widthOfTextAtSize(String(d.overall), 52) + 16;
  l.write(`/100 · ${d.band}`, { x: M + offset, width: WIDTH - offset, font: 'heading', size: 17, color: C.grey });
  l.y = Math.max(l.y, top + 60); l.write(d.report.overallText); l.gap(15);
  const strength = d.dims[d.strength], friction = d.dims[d.friction];
  const cards = [
    { label: 'Your strength', title: `${strength.name}, at ${strength.score}/100`, body: `${strength.band.label}. This is the part of your system with the most to build on. Protect it.`, fill: C.lime },
    { label: 'Your biggest friction', title: `${d.report.frictionLabel || friction.name}${d.ties.length > 1 ? ' are tied' : ''} at ${friction.score}/100`, body: friction.band.text, fill: C.red }
  ];
  const width = (WIDTH - 10) / 2, inner = width - 18;
  const height = Math.max(...cards.map(c => 37 + l.height(c.title.toUpperCase(), { font: 'heading', size: 13, leading: 14, width: inner }) + l.height(c.body, { size: 9.6, leading: 14.9, width: inner })));
  l.ensure(height); const y = l.y;
  cards.forEach((c, i) => {
    const x = M + i * (width + 10); l.rect(x, y, width, height, c.fill, C.ink, 1.3);
    l.y = y + 10; l.kicker(c.label, { x: x + 9, width: inner });
    l.heading(c.title, { x: x + 9, width: inner, size: 13, leading: 14 });
    l.write(c.body, { x: x + 9, width: inner, size: 9.6, leading: 14.9 });
  });
  l.y = y + height;
}

function dimensions(l, d) {
  l.page(); l.kicker('Dimension by dimension'); l.heading('Where the score came\nfrom.');
  l.write('Each dimension is four statements, answered on a five-point scale. The questions are printed so you can see exactly what was measured, and so you can ask your team the same ones.', { size: 8.8, leading: 13.6, color: C.grey, width: 370 });
  l.gap(8);
  for (const key of [...ORDER].sort((a, b) => d.dims[b].score - d.dims[a].score)) {
    const dim = d.dims[key];
    const body = `${dim.band.label}. ${dim.band.text}`;
    const height = 91 + l.height(dim.question, { size: 9.6, leading: 14.8 }) + l.height(body) +
      dim.questions.reduce((sum, q) => sum + l.height(q, { width: WIDTH - 12, size: 8.9, leading: 12.6 }) + 2, 0);
    l.ensure(height); l.rule(); l.gap(13); const top = l.y;
    l.kicker(dim.name); l.y = top - 8;
    const score = String(dim.score), scoreWidth = l.fonts.heading.widthOfTextAtSize(score, 19);
    l.write(score, { font: 'heading', size: 19, x: W - M - 18 - scoreWidth, width: scoreWidth + 1, leading: 20 });
    l.y = top; l.write('/100', { font: 'heading', size: 9.5, x: W - M - 18, width: 19, color: C.grey });
    l.y = top + 18;
    const fill = dim.score < 40 ? C.red : dim.score >= 75 ? C.lime : ACCENT[key];
    l.rect(M, l.y, WIDTH, 8, C.white, C.ink, 0.9);
    if (dim.score > 0) l.rect(M + 0.5, l.y + 0.5, (WIDTH - 1) * dim.score / 100, 7, fill);
    l.gap(15); l.write(dim.question, { size: 9.6, leading: 14.8, color: C.grey, italic: true }); l.gap(3);
    l.band(dim.band.label, dim.band.text); l.gap(5); l.kicker('What we asked', { color: C.grey });
    for (const q of dim.questions) {
      l.ensure(l.height(q, { width: WIDTH - 12, size: 8.9, leading: 12.6 }));
      const top = l.y; l.write('•', { size: 8.9, color: C.grey, leading: 12.6 }); l.y = top;
      l.write(q, { x: M + 12, width: WIDTH - 12, size: 8.9, leading: 12.6, color: C.grey }); l.gap(2);
    }
    l.gap(9);
  }
}

function patterns(l, d) {
  l.page(); l.kicker('What connects them'); l.heading('The scores are symptoms.\nThis is the shape\nunderneath.');
  l.write('Individual scores show where it hurts. Patterns show how several places may be connected, which is usually the more useful thing to know.'); l.gap(15);
  const patterns = [d.report.primaryPattern, d.report.secondaryPattern].filter(Boolean);
  if (!patterns.length) {
    l.write('No combined friction pattern was triggered by these answers. Use the individual dimensions to decide what to protect and where to look more closely.'); l.gap(15);
  }
  patterns.forEach((p, index) => {
    const width = 410, label = `Drawn from: ${(p.involves || []).map(k => d.dims[k]?.name || k).join(', ')}`;
    const height = 22 + l.height(p.title.toUpperCase(), { font: 'heading', size: 14.5, leading: 15, width }) +
      l.height(p.message, { width }) + l.height(label.toUpperCase(), { font: 'mono', size: 7.6, leading: 12, width });
    l.ensure(height); const top = l.y;
    l.rect(M, top, 3, height, C.violet);
    l.kicker(index ? 'Also showing' : 'The main pattern', { x: M + 13, width, color: C.violet });
    l.heading(p.title, { x: M + 13, width, size: 14.5, leading: 15 });
    l.write(p.message, { x: M + 13, width }); l.gap(5);
    l.kicker(label, { x: M + 13, width, color: C.grey }); l.y = top + height + 12;
  });
  if (d.oneThing) {
    l.section('You told us', 'The one thing you would\nchange.'); l.gap(5);
    // Split unusually long free-text answers into bordered continuation boxes.
    const quote = lines(`“${text(d.oneThing)}”`, l.fonts.body, 11, 410);
    while (quote.length) {
      l.ensure(60);
      const count = Math.max(1, Math.floor((BOTTOM - l.y - 22) / 17));
      const part = quote.splice(0, count); const top = l.y, height = part.length * 17 + 22;
      l.rect(M, top, WIDTH, height, C.paper, C.ink, 1.3); l.rect(M, top, 3, height, C.ink);
      l.y = top + 11; l.write(part.join('\n'), { x: M + 13, width: 410, size: 11, leading: 17, flow: false });
      l.y = top + height + 10;
      if (quote.length) l.page();
    }
    l.write('Compare this with the dimensions above. Does the friction you described match what the scores suggest? Ask your team what they recognize, what they see differently, and what they would change first.');
  }
}

function recommendation(l, d) {
  l.page(); l.kicker('Where we would start'); l.gap(3);
  const rec = d.report.recommendation, inner = WIDTH - 24;
  const headingOpts = { font: 'heading', size: 20, leading: 21, width: 220 };
  const height = 42 + l.height(rec.title.toUpperCase(), headingOpts) + l.height(rec.text, { width: 410 }) +
    (rec.framing ? 8 + l.height(rec.framing, { width: 410 }) : 0);
  l.ensure(height); const top = l.y;
  l.rect(M, top, WIDTH, height, C.ink);
  l.y += 12; l.kicker('One intervention, not five', { x: M + 12, color: C.lime });
  l.heading(rec.title, { x: M + 12, width: 220, size: 20, leading: 21, color: C.paper });
  l.write(rec.text, { x: M + 12, width: 410, color: C.paper });
  if (rec.framing) { l.gap(8); l.write(rec.framing, { x: M + 12, width: 410, color: C.paper }); }
  l.y = top + height + 8;
  l.write('We recommend one thing on purpose. A report that lists five priorities has not made a choice, it has handed the choice back to you.', { size: 8.8, leading: 13.6, color: C.grey });
  l.gap(16); l.section('Before you book anything', 'Three things worth doing\nin the next two weeks.');
  l.write('None of these need us, a budget, or permission.'); l.gap(9);
  const actions = [
    ['Ask your team the same twenty questions.', 'The gap between your answers and theirs is usually the most useful number in this whole exercise. It is also the one this report cannot show you, because only one person has answered so far.'],
    ['Pick one recurring meeting and ask what decision it exists to make.', `If nobody can answer in a sentence, you have found something. Your Meet score is ${d.dims.MEET.score}/100. Use the four meeting statements to decide what to keep and what to change.`],
    ['Write down three unwritten rules your team actually follows.', `Response times, who gets consulted, what happens when someone disagrees. Writing them down is most of the work. Your Agree score is ${d.dims.AGREE.score}/100. Compare those rules with what your team thinks it has agreed.`]
  ];
  actions.forEach(([title, body], i) => {
    const width = WIDTH - 24;
    l.ensure(l.height(title, { font: 'bold', width }) + l.height(body, { width }) + 10);
    const y = l.y; l.kicker(`0${i + 1}`, { color: C.blue }); l.y = y;
    l.write(title, { x: M + 24, width, font: 'bold' }); l.write(body, { x: M + 24, width }); l.gap(10);
  });
  l.section('What this report is not');
  l.write('It is not a benchmark. There is no industry average here, and we would not trust one if there were. It is not a personality assessment, and it says nothing about anyone’s competence. It is one perspective, captured at one moment, on a system that involves everyone. Treat it as the opening of a conversation with your team rather than a conclusion about them.');
}

function closing(l, d, logo) {
  l.page(); l.kicker('One last thing'); l.heading('The score is not the\npoint.', { size: 24, leading: 24, width: 260 });
  l.write('The point is the conversation it starts. If this report is right, you already knew most of it, and what you needed was a reason to put it on the table. If it is wrong, that is worth knowing too, and worth telling us.', { width: 370 });
  l.gap(8); l.write('Either way, the next move is a conversation with your team, not with us. We are here if you want a hand with it.', { width: 370 });
  const top = 462;
  l.rect(M, top, WIDTH, 228, C.lime, C.ink, 1.3); l.y = top + 15;
  l.kicker('What happens next', { x: M + 16 }); l.gap(5);
  l.heading('Book your free assessment call.', { x: M + 16, width: 240, size: 23, leading: 23 });
  l.write('Thirty minutes, no pitch. We walk through this report together, you tell us what it got right and what it missed, and you leave with a clearer read on where to start. Whether or not you ever work with us.', { x: M + 16, width: 360 });
  l.gap(9); const buttonTop = l.y;
  l.rect(M + 16, buttonTop, 101, 32, C.ink); l.y += 7;
  l.write('BOOK THE CALL', { x: M + 27, font: 'heading', size: 13, color: C.paper });
  l.link(M + 16, buttonTop, 101, 32, 'https://orgintelligence.io/book');
  l.y = buttonTop + 41;
  l.kicker('Or reply to the email this arrived with · hello@orgintelligence.io', { x: M + 16, width: WIDTH - 32, size: 7.6 });
  l.link(M + 16, buttonTop + 41, WIDTH - 32, 26, 'mailto:hello@orgintelligence.io');
  const footerTop = 702;
  l.rect(M, footerTop, WIDTH, 82, C.ink); l.image(logo, M + 12, footerTop + 20, 55);
  const socials = [ ['LinkedIn', '/company/organizational-intelligence-oi', 'https://www.linkedin.com/company/organizational-intelligence-oi'],
    ['YouTube', '@Organizational-Intelligence', 'https://www.youtube.com/@Organizational-Intelligence'],
    ['Instagram', '@organizational.intelligence', 'https://www.instagram.com/organizational.intelligence/'] ];
  socials.forEach(([label, handle, url], i) => {
    const x = M + 81 + i * 138; l.y = footerTop + 12;
    l.kicker(label, { x, width: 126, color: C.paper });
    l.write(handle, { x, width: 126, font: 'mono', size: 6.7, leading: 9, color: C.line });
    l.link(x, footerTop + 10, 126, 38, url);
  });
  l.rule(footerTop + 57, C.grey, 0.5, M + 12, WIDTH - 24);
  l.y = footerTop + 64; l.write('hello@orgintelligence.io', { x: M + 12, size: 8, color: C.line });
  l.link(M + 12, footerTop + 61, 150, 18, 'mailto:hello@orgintelligence.io');
  l.y = footerTop + 64; l.write(d.date, { x: W - M - 130, width: 118, size: 8, color: C.line });
}

export async function createAssessmentPdf(input, assets = {}) {
  validate(input);
  for (const name of ['anton', 'archivo', 'archivoBold', 'courier', 'logoInk', 'logoLight']) {
    if (!assets[name]?.length) throw new Error(`Missing required report asset: ${name}`);
  }
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const [heading, body, bold, mono, logoInk, logoLight] = await Promise.all([
    ...['anton', 'archivo', 'archivoBold', 'courier'].map(k => pdf.embedFont(assets[k], { subset: true })),
    pdf.embedPng(assets.logoInk), pdf.embedPng(assets.logoLight)
  ]);
  pdf.setTitle(`The How We Work Check - ${text(input.team)}`);
  pdf.setCreator('Organizational Intelligence assessment report v2');
  pdf.setProducer('Organizational Intelligence');
  const date = new Date(input.submittedAt || Date.now());
  const d = { ...input, band: input.overallBand, ties: input.frictionTied || [],
    date: input.report.date || (Number.isNaN(date.getTime()) ? new Date() : date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    dims: Object.fromEntries(ORDER.map(k => [k, { ...input.report.dimensions[k], score: Number(input.dimensionPercentages[k]) }])) };
  const l = new Layout(pdf, { heading, body, bold, mono });
  cover(l, d, logoInk); overview(l, d); dimensions(l, d); patterns(l, d); recommendation(l, d); closing(l, d, logoLight);
  // Accurate page totals also cover unusually long user answers.
  l.pages.forEach((page, i) => {
    page.drawText(`${String(i + 1).padStart(2, '0')} / ${String(l.pages.length).padStart(2, '0')}`, {
      x: W - M - 35, y: 24, size: 7, font: mono, color: C.grey
    });
  });
  return pdf.save();
}

export function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
