# Organizational Intelligence — website

A static site built from `Organizational_Intelligence_Website_Build_Brief.docx` and
`OIStyleGuide.pdf`. No build step, no dependencies, no framework. Open `index.html`
in a browser and it runs.

---

## Contents

```
index.html                 Homepage — the cost -> possibility -> territories arc
lego-serious-play.html     §8 — LSP method page
about.html                 §9 — About
podcast.html               The OI Podcast
ideas-archive.html         PARKED — the previous Ideas layout, noindexed
how-we-work-check.html     §11–§14 — the assessment
book.html                  Booking flow (scheduler embed slot)

assets/css/oi.css          The design system
assets/css/fonts.css       @font-face declarations
assets/fonts/*.woff2       Anton, Archivo, Courier Prime (self-hosted, 168 KB total)
assets/js/site.js          Header, mobile nav, source tracking, analytics events
assets/js/check.js         The How We Work Check — questions, scoring, patterns
assets/img/                Lockups, workshop photography, hero animation,
                           cut-outs, favicon, social cards
```

Total page weight is around 250 KB for the homepage including fonts and the
portrait. Nothing is loaded from a third party.

---

## Hosting and environments

The site is designed for Cloudflare Pages with Git integration:

- `main` is the production branch and deploys to `orgintelligence.io`.
- `develop` is the stable development branch and deploys to
  `develop.organizational-intelligence-website.pages.dev`.
- Other branches receive disposable preview URLs for review before merge.

The Cloudflare production hostname is
`organizational-intelligence-website.pages.dev` until the custom domain is attached.

There is no build command. Set the Pages build output directory to `/` (the
repository root). The `_routes.json` file ensures only `/api/*` requests invoke
Pages Functions; all static files remain on the unlimited static asset path.

### Server-side forms

Cloudflare Pages Functions provide these same-origin routes:

- `POST /api/contact` sends the consultation enquiry to the configured inbox.
- `POST /api/assessment` sends the visitor's report and a lead notification. The
  internal notification includes a branded PDF with the full assessment result.
- `POST /api/newsletter` records a newsletter signup in HubSpot.

All three routes submit their successful lead capture to dedicated HubSpot
forms. Resend remains responsible for transactional and notification email.

Configure these secrets separately for Cloudflare's Preview and Production
environments:

| Variable | Purpose | Example |
|---|---|---|
| `INTEGRATIONS_MODE` | Set to `mock` locally to prevent outbound HubSpot and Resend calls | `mock` |
| `RESEND_API_KEY` | Resend server API key | `re_...` |
| `EMAIL_FROM` | Verified sender identity | `OI Website <website@orgintelligence.io>` |
| `CONTACT_TO_EMAIL` | Enquiry and lead destination | `hello@orgintelligence.io` |
| `HUBSPOT_PORTAL_ID` | HubSpot account ID | `46983756` |
| `HUBSPOT_NEWSLETTER_FORM_ID` | Newsletter form ID | HubSpot form UUID |
| `HUBSPOT_CONTACT_FORM_ID` | Contact form ID | HubSpot form UUID |
| `HUBSPOT_ASSESSMENT_FORM_ID` | Assessment form ID | HubSpot form UUID |
| `ALLOWED_ORIGINS` | Extra allowed origins, comma separated | `https://develop.example.pages.dev` |
| `TURNSTILE_SECRET_KEY` | Optional until the Turnstile widget is added | secret from Cloudflare |

Do not commit real values. For local development, copy `.dev.vars.example` to
`.dev.vars`, fill in test credentials, then run:

```sh
npx wrangler pages dev .
```

Keep `INTEGRATIONS_MODE=mock` in the local `.dev.vars` file. In mock mode the
Pages Functions perform their normal validation and return successful responses,
but they do not create HubSpot contacts or send Resend emails. Do not define
this variable in Cloudflare Preview or Production; those environments use the
real integrations.

Use a Resend test recipient in Preview. Production should use a separate API
key and the real `CONTACT_TO_EMAIL` value. If `TURNSTILE_SECRET_KEY` is absent,
server-side Turnstile enforcement is disabled; enable it only when its frontend
widget and site key have also been configured.

### Domain setup

