import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/better-together.js';
const valid = { firstName: 'Test', lastName: 'Applicant', email: 'workshop-test@example.com', company: 'Test team', whatsapp: '+971500000000', teamSize: '5–8', teamTenure: '1–2 years', valueNow: 'Reconnect as a team', improveOneThing: 'Listening', location: 'Test office', consent: 'yes', utm_source: 'test', utm_medium: 'email', utm_campaign: 'better-together', ref: 'campaign' };
const env = { HUBSPOT_PORTAL_ID: 'test', HUBSPOT_BETTER_TOGETHER_FORM_ID: 'test', RESEND_API_KEY: 'test-only', EMAIL_FROM: 'Test <test@example.com>' };
const request = (input, origin = 'https://example.com') => new Request('https://example.com/api/better-together', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(input) });
let calls = [];
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return new Response('{}'); };
  assert.equal((await onRequestPost({request: request(valid), env})).status, 200);
  assert.equal(calls.length, 3);
  const fields = Object.fromEntries(calls[0].body.fields.map(f => [f.name, f.value]));
  assert.equal(fields.bt_team_size, '5–8');
  assert.equal(fields.bt_format_confirmed, 'true');
  assert.equal(fields.bt_utm_source, 'test');
  assert.equal(fields.mobilephone, valid.whatsapp);
  assert.equal(calls[0].body.context.pageUri, 'https://example.com/better-together');
  const notification = calls[1].body;
  assert.equal(calls[1].url, 'https://api.resend.com/emails');
  assert.deepEqual(notification.to, ['hello@orgintelligence.io']);
  assert.equal(notification.reply_to, valid.email);
  assert.equal(notification.subject, 'Better Together form — Test team');
  assert.match(notification.text, /came from the better-together form/);
  for (const key of ['firstName', 'lastName', 'email', 'company', 'whatsapp', 'teamSize', 'teamTenure', 'valueNow', 'improveOneThing', 'location', 'utm_source', 'utm_medium', 'utm_campaign', 'ref']) {
    assert.ok(notification.text.includes(valid[key]), `Email missing ${key}`);
  }
  assert.match(notification.text, /Workshop format confirmed: Yes/);
  const confirmation = calls[2].body;
  assert.deepEqual(confirmation.to, [valid.email]);
  assert.equal(confirmation.reply_to, 'hello@orgintelligence.io');
  assert.equal(confirmation.subject, 'We’ve received your Better Together application');
  assert.ok(confirmation.text.startsWith(`Hi ${valid.firstName},`));
  assert.match(confirmation.text, /be in touch soon/);
  assert.match(confirmation.text, /once the teams have been selected/);
  assert.ok(!confirmation.text.includes(valid.valueNow), 'Confirmation should not repeat private team answers');
  for (const invalid of [{...valid, email:'bad'}, {...valid, consent:undefined}, {...valid, teamSize:'invalid'}, {...valid, teamTenure:'invalid'}, {...valid, firstName:' '}, {...valid, whatsapp:'123'}, {...valid, valueNow:'x'.repeat(5001)}, null]) {
    assert.equal((await onRequestPost({request:request(invalid), env})).status, 400);
  }
  assert.equal((await onRequestPost({request:request(valid, 'https://evil.example'),env})).status, 403);
  assert.equal((await onRequestPost({request:request({...valid, website:'bot'}),env})).status, 200);
  assert.equal(calls.length, 3, 'Invalid and honeypot requests must not contact HubSpot or send email');
  await onRequestPost({ request: request({...valid, firstName: '<img src=x onerror=alert(1)>', anythingElse: '<script>alert(1)</script>\nSecond line'}), env });
  assert.ok(calls[4].body.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!calls[4].body.html.includes('<script>'));
  assert.ok(calls[4].body.text.includes('<script>alert(1)</script>\nSecond line'));
  assert.ok(calls[5].body.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!calls[5].body.html.includes('<img'));
  globalThis.fetch = async () => new Response('Unavailable', {status:503});
  const oldError = console.error; console.error = () => {};
  try {
    assert.equal((await onRequestPost({request:request(valid),env})).status, 500);
    assert.equal((await onRequestPost({request:request(valid),env:{}})).status, 500);
    // Email failure must not be reported as a successful application.
    globalThis.fetch = async url => new Response('{}', {status: String(url).includes('api.resend.com') ? 503 : 200});
    assert.equal((await onRequestPost({request:request(valid),env})).status, 500);
    let emailCount = 0;
    globalThis.fetch = async url => {
      const isConfirmation = String(url).includes('api.resend.com') && ++emailCount === 2;
      return new Response('{}', {status: isConfirmation ? 503 : 200});
    };
    assert.equal((await onRequestPost({request:request(valid),env})).status, 500);
    assert.equal(emailCount, 2, 'Exercise applicant confirmation failure after internal notification');
  } finally { console.error = oldError; }
  assert.equal((await onRequestPost({request:request(valid),env:{INTEGRATIONS_MODE:'mock'}})).status, 200);
} finally { globalThis.fetch = originalFetch; }
console.log('Workshop validation, field mapping, attribution, email recipient/content/escaping, origin, honeypot, failure, and mock-mode checks passed. No live submissions made.');
