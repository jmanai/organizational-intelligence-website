const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function readJson(request, maxBytes = 32_000) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new HttpError(415, "Expected JSON.");

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new HttpError(413, "Submission is too large.");

  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "Submission is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function clean(value, maxLength = 500) {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

export function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

export function assertSameOrigin(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const allowed = clean(env.ALLOWED_ORIGINS, 1000)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const requestOrigin = new URL(request.url).origin;
  if (origin !== requestOrigin && !allowed.includes(origin)) {
    throw new HttpError(403, "Origin not allowed.");
  }
}

export async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) return;
  if (!token) throw new HttpError(400, "Please confirm you are human.");

  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) body.append("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });
  const result = await response.json();
  if (!result.success) throw new HttpError(400, "Human verification failed. Please try again.");
}

export async function sendEmail(env, message) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new Error("Missing RESEND_API_KEY or EMAIL_FROM");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, ...message })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend rejected an email", response.status, detail.slice(0, 500));
    throw new Error("Email delivery failed");
  }
  return response.json();
}

export async function submitHubSpotForm(env, formId, fields, context = {}) {
  const portalId = clean(env.HUBSPOT_PORTAL_ID, 30);
  const safeFormId = clean(formId, 100);
  if (!portalId || !safeFormId) throw new Error("Missing HubSpot form configuration");

  const response = await fetch(
    `https://api.hsforms.com/submissions/v3/integration/submit/${encodeURIComponent(portalId)}/${encodeURIComponent(safeFormId)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fields: fields
          .filter((field) => field.value != null && String(field.value).trim() !== "")
          .map((field) => ({ name: field.name, value: String(field.value) })),
        context: Object.fromEntries([
          ["pageUri", clean(context.pageUri, 1000)],
          ["pageName", clean(context.pageName, 200)]
        ].filter(([, value]) => value))
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    console.error("HubSpot rejected a form submission", response.status, detail.slice(0, 500));
    throw new Error("HubSpot submission failed");
  }
}

export function handleError(error) {
  if (error instanceof HttpError) return json({ ok: false, error: error.message }, error.status);
  console.error(error);
  return json({ ok: false, error: "We could not send that right now. Please try again." }, 500);
}
