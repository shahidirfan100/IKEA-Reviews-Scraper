## Selected API
- Endpoint (ratings): `https://web-api.ikea.com/tugc/public/v5/rating/{country}/{language}/{productId}`
- Method: `GET`
- Auth: No auth token required, requires header `x-client-id: a1047798-0fc4-446e-9616-0afe3256d0d7`
- Pagination: Not needed (single summary payload)
- Fields available: `primaryRating`, `secondaryRatings`, `ratingDistribution`, `totalReviewCount`, `totalRecommendedCount`, `firstReviewedOn`, `lastReviewedOn`
- New fields vs old actor: full review/rating summary and distributions
- Field count: 12+ top-level summary fields

- Endpoint (reviews): `https://web-api.ikea.com/tugc/public/v5/reviews/{country}/{language}/{productId}`
- Method: `POST`
- Auth: No auth token required, requires header `x-client-id: a1047798-0fc4-446e-9616-0afe3256d0d7`
- Pagination: body `page.size`, `page.number`
- Sort: body `sort` supports `submissionOn`, `primaryRating.ratingValue`, `positiveFeedbacksCount`
- Filters: body `filter.and` supports fields such as `sourceCountryCode`, `verifiedPurchase`, `hasMedia`
- Fields available: `id`, `title`, `text`, `submissionOn`, `reviewer`, `primaryRating`, `secondaryRatings`, `verifiedPurchase`, `hasMedia`, feedback counts, response payload
- New fields vs old actor: full review rows and review-level metadata (old actor had no review rows)
- Field count: 20+ per review row

## Supporting Resolution API
- Endpoint: `https://sik.search.blue.cdtapps.com/{country}/{language}/search?c=sr&v=20250507`
- Method: `POST`
- Purpose: resolve URL/productId/keyword to a single product (`itemNo`, `name`, `pipUrl`, `price`, `image`)

## Rejected Candidates
- `https://api.salesitem.ingka.com/communications/ru/{country}`
  - Rejected because client key from page scripts returned 403 for this API in this environment.
- IKEA `pip/fragments/*` route guesses
  - Rejected because tested paths returned 404 and are not needed once search + tugc endpoints were confirmed.
- HTML/DOM extraction
  - Rejected because requirement is API-based actor without HTML parsing.

## URLScan Notes
- URLScan search endpoint was reachable.
- URLScan result endpoint access returned 403 from this environment (not logged in / restricted result access), so final API confirmation used live IKEA runtime bundles and direct endpoint verification.

## Why This API Set Was Chosen
- Direct JSON responses
- Stable pagination for reviews
- Rich field coverage for both product-level and review-level output
- Works with plain HTTP requests (no browser needed)