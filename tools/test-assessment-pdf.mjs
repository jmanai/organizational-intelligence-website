import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { createAssessmentPdf } from '../functions/_lib/assessment-pdf.js';
import { onRequestPost } from '../functions/api/assessment.js';
import { assessmentFixture, assessmentAssets } from './assessment-fixture.mjs';
const assets = assessmentAssets();
mkdirSync('tmp/pdfs/tests', { recursive: true });
const cases = [['sample', assessmentFixture()]];
for (const points of [0, 2, 3, 4]) {
  cases.push(['score-' + points, assessmentFixture(Object.fromEntries(['MEET','DECIDE','SHARE','AGREE','ALIGN'].map(k => [k, [points, points, points, points]])))]);
}
const long = assessmentFixture();
long.firstName = 'Zoë'; long.team = 'Équipe de stratégie – Zürich';
long.company = 'Northbank '.repeat(10); long.role = 'Senior cross-functional organizational development and operations director';
long.oneThing = 'Our team needs clearer decisions, shared context, and explicit agreements. '.repeat(40) + 'END OF COMPLETE RESPONSE.';
cases.push(['long-answer', long]);
for (const [name, input] of cases) {
  const bytes = await createAssessmentPdf(input, assets);
  const pdf = await PDFDocument.load(bytes);
  if (name === 'sample') assert.equal(pdf.getPageCount(), 7);
  if (name === 'long-answer') assert.ok(pdf.getPageCount() > 7);
  writeFileSync(`tmp/pdfs/tests/${name}.pdf`, bytes);
  writeFileSync(`tmp/pdfs/tests/${name}.json`, JSON.stringify(input));
}
await assert.rejects(createAssessmentPdf({ ...assessmentFixture(), report: {} }, assets), /complete assessment/);
await assert.rejects(createAssessmentPdf(assessmentFixture(), {}), /Missing required report asset/);

// Run the actual request handler, intercepting all external integration calls.
// No email is sent and no HubSpot contact is created by this test.
const originalFetch = globalThis.fetch, messages = [];
const env = {
  RESEND_API_KEY: 'test-only', EMAIL_FROM: 'test@example.com', CONTACT_TO_EMAIL: 'lead@example.com',
  HUBSPOT_PORTAL_ID: 'test', HUBSPOT_ASSESSMENT_FORM_ID: 'test',
  ASSETS: { fetch: async url => {
    const pathname = new URL(url).pathname;
    return new Response(readFileSync(new URL('..' + pathname, import.meta.url)));
  } }
};
const input = assessmentFixture();
const request = () => new Request('https://example.com/api/assessment', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://example.com' }, body: JSON.stringify(input)
});
try {
  globalThis.fetch = async (url, options) => {
    if (url === 'https://api.resend.com/emails') messages.push(JSON.parse(options.body));
    else assert.ok(url.startsWith('https://api.hsforms.com/'));
    return Response.json({ id: 'test-only' });
  };
  assert.equal((await onRequestPost({ request: request(), env })).status, 200);
  assert.equal(messages.length, 2);
  const lead = messages.find(m => m.to[0] === env.CONTACT_TO_EMAIL);
  assert.equal(lead.attachments.length, 1);
  assert.equal(lead.attachments[0].content_type, 'application/pdf');
  const attached = Buffer.from(lead.attachments[0].content, 'base64');
  assert.equal((await PDFDocument.load(attached)).getPageCount(), 7);
  writeFileSync('tmp/pdfs/tests/actual-email-attachment.pdf', attached);
  writeFileSync('tmp/pdfs/tests/actual-email-attachment.json', JSON.stringify(input));
} finally { globalThis.fetch = originalFetch; }
console.log('PDF generation, long answers, missing-content checks, and actual email attachment passed.');
