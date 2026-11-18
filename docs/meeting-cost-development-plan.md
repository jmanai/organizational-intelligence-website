# Meeting Cost Calculator — development plan

Prepared November 18, 2026 (Asia/Dubai). Updated after user authorization to develop: the local application is implemented in the isolated `codex/meeting-cost-calculator` worktree. See the [implementation and verification record](/Users/wajdimanai/.codex/worktrees/oi-meeting-cost/website/docs/meeting-cost-implementation.md). No deployment, main-website link, or external-service change completed. The original planning details below remain the specification; the implementation record owns current status.

## Recommendation

Build a standalone, responsive tool inside the existing Organizational Intelligence website repository. Use its plain HTML/CSS/JavaScript frontend, Cloudflare Pages hosting, Pages Functions, and existing HubSpot/Resend contact integration. Keep calculation in the browser and introduce one narrowly scoped consultation endpoint.

Develop and review locally first. A protected development preview can follow when authorized. Keep the calculator out of the main navigation and sitemap until the user is ready to connect it to the main website. The eventual canonical address should follow the site's current convention: `https://orgintelligence.io/meeting-cost`. Verify the `www` redirect at release, so the address in the brief resolves correctly.

No additional frontend framework, database, authentication system, currency service, or CMS dependency is needed for this scope. Hosting and integration usage remain subject to existing service limits; incremental cost has not been audited.

## 1. Existing infrastructure and evidence

| Area | Inspected source/current evidence | Implementation consequence |
| --- | --- | --- |
| Website | `/Users/wajdimanai/Downloads/oi/website`; plain HTML, CSS, JavaScript | Add a page and small modules within this project |
| Hosting | Project records describe Cloudflare Pages; `main` production and `develop` development | Recheck current remote/deployed state before preparing a release |
| Build | `tools/build-site.mjs` copies root HTML and `assets/` into `dist/site`; Functions bundle separately | A root `meeting-cost.html` fits existing packaging without adding a directory-copy rule |
| API routing | `_routes.json` already includes `/api/*` | New `/api/meeting-cost-contact` requires no extra Function route pattern |
| Theme | `assets/css/oi.css`, `assets/css/fonts.css`, existing shared header/form styles | Reuse theme assets; keep calculator styles page-scoped |
| Contact integration | `functions/api/contact.js`, `functions/_lib/common.js` | Reuse validation/integration helpers and the existing HubSpot contact form field schema |
| Related pattern | `functions/api/change-fatigue-debrief.js` | Demonstrates a standalone request adapter around contact delivery |
| Tracking | `assets/js/site.js` | Use the established consent and production-host checks; send no salary or cost values |

Verification limits: the working tree contains substantial unrelated modified and untracked work. Local files are not proof of what is deployed. Direct HTTP requests to the production homepage, theme CSS, and proposed `www` route returned 403 during this review; this does not establish a public outage or whether the calculator route exists. Current Cloudflare configuration, HubSpot form acceptance, email delivery, and live visual parity were not verified.

Before implementation, inventory the current branch and remote base. Use an isolated `codex/meeting-cost-calculator` worktree based on the agreed release baseline; bring across only reviewed dependencies if local theme or build work is required. Do not promote the entire existing working tree.

## 2. Theme and page layout

Use the existing OI visual language in a quieter, tool-focused composition:

- Warm paper `#F4F2EF`, ink `#111111`, card surface `#F9F8F6`, and cobalt `#004AFF` for primary actions and selected states.
- Anton for display headings and the main cost figure; Archivo for readable copy, numbers in fields, and controls; Courier Prime for short labels and source notes.
- Square corners, thin rules, restrained hard offset shadows, existing self-hosted fonts, and generous spacing. Keep the meeting cost as the largest visual element.
- Use the shared light theme. The Change Fatigue Test's scoped dark mode is a separate feature and is not assumed here.
- Avoid charts, gauges, financial dashboards, additional accent colors, and decorative imagery that competes with the estimate.

The current local CSS assigns body text to Archivo, while older README/context descriptions assign narrative text to Courier Prime. Use the actual reviewed stylesheet as the implementation reference and compare with production before release; do not silently deploy a global typography change.

Page sequence:

