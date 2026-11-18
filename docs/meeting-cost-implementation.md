# Meeting Cost Calculator — local implementation

November 18, 2026 (Asia/Dubai). Status: implemented and verified locally. No hosted deployment, CRM changes, or external submissions completed.

## Development location

- Source: `/Users/wajdimanai/.codex/worktrees/oi-meeting-cost/website`.
- Branch: `codex/meeting-cost-calculator`.
- Baseline: freshly fetched `origin/main`, `596c6e8e611ebf21ed469add591f6e0ba559cb4e`.
- Local preview: `http://localhost:8790/meeting-cost`.
- Design and behavior requirements: [development plan](meeting-cost-development-plan.md).

The original checkout at `/Users/wajdimanai/Downloads/oi/website` retains its unrelated local changes. Its plan/context received a pointer to this implementation; calculator code was developed only in the isolated worktree. Copied project instructions and historical context are documentation, not evidence that every locally described feature exists on this production-based branch.

## Implemented behavior

The page uses the existing production OI theme and self-hosted fonts. Calculation updates immediately, with both salary modes, 1–50 attendees, preserved individual entries during the current visit, the bulk-fill helper, all 14 currencies, all seven durations, every listed frequency, and custom annual frequency. Currency changes relabel the same numbers without conversion. Blank salaries suppress cost while valid person-hours remain available; zero salaries are valid. Range/finite validation prevents broken calculations.

The editable default is AED 25,000 average monthly salary, six attendees, one hour, weekly: AED 865.38 per meeting, AED 45,000 annually, six person-hours per meeting and 312 annually. Clear inputs removes salary data and restores default meeting settings. Reload starts a fresh default example; salaries and contact details are never persisted to browser storage.

The consultation form displays the live aggregate summary and submits an explicit allowlist of contact details, optional message, consent, attribution, and aggregate meeting context. The server recalculates totals and validates options/ranges. Raw salaries are excluded. It uses the existing HubSpot contact form schema and Resend settings, with bounded upstream calls and no sensitive error-body logging. Delivery failures after possible receipt are distinguished from ordinary validation errors; the client prevents another submission and directs the visitor to email when delivery is uncertain. There is no automatic POST retry or appointment booking.

A GET on `/api/meeting-cost-contact` supplies the public Turnstile site key if configured. When `TURNSTILE_SECRET_KEY` is enabled, also configure `TURNSTILE_SITE_KEY` for this page. Missing paired configuration disables the form with an email alternative. Local mock mode bypasses outbound delivery and verification, and its success message explicitly says no information was sent.

Analytics are limited to calculator start, redesign CTA click, and confirmed consultation submission with `form_type: meeting_cost`. This module explicitly requires production hostname, analytics consent, and a loaded Analytics client. Numeric results, salaries, and contact fields are excluded. Mock/discarded submissions do not count as confirmed leads. No GA4 account/key-event configuration was changed.

The route remains noindexed and absent from navigation and sitemap. Privacy copy describes salary memory and aggregate summary submission. No global style, site navigation, or existing contact handler was changed.

## Local run and checks

```sh
npm ci --ignore-scripts
npm run build
npx wrangler@4.164.0 pages dev dist/site --port 8790 --compatibility-date=2026-11-17 --binding INTEGRATIONS_MODE=mock --binding CONTACT_TO_EMAIL=preview@example.com
```

Use a separate shell for checks:

```sh
npm run test:meeting-cost
npm run test:workshop
PLAYWRIGHT_CHROMIUM_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:meeting-cost:browser
npm run build
git diff --check
```

The browser check defaults to port 8790; `QA_BASE_URL` overrides it. Playwright is a development dependency; use an installed Chromium path or install its browser through the standard Playwright workflow. Never point the browser test at a live environment: it verifies mock mode before creating form submissions.

Verification on November 18:

