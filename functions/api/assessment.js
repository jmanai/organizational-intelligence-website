import {
  assertSameOrigin, clean, escapeHtml, handleError, HttpError, json, readJson,
  sendEmail, validEmail, verifyTurnstile
} from "../_lib/common.js";

const DIMENSIONS = ["meet", "decide", "info", "agree", "align"];

export async function onRequestPost(context) {
  try {
    assertSameOrigin(context.request, context.env);
    const input = await readJson(context.request);
    const email = clean(input.email, 254).toLowerCase();
    const firstName = clean(input.firstName, 100);
    const team = clean(input.team, 200);
    const overall = Number(input.overall);
    const percentages = input.dimensionPercentages || {};

    if (!firstName || !team || !validEmail(email) || !Number.isFinite(overall) || overall < 0 || overall > 100) {
      throw new HttpError(400, "The assessment result is incomplete.");
    }
    for (const key of DIMENSIONS) {
      const score = Number(percentages[key]);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        throw new HttpError(400, "The assessment scores are invalid.");
      }
    }
    await verifyTurnstile(context.request, context.env, clean(input.turnstileToken, 2048));

    const labels = { meet: "Meetings", decide: "Decisions", info: "Information", agree: "Agreements", align: "Alignment" };
    const scoreLines = DIMENSIONS.map((key) => `${labels[key]}: ${Number(percentages[key])}/100`);
    const band = clean(input.overallBand, 100);
    const recommendation = clean(input.recommendation, 500);
    const summary = [
      `${team} — Ways of Working Assessment`,
      `Overall: ${overall}/100${band ? ` — ${band}` : ""}`,
      "",
      ...scoreLines,
      "",
      `Strength: ${clean(input.strength, 100)}`,
      `Friction: ${clean(input.friction, 100)}`,
      `Recommended place to start: ${recommendation}`
    ].join("\n");

    await sendEmail(context.env, {
      to: [email],
      subject: `Your Ways of Working report — ${team}`,
      html: `<p>Hi ${escapeHtml(firstName)},</p><p>Here is the result you requested for <strong>${escapeHtml(team)}</strong>.</p><pre style="font:14px/1.6 ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(summary)}</pre><p>Reply to this email if you would like to talk through it.</p>`,
      text: `Hi ${firstName},\n\nHere is the result you requested.\n\n${summary}\n\nReply to this email if you would like to talk through it.`
    });

    const leadRecipient = context.env.CONTACT_TO_EMAIL;
    if (leadRecipient && validEmail(leadRecipient)) {
      await sendEmail(context.env, {
        to: [leadRecipient],
        reply_to: email,
        subject: `New assessment lead — ${team}`,
        text: `${firstName} <${email}> completed an assessment.\n\n${summary}\n\nRole: ${clean(input.role, 200)}\nWhatsApp: ${clean(input.whatsapp, 100) || "—"}\nOne thing: ${clean(input.oneThing, 2000) || "—"}`
      });
    }

    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}