1. Compact OI header with logo and a link back to the main website.
2. “Meeting Cost Calculator” heading and a short purpose statement: understand the time invested and whether the meeting creates enough value.
3. Calculator: input column on the left and prominent results on the right at desktop widths. Mobile stacks a compact result summary before the input controls so a 50-attendee list does not hide the estimate at the bottom. Include an accessible jump link between inputs and results.
4. Small assumptions note explaining salary-based cost and 2,080 working hours per year.
5. The supplied meeting-redesign copy, with a dated Microsoft source link.
6. Primary CTA leading to an inline consultation form, followed by a compact footer/privacy link.

Keep the complete form on the same page. This preserves the calculator context without putting salary information in URLs or persistent browser storage.

## 3. Calculator requirements and state

Implement every option in the supplied brief:

| Input | Behavior |
| --- | --- |
| Currency | AED by default; USD, EUR, GBP, SAR, QAR, KWD, BHD, OMR, CAD, AUD, CHF, SGD, INR; labels include currency names |
| Attendees | Whole number from 1 to 50; default 6 |
| Salary mode | “One average salary — Best for a quick estimate” and “Individual salaries — Best for a more precise calculation” |
| Average salary | Monthly salary per attendee; multiply by active attendee count |
| Individual salaries | One monthly field per active attendee; numbered labels, no names; calculate each attendee's hourly cost directly and sum |
| Bulk fill | “Use 25,000 for all,” with selected currency visible; deliberate user action, not an automatic overwrite |
| Duration | 15, 30, 45, 60, 90, 120, 180 minutes; default 60 |
| Frequency | One time 1; Daily 260; Weekly 52; Every two weeks 26; Monthly 12; Quarterly 4; Custom |
| Custom frequency | Visible only when selected; positive whole number of meetings per year |

Currency changes retain entered numbers, relabel the amounts, and explicitly state that no conversion occurs. Use `Intl.NumberFormat('en-US', {style: 'currency', currency, currencyDisplay: 'code'})` so currencies are unambiguous and KWD/BHD/OMR use three decimal places. Round only for display; annual cost must use the unrounded meeting cost.

Keep separate in-memory state for the average salary and individual salaries. Preserve values when switching modes. Keep up to 50 indexed salary entries so decreasing and then increasing attendee count restores previously entered values in the current session. Only active attendees contribute to calculations. New entries begin blank; the bulk-fill action provides the fast estimate path. Reset and page reload clear salary state.

Update on valid input without a Calculate button. Do not rerender the entire form on every keystroke or move keyboard focus unexpectedly. Smooth visibility transitions must honor reduced-motion preferences.

Input rules:

- Distinguish blank from zero. Zero is a valid entered salary; blank means incomplete.
- Incomplete salaries show “Enter all monthly salaries to see the cost”; continue showing employee time when attendee count and duration are valid. Do not publish a partial individual-salary sum as the full meeting cost.
- Invalid attendee count/duration suppresses dependent results. Incomplete custom frequency suppresses annual results while retaining valid per-meeting results.
- Reject negative values, fractional attendee/frequency values, nonfinite values, and unsupported enum choices. Use clear inline errors instead of silently coercing an invalid entry.
- Proposed technical bounds: monthly salaries up to 1,000,000,000 in the selected currency and custom frequency up to 100,000 meetings per year. These broad bounds prevent impractical inputs and must be explicit in validation; they are not brief requirements. Retain sufficient internal precision and validate every intermediate result as finite.
- Format thousands separators on blur/display, accept ordinary decimal entry, and avoid cursor jumps while typing. Test comma-containing paste and currency-specific decimal precision.

## 4. Calculation contract and interpretation

Use the supplied formulas exactly:

```text
hourly cost per attendee = monthly salary × 12 / 2,080
average-mode combined hourly cost = hourly cost per attendee × attendee count
individual-mode combined hourly cost = sum(each attendee's hourly cost)
meeting cost = combined hourly cost × duration hours
annual meeting cost = meeting cost × meetings per year
person-hours per meeting = attendee count × duration hours
annual person-hours = person-hours per meeting × meetings per year
```

Show “This meeting costs approximately,” the meeting cost, person-hours, annual cost, annual employee time, and a smaller breakdown of attendee count, combined hourly cost, duration, and meetings per year. For one-time meetings, preserve the annual fields but explain “Based on one meeting this year.”

Keep the assumption visible: “Based on monthly salaries and 2,080 working hours per year. Excludes benefits, overhead, and preparation time.” Daily means 260 working days. The result is an estimate of salary time invested, not proof of wasted money or cash savings available by canceling the meeting.

Independent reference cases calculated during planning:

