import {
  assertSameOrigin, clean, escapeHtml, handleError, HttpError, json, readJson,
  sendEmail, submitHubSpotForm, validEmail, verifyTurnstile
} from "../_lib/common.js";

export async function onRequestPost(context) {
  try {
    assertSameOrigin(context.request, context.env);
    const input = await readJson(context.request);

    // Honeypot submissions get a quiet success response.
    if (clean(input.website, 200)) return json({ ok: true });

    const submission = {
      firstName: clean(input.firstName, 100),
      lastName: clean(input.lastName, 100),
      email: clean(input.email, 254).toLowerCase(),
      company: clean(input.company, 200),
      whatsapp: clean(input.whatsapp, 100),
      message: clean(input.message, 5000),
      utmSource: clean(input.utm_source, 200),
      utmMedium: clean(input.utm_medium, 200),
      utmCampaign: clean(input.utm_campaign, 200),
      ref: clean(input.ref, 500)
    };

    if (!submission.firstName || !submission.company || !submission.message || !validEmail(submission.email)) {
      throw new HttpError(400, "Please complete all required fields with a valid email.");
    }
    await verifyTurnstile(context.request, context.env, clean(input.turnstileToken, 2048));

    await submitHubSpotForm(context.env, context.env.HUBSPOT_CONTACT_FORM_ID, [
      { name: "email", value: submission.email },
      { name: "firstname", value: submission.firstName },
      { name: "lastname", value: submission.lastName },
      { name: "company", value: submission.company },
      { name: "phone", value: submission.whatsapp },
      { name: "message", value: submission.message }
    ], {
      pageUri: submission.ref,
      pageName: "OI Website — Contact"
    });

    const recipient = context.env.CONTACT_TO_EMAIL;
    if (!recipient || !validEmail(recipient)) throw new Error("Missing CONTACT_TO_EMAIL");
    const name = `${submission.firstName} ${submission.lastName}`.trim();
    const rows = [
      ["Name", name], ["Email", submission.email], ["Company", submission.company],
      ["WhatsApp", submission.whatsapp || "—"], ["Campaign", submission.utmCampaign || "—"],
      ["Source", submission.utmSource || submission.ref || "—"]
    ];
    const htmlRows = rows.map(([label, value]) =>
      `<tr><th align="left" style="padding:6px 12px 6px 0">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
    ).join("");

    await sendEmail(context.env, {
      to: [recipient],
      reply_to: submission.email,
      subject: `Website enquiry — ${submission.company}`,
      html: `<h1>New website enquiry</h1><table>${htmlRows}</table><h2>Message</h2><p style="white-space:pre-wrap">${escapeHtml(submission.message)}</p>`,
      text: `New website enquiry\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nMessage:\n${submission.message}`
    });

    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
