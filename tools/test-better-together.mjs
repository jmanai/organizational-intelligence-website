import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/better-together.js';
const valid = { firstName: 'Test', lastName: 'Applicant', email: 'workshop-test@example.com', company: 'Test team', whatsapp: '+971500000000', teamSize: '5–8', teamTenure: '1–2 years', valueNow: 'Reconnect as a team', improveOneThing: 'Listening', location: 'Test office', consent: 'yes', utm_source: 'test', utm_medium: 'email', utm_campaign: 'better-together', ref: 'campaign' };
const env = { HUBSPOT_PORTAL_ID: 'test', HUBSPOT_BETTER_TOGETHER_FORM_ID: 'test' };
const request = (input, origin = 'https://example.com') => new Request('https://example.com/api/better-together', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(input) });
let calls = [];
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return new Response('{}'); };
  assert.equal((await onRequestPost({request: request(valid), env})).status, 200);
  assert.equal(calls.length, 1);
  const fields = Object.fromEntries(calls[0].body.fields.map(f => [f.name, f.value]));
  assert.equal(fields.bt_team_size, '5–8');
  assert.equal(fields.bt_format_confirmed, 'true');
  assert.equal(fields.bt_utm_source, 'test');
  assert.equal(fields.mobilephone, valid.whatsapp);
  assert.equal(calls[0].body.context.pageUri, 'https://example.com/better-together');
  for (const invalid of [{...valid, email:'bad'}, {...valid, consent:undefined}, {...valid, teamSize:'invalid'}, {...valid, teamTenure:'invalid'}, {...valid, firstName:' '}, {...valid, whatsapp:'123'}, {...valid, valueNow:'x'.repeat(5001)}, null]) {
    assert.equal((await onRequestPost({request:request(invalid), env})).status, 400);
  }
  assert.equal((await onRequestPost({request:request(valid, 'https://evil.example'),env})).status, 403);
  assert.equal((await onRequestPost({request:request({...valid, website:'bot'}),env})).status, 200);
  assert.equal(calls.length, 1, 'Invalid and honeypot requests must not contact HubSpot');
  globalThis.fetch = async () => new Response('Unavailable', {status:503});
  const oldError = console.error; console.error = () => {};
  try {
    assert.equal((await onRequestPost({request:request(valid),env})).status, 500);
    assert.equal((await onRequestPost({request:request(valid),env:{}})).status, 500);
  } finally { console.error = oldError; }
  assert.equal((await onRequestPost({request:request(valid),env:{INTEGRATIONS_MODE:'mock'}})).status, 200);
} finally { globalThis.fetch = originalFetch; }
console.log('Workshop validation, field mapping, attribution, origin, honeypot, failure, and mock-mode checks passed. No live submissions made.');