| Case | Meeting cost | Annual cost | Person-hours | Annual person-hours |
| --- | --- | --- | --- | --- |
| 6 attendees × AED 25,000/month, 1 hour, weekly | AED 865.38 | AED 45,000.00 | 6 | 312 |
| Individual AED 10,000 + 20,000 + 30,000/month, 30 minutes, every two weeks | AED 173.08 | AED 4,500.00 | 1.5 | 39 |
| 8 attendees × AED 25,000/month, 1 hour, one time | AED 1,153.85 | AED 1,153.85 | 8 | 8 |

## 5. Consultation handoff

Recommended unified CTA, resolving the two variants in the brief:

**Let's redesign this meeting together**

**30-minute free consultation**

Supporting instruction: “Fill out the form below.”

Use first name, email, company, an optional meeting challenge/message, and a required unchecked agreement to be contacted about this request. Keep marketing subscription separate. The CTA scrolls to and focuses the inline form.

Show a read-only “Your meeting summary” above submission: currency, attendee count, salary-entry mode, duration, frequency/meetings per year, combined hourly cost, meeting cost, annual cost, and employee time. Update this with calculator edits and capture a consistent snapshot at submit. For incomplete estimates, clearly show which values are unavailable and allow a consultation request without claiming a complete estimate.

On submission:

1. Send contact information, optional message, consent, and the visible aggregate context to the same-origin endpoint. Do not transmit the individual salary array or average salary field. Combined hourly cost is still salary-derived information; explain that this summary is included with the request.
2. Validate currency and ranges server-side. Recalculate costs and person-hours from the submitted combined hourly cost, active attendee count, duration, and frequency. Treat the aggregate as user-provided context, not independently verified payroll information. Ignore client-supplied result totals.
3. Compose a bounded, readable message headed “Meeting redesign — free 30-minute consultation,” containing the validated summary and user message. Reuse the existing HubSpot contact fields and Resend notification delivery. Preserve spam/origin controls and forward any configured Turnstile token through the adapter.
4. Show success only on the endpoint's successful response. Wording: “Your request has been sent. We'll contact you to arrange a time.” A form request does not reserve a calendar appointment.
5. Preserve entries on error, prevent double clicks, and show a recovery option. Existing contact delivery is sequential (HubSpot, then Resend), so test partial failures explicitly. Avoid automatic POST retries and duplicate-lead analytics; reconcile uncertain delivery before any manual retry. Durable cross-service deduplication would require additional design if later requested.

Use the existing HubSpot message field in version one, avoiding a new CRM schema. Verify the actual form accepts the bounded message and confirm the correct destination before live use. Dedicated structured meeting properties and workflows are possible later, but are not required for the calculator.

No salary/contact data in analytics, query strings, logs, localStorage, or sessionStorage. Salary state exists only in page memory before submission. Update privacy wording for the voluntarily submitted aggregate summary. Use existing consent-gated analytics with a small event set: calculator started, redesign CTA clicked, and confirmed consultation submitted, distinguished by `form_type`/placement. Do not count default example results as user engagement or count `generate_lead` and the specific success event as two conversions.

## 6. Planned files

| File | Responsibility |
| --- | --- |
| `meeting-cost.html` | Standalone page, semantic inputs/results, copy, inline form, noindex during review |
| `assets/css/meeting-cost.css` | Scoped responsive layout and selected/error states |
| `assets/data/meeting-cost.json` | Allowed options, defaults, helper copy, source link, version |
| `assets/js/meeting-cost-core.mjs` | Pure validation/calculation functions and constants shared with the API |
| `assets/js/meeting-cost.mjs` | Input state, preservation, live formatting, accessible result updates |
| `assets/js/meeting-cost-contact.mjs` | Visible summary, request payload, loading/success/error handling |
| `functions/api/meeting-cost-contact.js` | Server validation, aggregate recalculation, existing contact adapter |
| `tools/test-meeting-cost.mjs` | Independent calculation fixtures, state/validation and mocked endpoint checks |
| `package.json` | Focused `test:meeting-cost` command |
| `privacy.html`, `CONTEXT.md` | Targeted privacy/context updates at implementation |

Inspect packaging and analytics integration before changing shared files. Reuse the site's extensionless static-page behavior and verify `/meeting-cost`, `.html` normalization, trailing-slash behavior, and the final canonical URL. Do not add an iframe or introduce a new host just to keep the tool unlinked.

## 7. Delivery sequence and acceptance

