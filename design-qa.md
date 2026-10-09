# OI Ideas design and functional QA — October 9, 2026

final result: passed

## Visual sources and state

Approved sources: `/Users/wajdimanai/Downloads/oi/design-review/blog-layouts/output/screen-1.png`, `screen-2.png`, and `screen-3.png`.
Implementation: `http://localhost:8788/ideas` and the published article at `/ideas/three-questions-before-your-next-team-meeting`; isolated release also verified at port 8789.
Screenshots and combined comparisons: `/Users/wajdimanai/Downloads/oi/website/output/ideas-qa/`.

- `index-desktop.png`, `article-desktop.png`: rendered desktop captures at 1280 CSS pixels wide, 1x output.
- `index-narrow.png`, `article-narrow.png`: rendered narrow viewport at 541 CSS pixels wide; menu, stacked layout, and contents links checked.
- `index-comparison-final.png`, `article-comparison-final.png`: source and implementation in the same comparison image.
- `header-comparison-final.png`, `article-top-comparison.png`: focused readable comparisons of navigation, typography, title hierarchy, summary, and reading-column proportions.
- Source review art is a 1440-by-2000 logical composition. Removed the review-only top/bottom framing and normalized the website region to 1280px wide for comparison. Captures retain natural page height; no attempt to stretch the real article to the short sample's height.

The source uses sample articles. The implementation uses the actual published test article, its author, cover image, longer title/body, and no PDF attachment. Missing topic references, a single available article, and no related articles are real data states. Empty sections and nonexistent downloads are omitted; the Podcast provides a related-reading fallback. These are intentional content differences, not missing mock content to publish.

## Findings and iteration history

1. [P2, fixed] Initial navigation labels/buttons were too small relative to the approved desktop header. Adjusted their sizes and logo proportions in `ideas.css`; recaptured and inspected `header-comparison-final.png`.
2. [P2, fixed] Reading column without a resource rail was too wide. Reduced it from 760px to 680px; recaptured `article-desktop.png` and the final article comparison.
3. [P2, fixed] Existing newsletter success/error colors assumed a black footer. Added readable dark success/error colors on the paper background. Invalid-email feedback was verified in the browser without submitting a contact.
4. No remaining actionable P0/P1/P2 findings in the published article and browse flows.

## Required fidelity surfaces

- Fonts/typography: the existing Anton, Archivo, and Courier Prime fonts are reused. Display hierarchy, sentence case, and readable body type preserved; long CMS titles wrap naturally.
- Spacing/layout: split introductory header, hairline rules, topic/search row, featured article, card grid, contents rail, cobalt summary, newsletter, and compact black footer follow the approved system. Narrow layout stacks with no observed horizontal overflow.
- Colors/tokens: paper #F4F2EF, ink #111111, cobalt #004AFF; square controls and hard offset button shadows. No substitute palette or invented illustrations.
- Images: actual Sanity image and alt text, optimized CDN widths, responsive sources, crop/hotspot support, and credit. Supplied OI logo retained. Editorial sample illustrations are not silently substituted for the author's chosen cover.
- Copy/content: actual published article retained, including its TEST title and author. Search/empty/error language is user-facing. No fake content counts or dead resource buttons.

## Functional evidence

- Browser: article navigation; successful and empty search; topic empty state; clearing filters; copy-link confirmation; contents-anchor scrolling; mobile menu open/close; invalid newsletter email; no logged JavaScript errors in the blog pages.
- 390px iframe layout DOM had no horizontal overflow. The in-app browser did not render/click that iframe reliably, so screenshot/mobile interaction evidence uses the actual 541px viewport. No claim of full 390px visual verification.
- Server: published article/index/sitemap 200; missing and unattached-resource URLs 404; preview noindex headers; redirects; non-public source/secret paths 404.
- Automated: CMS isolation/validation; rich text and nested lists; escaped editorial HTML/JSON-LD; unsafe URL rejection; optional PDF link/page markup; missing content and upstream failures. Existing podcast and workshop regression tests pass. Root workspace analytics tests also pass.

## Residual gaps / follow-up polish

- The optional PDF template is implemented and tested using synthetic records; an actual Sanity PDF preview/download still needs an attached published resource. The current article has no PDF, so no tool URL is exposed to readers.
- Only one article is currently published. Multi-card/pagination behavior is implemented; rich, mixed-content screenshots will naturally appear as more articles are published.
- No real newsletter subscription or external form delivery was sent during this verification.
- [P3] Small header-spacing differences remain from fitting the existing site's navigation at intermediate desktop widths.

## Release scope

Release only the CMS/blog and its navigation/build dependencies to `develop`. Preserve unrelated local analytics and other website edits. Production `main` is not promoted.
