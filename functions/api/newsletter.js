import {
  assertSameOrigin, clean, handleError, HttpError, json, readJson,
  submitHubSpotForm, validEmail, verifyTurnstile
} from "../_lib/common.js";

export async function onRequestPost(context) {
  try {
    assertSameOrigin(context.request, context.env);
    const input = await readJson(context.request);

    // Honeypot submissions get a quiet success response.
    if (clean(input.website, 200)) return json({ ok: true });

    const email = clean(input.email, 254).toLowerCase();
    if (!validEmail(email)) throw new HttpError(400, "Please enter a valid email address.");
    await verifyTurnstile(context.request, context.env, clean(input.turnstileToken, 2048));

    await submitHubSpotForm(context.env, context.env.HUBSPOT_NEWSLETTER_FORM_ID, [
      { name: "email", value: email }
    ], {
      pageUri: clean(input.source || input.ref, 1000),
      pageName: "OI Website — Newsletter"
    });

    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