| Phase | Deliverable | Completion condition |
| --- | --- | --- |
| 1. Baseline and page shell | Isolated working copy and OI-themed responsive page | Source baseline recorded; no unrelated changes; desktop/mobile hierarchy reviewed |
| 2. Calculation and interaction | All inputs, live results, state preservation, validation | Independent math fixtures pass; blank/zero and all allowed options behave correctly |
| 3. Contact integration | Visible summary and mocked server handoff | Validated summary reaches intercepted HubSpot/email payloads; no raw salaries leak; error states preserve inputs |
| 4. QA and review | Reviewable local application and verification record | Functional, responsive, accessibility, packaging, and relevant existing regression checks pass |
| 5. Authorized preview/release | Protected preview, then optional unlinked public page | Environment and live form delivery verified at the relevant stage; no main-site link added prematurely |
| 6. Later website integration | Navigation/contextual link and search visibility | User selects placement; remove noindex and add sitemap/canonical metadata when launch is authorized |

Planning estimate: approximately 4–6 focused development days through a tested local version, depending on baseline/theme reconciliation. External access, live delivery testing, review revisions, and production release timing are separate dependencies, not guaranteed dates.

QA must cover:

- Both salary modes and switching in both directions; attendee boundaries 1/50; decrease then increase; bulk fill; refresh/reset behavior.
- All 14 currencies, including three-decimal currency output and no exchange conversion; every duration and frequency; custom frequency blank/zero/negative/fractional/large values.
- Blank, zero, negative, pasted/formatted, and very high salaries; no NaN/Infinity; annual totals derived before display rounding.
- Keyboard-only operation, fieldsets/legends, stable accessible labels, visible focus, readable errors, polite result announcements after a short pause, 44-pixel touch targets, reduced motion, 200% zoom, and contrast. Do not announce the whole results block on every keystroke.
- Responsive layouts at 360, 390, 768, 1024, and 1440 pixels; 50 salary rows; no horizontal overflow; long currency values and realistic mobile keyboard behavior.
- Calculator-to-form context, changed inputs after form opening, incomplete estimate requests, invalid/tampered payloads, blocked origins, honeypot/Turnstile behavior, upstream timeouts, partial failures, and duplicate submit attempts.
- Local `INTEGRATIONS_MODE=mock` isolation, explicitly unsent mock confirmation, and no mock lead analytics. Later authorized live testing verifies HubSpot receipt and email arrival separately.
- Focused tests, relevant analytics/contact regressions, `npm run build`, `git diff --check`, and browser visual/interaction review. A static server alone cannot verify Pages Functions.

Development and local review are the next implementation stages. No deployment or external submission is authorized by this planning task. Unlinked and noindexed are not access control; use the existing protected development environment for private review.

## 8. Proposed defaults and copy decisions

The brief defines AED, six attendees, and one hour. It does not define the initial salary, initial frequency, or every form field. Proposed version-one choices are:

- Start in average-salary mode with AED 25,000 and weekly frequency, clearly labeled as an editable example. This produces AED 865.38 per meeting and AED 45,000 annually. These are illustrative inputs, not observed customer data.
- Retain the exact supplied formula and option sets. Use the validation bounds and blank-value behavior described above.
- Use an inline consultation request form and the unified CTA above; no scheduling integration in version one.
- Keep the supplied landing copy and add “Source: Microsoft Work Trend Index, 2023.” The research year should be visible, since these are 2023 findings.

These are recommendations for implementation, not recorded user approvals. They can be adjusted during local review without preventing work on the core calculator.

## Sources

- User-supplied “Meeting Cost Calculator — Implementation Brief,” attached November 18, 2026.
- Local project sources inspected November 18: `AGENTS.md`, `CONTEXT.md`, `package.json`, `tools/build-site.mjs`, `_routes.json`, `_redirects`, `assets/css/oi.css`, `assets/css/fonts.css`, `assets/js/site.js`, `assets/js/book.js`, `book.html`, `functions/api/contact.js`, `functions/api/change-fatigue-debrief.js`, and `functions/_lib/common.js`.
- Microsoft, [2023 Work Trend Index: Will AI Fix Work?](https://www.microsoft.com/en-us/worklab/work-trend-index/will-ai-fix-work) and [2023 report announcement](https://news.microsoft.com/annual-wti-2023/). Search results from the official sources support both the 68% focus-time statistic and inefficient meetings ranking first; include the primary source link in the page.

Planning checks completed: source and build-route inspection, local change inventory, official research-source lookup, and independent arithmetic reference calculations. Application implementation, browser QA, current hosted-theme comparison, live integrations, and deployment remain pending.
