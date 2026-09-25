import {
  assertSameOrigin, clean, handleError, HttpError, json, readJson,
  submitHubSpotForm, validEmail, verifyTurnstile
} from '../_lib/common.js';

const fields = {
  firstName: ['firstname', 100], lastName: ['lastname', 100],
  email: ['email', 254], company: ['company', 200], whatsapp: ['mobilephone', 100],
  teamSize: ['bt_team_size', 40], teamTenure: ['bt_team_tenure', 40],
  valueNow: ['bt_value_now', 5000], improveOneThing: ['bt_improve_one_thing', 5000],
  location: ['bt_workshop_location', 1000], anythingElse: ['bt_anything_else', 5000],
  utm_source: ['bt_utm_source', 200], utm_medium: ['bt_utm_medium', 200],
  utm_campaign: ['bt_utm_campaign', 200], ref: ['bt_referrer', 1000]
};

export async function onRequestPost({ request, env }) {
  try {
    assertSameOrigin(request, env);
    const input = await readJson(request);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Invalid application.');
    if (clean(input.website, 200)) return json({ ok: true });
    const values = {};
    for (const [key, [, limit]] of Object.entries(fields)) {
      if (input[key] != null && (typeof input[key] !== 'string' || input[key].length > limit)) {
        throw new HttpError(400, 'Please shorten your answers and try again.');
      }
      values[key] = clean(input[key], limit);
    }
    const required = ['firstName', 'lastName', 'email', 'company', 'whatsapp', 'teamSize', 'teamTenure', 'valueNow', 'improveOneThing', 'location'];
    if (required.some(key => !values[key]) || !validEmail(values.email)) throw new HttpError(400, 'Please complete all required fields with a valid email.');
    if (values.whatsapp.replace(/\D/g, '').length < 7) throw new HttpError(400, 'Please enter a valid WhatsApp number including the country code.');
    if (!['2–4', '5–8', '9–12', 'More than 12'].includes(values.teamSize) ||
        !['Less than 6 months', '6–12 months', '1–2 years', 'More than 2 years'].includes(values.teamTenure)) {
      throw new HttpError(400, 'Please choose one of the listed team sizes and tenures.');
    }
    if (input.consent !== 'yes') throw new HttpError(400, 'Please confirm the workshop format works for your team.');
    await verifyTurnstile(request, env, clean(input.turnstileToken, 2048));
    // This public form belongs to the site's existing HubSpot account.
    const formId = env.HUBSPOT_BETTER_TOGETHER_FORM_ID ||
      (String(env.HUBSPOT_PORTAL_ID) === '46983756' ? 'c078a340-21e5-4bab-97e6-7c7213256102' : '');
    await submitHubSpotForm(env, formId, [
      ...Object.entries(fields).map(([key, [name]]) => ({ name, value: values[key] })),
      { name: 'bt_format_confirmed', value: 'true' }
    ], {
      pageUri: new URL('/better-together', request.url).href,
      pageName: 'Better Together, One Brick at a Time'
    });
    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