- **228 focused calculation/API checks passed.** Independent reference fixtures, all duration/frequency combinations, every currency, blank/zero/negative/extreme values, invalid enums/ranges, aggregate recomputation, missing consent, origin rejection, honeypot, escaping, Turnstile interception, mock isolation, and partial/uncertain upstream failures.
- **49 automated browser checks passed.** Switching modes, restored salaries, bulk fill, formatted paste, custom frequency, fifty attendees, large values, error-state retention, mock handoff/payload inspection, no salary/contact storage, single POST behavior, network/partial errors, keyboard mode switching, labels, and reduced motion. No JavaScript page errors captured.
- **Responsive overflow checks passed at 360, 390, 768, 1024, and 1440 pixels.** Large values also checked at 360/768/1440. Screenshot review covered 1440 × 1000 desktop and 390 × 844 mobile.
- **Primary in-app browser review passed:** individual fixture, count restoration, custom frequency, mock form submission, mobile disclosure, and final default page. Supplemental Playwright/local Chrome supplied repeatable viewport, network-interception/failure, storage, and console checks unavailable through the in-app locator surface.
- Existing workshop validation/integration regressions, packaging build, and whitespace checks passed. Dependency installation reported zero vulnerabilities at that time.
- Local `/meeting-cost` and API GET returned 200. `.html` and trailing-slash variants returned 308 redirects to `/meeting-cost`. Hosted routing and `www` redirect behavior remain unverified.

Browser report and screenshots are retained as delivery evidence in ignored `output/meeting-cost-20261118/`; they are not public build assets. Temporary exploratory artifacts were removed.

## Visual review and intentional choices

Image generation returned an unsupported-endpoint error; no generated concept was available. Implementation follows the supplied plan and inspected OI stylesheet directly, rather than claiming comparison with an unavailable concept.

| Comparison point | Reference and rendered outcome |
| --- | --- |
| Palette | Existing paper/ink/cobalt tokens reused; no gradients |
| Typography | Anton heading and primary amount; Archivo paragraphs/controls; Courier Prime source note |
| Containers | Open inputs, one square bordered result with hard offset shadow |
| Hierarchy | Primary amount exceeds page-heading type size at the full desktop reference; annual figures remain secondary |
| Copy | Plan heading, purpose, choices, result labels, supporting copy, and unified CTA retained; editable-example and validation text implement the plan |
| Mobile | Results precede inputs; native expandable breakdown keeps initial results shorter and retains all values |
| Form/footer | Required markers stay inline; dark footer links have paper-colored text |

Visual review corrected heading emphasis, required-marker wrapping, footer contrast, and mobile breakdown length. Desktop/mobile screenshots were opened with `view_image` after fixes. No outstanding material visual mismatch against the specified local theme was identified. The default in-app viewport was restored and the calculator left open for review.

## Remaining release work

- Local user review of page and proposed defaults/copy.
- Hosted-theme comparison and environment readiness verification.
- Confirm actual HubSpot form field acceptance, contact destination, paired Turnstile configuration if enabled, and notification arrival in a separately authorized live test.
- Hosted development/production release and later website-link/search-visibility decisions.
- Native iOS/VoiceOver, formal accessibility audit, and additional device checks remain unverified.
- Cross-service delivery is not transactional. The client prevents automatic/uncertain retries; durable cross-session deduplication would require further design.

No release or live delivery is implied by local mock/API/browser successes.


## Color and interaction refresh — November 18, 2026

The user requested a more fun, colorful experience within the OI theme. This revision supersedes the initial restrained color treatment while retaining the existing fonts, warm paper, square geometry, hard shadows, formulas, privacy boundaries, and integration behavior.

Changes: cobalt results with white text, yellow heading highlight and selected salary choice, lime person-hours label, yellow meeting-redesign section, numbered input groups, tactile hover/press feedback, and a brief result update fade that respects reduced motion. Added accessible attendee minus/plus buttons with 1/50 boundary disabling; direct numeric editing still works. Small-screen currency/attendee controls now stack so their labels and selected currency have more room.

