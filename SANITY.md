# OI content editing with Sanity

The Studio is a separate application in `studio/`. It manages articles, authors,
and topics while the OI website stays on Cloudflare Pages. Start on Sanity Free;
no paid plan, billing information, or editor invitations are needed for this setup.

## Current setup (October 9, 2026)

- Project: `1k7bwuhb`, **Organizational Intelligence**, owned by Yosr's Sanity organization.
- Dataset: `production` (public); four topic records and Yosr's author record are saved.
- Sanity automatically enabled a **$0 Growth Trial**, which the Plan page confirms
  automatically downgrades to Free. No paid subscription was purchased.
- Local editor: `http://localhost:3333/` while `npm run studio:dev` is running.
- Hosted Studio: **https://orgintelligence.sanity.studio/** (deployed October 9).
- Account-level CLI sign-in and schema deployment are complete. The Studio app ID
  is `pwe2gfsx6txn1ituw60czwa7` and is saved in `studio/sanity.cli.ts`.
- For future editor changes, run `npx sanity deploy --schema-required` from `studio/`.
- The setup credential is in an ignored, mode-600 file under `studio/.sanity/`;
  it is never included in Studio bundles or public website assets.

## Connection

Public project settings live in `content/sanity.json`. This file must contain the
actual Sanity project ID before the editor can connect. Project IDs and dataset
names are public identifiers, not credentials. Never put API tokens in that file
or in a `SANITY_STUDIO_*` environment variable: those variables reach browsers.

To finish connecting a new account:

1. Sign in to Sanity using the account that should own OI.
2. Create or select the **Organizational Intelligence** project on the Free plan,
   with a public dataset named `production`. Public datasets expose published
   content; drafts still require authentication. Uploaded assets are public,
   including assets used only by drafts, so do not upload confidential files.
3. Set the project ID in `content/sanity.json`.
4. Install the editor dependencies with `npm --prefix studio ci`.
5. From `studio/`, run `npx sanity login`, then `npx sanity exec scripts/seed.mjs
   --with-user-token`. Seeding creates the four topic records and Yosr's author
   record if absent; it does not overwrite existing content or create articles.
6. Run `npm run studio:dev` from the website directory. The local Studio is at
   `http://localhost:3333`. That exact origin is already allowed by the project.
   Do not substitute `127.0.0.1` or add a wildcard origin.
7. Run `npm run studio:check` and `npm run studio:build`. From `studio/`, deploy
   with `npx sanity deploy --schema-required`. The preferred hostname is
   `orgintelligence.sanity.studio`; use the URL actually returned by Sanity if occupied.

The CLI sign-in is separate from the browser session. Use the official login flow;
do not paste access tokens into chat. Studio hosting does not grant anonymous
editing access: the user must sign in with project access.

## Writing and reviewing an article

1. Open **Ideas → Articles → Create**.
2. Add the title, short summary, and article body. Cover images are optional;
   every uploaded editorial image requires an image description. Headings,
   subheadings, quotes, links, lists, and images are supported.
3. Under **Details**, generate the URL slug, select an author and one to three
   topics, and check the publication date. You can attach a downloadable PDF,
   select related articles, or feature the article.
4. Under **Search & sharing**, optionally override the search title, description,
   and social image. Empty fields fall back to article content.
5. Use **Reading preview** to review the current draft inside the authenticated
   editor. It uses OI colors and fonts; it is a reading preview, not the final
   customer-approved website template or a shareable public draft link.
6. Use **Publish** when the content is approved. On Free, this is a manual action.
   The publication-date field is not a scheduler. Future dates fail validation.
   Avoid changing a published slug until redirects exist on the public website.

Sanity saves drafts automatically. Its Free plan has Administrator and Viewer
roles; dedicated Editor roles and scheduled drafts require Growth. No custom
approval enforcement or long-term backup service is included in this setup.

## Website connection and rollout boundary

`GET /api/ideas` returns published article summaries. Optional parameters:

- `slug=an-article-slug`: a full article, or HTTP 404 if absent.
- `topic=better-meetings`: filter by topic.
- `limit=24&offset=0`: pagination, with a maximum of 100 per request.

The endpoint explicitly uses Sanity's **published** perspective. No preview or
token parameter is accepted. It uses a 60-second shared cache, so publishing or
unpublishing may take up to a minute to appear once the endpoint is deployed.
No rebuild hook is necessary for this API-based connection.

`npm run content:export` writes published articles to the ignored
`output/content/ideas.json`. It is ready for a later static-page generator;
it does not generate article pages or deploy anything. It fails on upstream
errors rather than replacing content with a false successful empty export.

The customer approved the layouts on October 9, 2026. The public templates now
render published Sanity content at `/ideas` and `/ideas/<slug>`. Articles include
server-rendered text, sharing metadata, JSON-LD, contents navigation, reading time,
and related reading. Search (`?q=`), topic filtering (`?topic=`), and pagination
work without JavaScript. An attached PDF enables `/ideas/tools/<slug>`.
Only published articles and published topic/author references are available.
Publish referenced topics as well as the article to make topic filters work.

No build hook is required. Save edits and click Publish in Sanity, then refresh
the article page. Shared-cache responses may take up to 60 seconds to update.
A removed/unpublished article returns 404; upstream failures return 502 rather
than a misleading empty page. Preview hosts send a noindex response header.
The current release is intended for local and development review only.

## Safe website deployment

Before deploying a branch containing `studio/`, change Cloudflare Pages to:

- Build command: `npm ci --ignore-scripts && npm run build`
- Build output directory: `dist/site`
- Root directory: the repository root (unchanged)

The packaging build copies only public HTML, assets, and routing files. Do not
use the repository root as the deployment output now that it contains a CMS
application. Cloudflare automatically bundles the root `functions/` directory,
including the Ideas endpoint and the existing form handlers. Studio dependencies
are installed and built independently and are not needed by the website build.

For local Pages testing, run `npm run build` then
`npx wrangler pages dev dist/site --port 8788` from the repository root. Keep
`INTEGRATIONS_MODE=mock` in `.dev.vars` while testing forms.

The scripts do not deploy the website. The approved development rollout uses the
`develop` branch. Production remains on `main`; promote only when authorized.
Cloudflare build settings apply to future builds: any future production commit
must include the packaging script and build command before it is deployed.

## Checks

```sh
npm run test:cms
npm run test:ideas
npm run studio:check
npm run studio:build
npm run build
```

The CMS test covers published-only queries, draft/version/future exclusions,
parameter validation, pagination, safe errors, caching, and missing articles.
Cloud verification on October 9: account login, hosted Studio deployment, and
schema deployment succeeded. A temporary private draft was opened in the hosted
editor and its reading preview checked at 1280 × 900 and 390 × 844. Author,
publication date, headings, and body text rendered correctly. The published-content
export returned zero articles while that draft existed, confirming it stayed private.
The temporary draft was removed after the check. No article was published.

No errors were logged from the OI Studio bundle during the preview check. Sanity's
surrounding dashboard logged vendor-side initialization errors and deprecation
warnings, but the editor and preview remained usable. A live OI article-page
publication is still untested because those public templates have not been deployed.

Dependency audit: the latest Studio release includes advisories in transitive CLI
tooling (including glob and configuration parsers). The affected chains are used
for development/build commands, and are not dependencies of the public website.
An automatic major downgrade was not applied. Recheck upstream fixes before
accepting untrusted project/configuration files into the Studio build.
