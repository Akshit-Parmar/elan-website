# Search and sharing update

Upload the contents of `dist` to the same GitHub deployment location as before. This package retains the full source, assets, backend and setup files. No database migration is needed for this update.

## Included

- A new 1200 × 630 sharing image at `/assets/social/elan-share-2026-11.png`, with a new filename so preview services can fetch a fresh asset.
- Updated Open Graph and Twitter metadata, search titles and descriptions.
- Clear 2026 archive wording on the event details and programme pages.
- Canonical public URLs, structured data and sitemap modification dates that only change when page content changes.
- Existing Search Console verification, private-page exclusions and crawler settings retained.

## After Cloudflare finishes deploying

1. Open your site and confirm the new image URL loads.
2. In Google Search Console, submit `https://elansummit.com/sitemap.xml` under Sitemaps if it is not already submitted.
3. Use URL Inspection, then Request indexing for the homepage and the updated `/event-details`, `/event-flow`, `/next-edition` and `/join-oc-2027` pages.
4. Share the homepage in a new message to check its preview. Existing messages may retain their old preview.

Search engines and messaging services cache their own copies. This deployment supplies updated information but cannot force an instant refresh, control Google's sitelinks or guarantee when AI search services revisit the site.

## Maintaining the card

The editable SVG and rendered PNG are in `src/social`. `scripts/make-share-card.py` regenerates them with CairoSVG; normal builds use the bundled files and do not require CairoSVG. Use a new filename when intentionally replacing the social image again, and update `SHARE_IMAGE` in `scripts/search_metadata.py`.