Keep the registration at GoDaddy, add `orgintelligence.io` as a Cloudflare DNS
zone, and replace the GoDaddy nameservers with the assigned Cloudflare
nameservers. Preserve existing MX records. Attach the apex domain and `www` in
the Pages project, choose one canonical hostname, and redirect the other.

Resend will provide DKIM and SPF DNS records for its sending subdomain. These
authenticate outbound website mail and should not replace the domain's existing
inbound-email MX records.

---

## The design system

`assets/css/oi.css` is the style guide expressed as CSS. Everything else consumes it.

**Colour.** Ink `#111111` and Paper `#F4F2EF` carry roughly 80% of every layout.
Cobalt `#004AFF` is the interactive primary — buttons, links, focus rings.
Each section sets exactly one loud accent via a class: `.accent-red`,
`.accent-yellow`, `.accent-cyan`, `.accent-lime`, `.accent-cobalt`. Everything
inside inherits it through the `--accent` custom property, so recolouring a
section is a one-class change.

Coral and violet appear only in the logo cluster. Lime is used as the accent on
ink grounds, as the style guide does on its own closing page. If you want coral
or violet in a layout later, that's a deliberate decision to loosen the rule
rather than something the CSS will stop you doing.

**Type.** Anton for display, sentence case, line-height 0.9. Courier Prime is
the narrative body voice — the typed field-notes register the guide describes.
Archivo handles the parts where mono would fight the reader: buttons, nav, form
controls, assessment questions, dense card text. That split is the one
interpretation I made that the guide doesn't spell out; `.ui-text` is the class
that opts a block into Archivo if you want to move the line.

**Micro-labels.** Eyebrows, card indices, chips, meta lines, form labels and
footer column heads are one tier, set by a single rule: Courier Prime 700 at
13px with 0.14em tracking. They move together or not at all. The tracking is
load-bearing — bold mono without it closes up and muddies.

**Structure.** Square corners everywhere — `border-radius: 0` is set explicitly
on buttons and inputs so no browser default rounds them. Hard offset shadows
(`8px 8px 0`), never soft. No gradients anywhere in the stylesheet.

**Collage.** The kit is CSS and SVG, not images: `.dot-grid` is a repeating
radial gradient, `.scrap` uses `clip-path` for torn paper, `.arrow` is inline
SVG, `.tilt-l` / `.tilt-r` apply the ±2° hand-made tilt. Collage elements live
in an absolutely positioned `.collage` layer that sits behind content and
switches off below 1180px — so decoration never lands on top of copy.

**People.** `.portrait--panel` puts a B&W cut-out on a coloured panel, anchored
to the bottom edge. The grayscale filter is on the `<img>`, not the panel, so
the panel keeps its colour.

---

## Images

The four portraits were extracted from page 8 of the style guide PDF and
background-keyed to transparent PNGs. They're at the resolution the PDF
carried (roughly 900px wide at best), which is fine at current display sizes
but won't survive being used much larger.

**Replace these when you can:**

| File | Currently | Should be |
|---|---|---|
| `assets/img/yosr-1.png`, `-2`, `-3` | keyed from the style guide | originals (only `yosr-lg` is still placed, and only as a fallback) |
| `assets/img/logo-ink.png` / `logo-light.png` | supplied raster lockups | vector (SVG), if it exists |

Both photography slots now hold real workshop imagery: the pre-treated collage
on the homepage LSP section, and the shared-model table shot on the LSP page.
`pinwheel.svg` is no longer placed on any page — it stays in the folder as part
of the collage kit.

The logo lockups are raster. They are sized by height and never stretched, and
at 640px they are comfortably sharp at every size used. A vector version would
still be better, particularly for the favicon, which is currently a hand-built
SVG matching the mark's colours (`#004CFE` / `#FD5E53` / `#94E103` / `#762BCD`,
sampled from the supplied artwork).

The hero animation ships as MP4 + WebM at roughly 250 KB each, converted from
the 2.1 MB source GIF, with a poster frame. It respects `prefers-reduced-motion`
by falling back to that still.

Social cards (`og-*.png`) are generated 1200×630 images. `og.js` in the parent
folder regenerates them if the copy changes.

---

## The How We Work Check

`assets/js/check.js` holds the whole instrument — questions, scale, bands,
patterns, recommendation logic — in plain data structures at the top of the
file. Editing a question means editing a string, not touching any logic.

