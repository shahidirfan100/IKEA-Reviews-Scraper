# IKEA Reviews Scraper

Collect customer reviews for a single IKEA product using product URL or product ID. Output is flattened and deduplicated, ready for analytics and exports.

## Features

- Single-product, customer-review focused extraction
- URL or product ID based product resolution
- Deduplicated review records
- Flattened dataset fields (no nested category/rating arrays)
- Configurable results, pages, sort, and proxy
- Null/empty values removed before save

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | String | No | POÄNG sample URL | IKEA product URL |
| `productId` | String | No | `"89286612"` | IKEA 8-digit product ID |
| `resultsWanted` | Integer | No | `20` | Maximum review rows to collect |
| `maxPages` | Integer | No | `3` | Maximum review pages to request |
| `sortBy` | String | No | `"submissionOn:desc"` | Sort expression |
| `proxyConfiguration` | Object | No | Apify proxy config | Optional proxy settings |

## Output Data

Each row is a flattened customer review record with product context.

| Field | Type | Description |
|-------|------|-------------|
| `productId` | String | Product ID |
| `productName` | String | Product name |
| `productUrl` | String | Product page URL |
| `productPrice` | Number | Product price |
| `productCurrency` | String | Currency |
| `primaryRatingValue` | Number | Overall product rating |
| `totalReviewCount` | Integer | Total product review count |
| `reviewId` | String | Unique review ID |
| `reviewSubmissionOn` | String | Review timestamp |
| `reviewPrimaryRatingValue` | Number | Review rating |
| `reviewTitle` | String | Review title |
| `reviewText` | String | Review content |
| `reviewAuthor` | String | Review author |
| `reviewSourceCountryCode` | String | Review source country |
| `reviewVerifiedPurchase` | Boolean | Verified purchase flag |
| `reviewCountCollected` | Integer | Total collected reviews in run |
| `reviewPosition` | Integer | Row position |
| `sortBy` | String | Applied sort |
| `scrapedAt` | String | Scrape timestamp |

## Usage Example

```json
{
  "url": "https://www.ikea.com/gb/en/p/poaeng-armchair-white-stained-oak-veneer-knisa-light-beige-s89286612/",
  "resultsWanted": 20,
  "maxPages": 3,
  "sortBy": "submissionOn:desc"
}
```

## Legal Notice

Use responsibly and comply with website terms and applicable laws.