Verification: build and whitespace checks passed. All **55 browser checks passed**, including six additional stepper/keyboard checks; responsive overflow checks still cover 360, 390, 768, 1024, and 1440 pixels, fifty salary fields, and extreme costs. The in-app browser showed count 6→7→6 with matching costs/time/summary, no relevant warning/error logs, and readable desktop/mobile layouts. Supplemental Playwright/local Chrome reran the full interaction/mock form/failure suite and captured screenshots. Core math/API code was unchanged in this revision; its prior 228-check verification remains the recorded result.

New text/background contrast checks passed: white/cobalt 6.13:1; secondary text/cobalt 5.14:1; ink/yellow 11.64:1; ink/lime 13.33:1. Desktop and mobile screenshots were inspected with `view_image`; a mobile highlight overlap was corrected. Primary amount, controls, selected states, supporting copy, full-page flow, and footer were visually reviewed. Native-device/formal accessibility and live delivery remain unverified.

Color-refresh evidence is outside the repository at `/Users/wajdimanai/.codex/visualizations/2026/11/18/01a1ef5e-c8f7-7822-bc02-c041531e3316/meeting-cost-color-refresh/`, including before/after images and `browser-verification.json`. Browser tests accept `QA_OUTPUT_DIR` for external evidence storage. Local preview remains `http://localhost:8790/meeting-cost`; no hosted deployment or external submission occurred.


## Restrained colors and salary focus correction — November 18, 2026

The user found the colorful revision excessive and reported blue focus outlines intersecting the salary input. The latest version restores paper-colored result/supporting sections, cobalt cost/action emphasis, a thin yellow heading underline, a small lime time rule, subdued selected states/step numbers, and lighter shadows. Removed the extra result prompt, update fade, and hover movement. Attendee −/+ controls and responsive spacing remain available.

Root cause of the field issue: the composed currency/input wrapper had a focus shadow while the inner text input independently received the global focus-visible outline. Focus is now drawn only around the full wrapper, including the currency prefix. The inner input retains keyboard accessibility through that visible outer indicator.

Build/whitespace checks and all **56 browser checks passed**, including a new focus regression at 792 × 782. The regression verifies that the currency prefix sits inside the outlined wrapper and the inner input has no competing outline. In-app review confirmed the exact individual-salary field state with a continuous outer border and no console warnings/errors. Existing responsive, keyboard, calculation, mock form, and failure checks passed. Evidence: `/Users/wajdimanai/.codex/visualizations/2026/11/18/01a1ef5e-c8f7-7822-bc02-c041531e3316/meeting-cost-refinement/`, especially `salary-focus-in-app.jpg`, desktop/mobile screenshots, and the browser verification JSON. A transient automated focused-viewport capture was discarded in favor of the verified in-app image.

This supersedes the prior color treatment. Local only; hosted delivery and native-device/formal accessibility verification remain pending.


## Balanced color restoration — November 18, 2026

The user clarified that color should be reduced, not removed, with less yellow. The earlier interpretation of “too much” as a request to remove colored surfaces was too broad. This revision supersedes that neutral treatment: restored the cobalt result panel and lime employee-time badge, while limiting yellow to the heading underline and result CTA. Salary choices, attendee buttons, step numbers, and supporting section use paper/cobalt instead of yellow surfaces. Retained the single outer salary-field focus indicator, calmer interactions, and responsive spacing. Only the scoped calculator CSS changed.

Verification: packaging build and whitespace checks passed; all 56 automated browser checks passed, including exact 792×782 salary-focus geometry, calculations, keyboard controls, responsive overflow at 360–1440, mock consultation, and failure handling. Desktop 1440×1000 and mobile 390×844 screenshots were visually inspected. In-app preview at 792×782 was refreshed and visually reviewed; page identity/content were correct, no error overlay appeared, and warning/error logs were empty. Supplemental Playwright used the existing suite because the dedicated Browser plugin/skill is not available; CUA supplied in-app visual review. Evidence: `/Users/wajdimanai/.codex/visualizations/2026/11/18/01a1ef5e-c8f7-7822-bc02-c041531e3316/meeting-cost-balanced-colors/`.

Preview remains `http://localhost:8790/meeting-cost`. Local only; hosted release, live delivery, native-device testing, and formal accessibility verification remain pending. No external submissions or service changes occurred.