Two instruments share one engine:

- **Leader** (default) — the launch diagnostic.
- **Team member** — `how-we-work-check.html?perspective=team&t=<teamId>`.
  Same dimensions, same order, same point values, team-member wording from
  §12.4. Team members never see a score; the aggregate belongs to the team.

**Flow.** See "The assessment now ends in an email" below — the launch flow
captures an email rather than showing a score.

**When results are shown** (`?results=on`), they appear in this order: the band
label, then the score, then the five dimensions, then strength, then biggest
friction, then at most one pattern (plus one optional secondary insight), then
one recommended place to start. Ties are disclosed rather than resolved
arbitrarily.

### What still needs wiring

1. **The email endpoint — a launch blocker, not a nice-to-have.** See the
   section at the end of this file. Someone is now promised a report.

2. **Team responses.** Same shape — an `oi:team-response` event. This one does
   need a backend: aggregating anonymous responses, enforcing the five-response
   threshold, and computing perception gaps can't happen client-side without
   exposing individual answers. `window.OICheck.perceptionGap()` implements the
   §12.5 gap bands so the server and the page agree on the numbers.

3. **Team identifier.** The invite link currently generates a temporary id from
   the team name. Replace with a server-issued identifier before this goes live —
   the current one is guessable.

4. **Booking.** `book.html` has a marked embed slot. UTM and referrer values are
   already carried through to that page by `site.js`; map them into the
   scheduler's hidden fields, and fire `consultation_booked` on its success
   callback.

### Analytics

Any element with `data-event` and `data-placement` pushes to `window.dataLayer`
and fires an `oi:track` CustomEvent on click. Events currently emitted:
`book_consultation`, `start_check`, `explore_lsp`, `podcast_listen`,
`check_started`, `check_completed`, `check_lead_captured`,
`team_invite_clicked`, `team_response_completed`. Placement values distinguish
header, hero, mid-page and final CTAs, so §15's "primary CTA clicks by
placement" works out of the box once a tag manager is attached.

---

## Tests

Run from the parent folder with a local server on port 8899:

```
python3 -m http.server 8899 --directory site &
node test-check.js     # 29 assertions on scoring, bands, patterns, gap logic
node qa.js             # the §18 build QA checklist across all six pages
```

`test-check.js` covers the 0 / 50 / 75 / 100 cases the brief asks for, every
cross-dimensional trigger individually, the pattern-selection rules, tie
handling, and all four band boundaries including the exact edges.

`qa.js` checks titles and meta descriptions, canonical tags, single H1 per page,
heading order, alt text, labelled form controls, keyboard focus order, the skip
link, internal links and in-page anchors, horizontal overflow at 1440 and 375,
tap-target sizes, palette contrast ratios, and that the check can be completed
on a phone.

---

## Moving this into a CMS

The homepage sections are independent and reorderable — each is a `<section>`
with its own `id` and no dependency on its neighbours. Every CTA label and
destination is plain text and an `href`, editable without touching code.

Two places carry CMS comments in the markup: the podcast feature block and the
Ideas index, which should become one mixed collection. Every item needs its own
clean detail URL and unique metadata. Don't build the taxonomy before there's
enough content to need it.

If the CMS can't run the assessment's scoring cleanly, host
`how-we-work-check.html` as a standalone page and link to it — the whole check
is self-contained and has no dependency on the rest of the site beyond the
stylesheet.

---

## Notes and open items

- Copy is verbatim from the brief for every tagged block. The LSP page, About
  page and Ideas page needed prose written to the content requirements in
  §8–§10 — read those for voice before publishing, especially the founder
  paragraphs on About, which state facts about experience and should be checked
  against what you want in public.
- FAQ answers on the LSP page make specific claims about session length and
  group size. I picked plausible ranges. Correct them to your actual practice.
- The LSP page mentions Dubai and the UAE in the intro for search. Adjust once
  geography targeting is confirmed (§17).
- `hello@organizationalintelligence.com` on `book.html` is a placeholder.
- Podcast, article and tool links in the Ideas grid are `#` placeholders.
- No cookie banner or privacy policy yet. Add both before launch, and before
  the lead form goes live.
- The trademark disclaimer is in the footer on every page and in the LSP FAQ.
  Have it reviewed alongside the rest of the legal copy.


---

## The homepage argument

The page is built as a commercial arc, not a list of services. The order is
load-bearing and the sections should not be reshuffled casually:

```
Make work work better.
  -> You already have ways of working. You just never chose them.
  -> And those defaults have a cost. Drag accumulates.        [ink]
  -> Make the implicit explicit.                              [red band]
  -> Here is what becomes possible instead.
  -> Here are four places we work.
  -> And AI may amplify all of it. Don't automate the drag.   [ink]
  -> Here's how we unlock the hard conversations. (LSP)
  -> Not sure where your friction is? (the Check)
  -> Have something else? Bring us the thing.                 [cobalt]
  -> Here's how we work with you.
  -> Make work work better.                                   [ink, torn]
```

Two phrases carry the positioning and should stay the largest thing on their
sections: **organizational drag** and **automating the drag**.

The internal test for any new copy: *does this show how OI helps work move
with less organizational drag?*

On the AI section — the claim is deliberately conditional. "AI **can** amplify
existing organizational debt", never "AI will increase it". The conditional is
both more defensible and more persuasive to this audience. Please keep it that
way if the copy gets edited.

### Colour sequence

Grounds alternate on purpose so no two loud sections collide and the ink
sections stay rare enough to mean something: paper, paper, **ink**, **red**,
paper, paper, **ink**, paper, paper, **cobalt**, paper, paper, paper,
**ink+torn**. Change one and check the whole run.

---

## The assessment now ends in an email, not a score

The launch flow is: intro -> 5 sections of 4 questions -> one optional open
question -> **email capture** -> confirmation. No score is shown on screen.
The report is written and sent by hand.

The scoring engine still runs on every submission. It just renders nothing.
The full result rides along in the payload — dimension percentages, band,
strength, friction, every triggered pattern, the recommendation, the open-text
answer — plus a `summary` field: a preformatted plain-text digest ready to
paste into the email. Writing the report is reading, not recalculating.

**`?results=on`** restores the full on-screen result screen — bands, bars,
pattern, recommendation. Useful for testing, and the way back if this decision
is reversed.

### This makes the form endpoint a launch blocker

Previously, no endpoint meant a lost lead. Now it means a person answered
twenty questions, handed over their email, was told a report is coming, and
nothing will ever arrive. That is worse than showing nothing at all.

Wire it before this page goes live: add `data-endpoint="https://..."` to the
`<form data-lead>` element, or listen for the `oi:lead` event. Until then the
console logs a warning and prints the payload.


---

## Round 2 — what changed

**The Ideas page is parked, not deleted.** `ideas-archive.html` still holds the
mixed article / tool / provocation grid, the type chips and the CMS notes. It
is unlinked and noindexed. Bring it back when there is enough content to fill
it; until then `podcast.html` is the only thing under that part of the nav.

**Bricks.** The halftone brick artwork comes in two cuts — paper-outlined for
ink and coloured grounds, black-outlined for paper. The outline is what
separates the brick from the ground, so the ground picks the file. They live in
the `.collage` layer, pinned to the outer gutter with a negative offset so they
hang off the page edge and can never drift into the text column however the
copy reflows. A test in `qa.js`-adjacent checks asserts this at 1440 and 1920.

They are deliberately absent from the four territories, the process and the
partnership sections. The brief says twice that LEGO® Serious Play® should be
prominent "without defining the entire company" — those are the sections that
establish OI as a studio rather than a LEGO provider, and they stay clean.

**The product is now `The "How We Work" Check`** with curly quotes, in every
visible instance including the buttons, the page title and the social cards.
One exception: inside the assessment, "Overall How We Work score" stays
unquoted — that sentence describes the score rather than naming the product.

**Portraits.** The About portrait and the partnership hands image both arrived
with a yellow ground baked in, at slightly different yellows from the brand
`#FCC304`. Both were keyed to transparency and now sit on the section's own
yellow panel, so they match by definition and recolour for free if the accent
ever changes. Never composite a supplied near-miss yellow next to the real one.

**The About page opens on the definition.** The old page head is gone and the
definition section was absorbed into it, so the argument is made once. About's
H1 is now the company name.
