# IKEA Reviews Scraper

Extract comprehensive customer reviews from IKEA with ease. Collect ratings, review texts, and verified purchase flags at scale. Perfect for product analysis, market research, and competitor monitoring.

---

## Features

- **Direct Resolution** — Scrape reviews using direct IKEA product URLs or specific 8-digit product IDs.
- **Detailed Metadata** — Collect customer feedback details including author name, title, score, and verified purchase flags.
- **Flexible Sorting** — Order results by rating, date, or popularity, and customize extraction limits.
- **Clean Output** — Receive flattened dataset records ready for analysis without nested arrays.

---

## Use Cases

### Sentiment Analysis
Understand customer satisfaction towards specific products. Extract reviews to analyze common complaints, positive feedback, and rating trends.

### QA Monitoring
Identify product defects or quality complaints mentioned by customers. Share feedback directly with product teams to improve quality.

### Competitor Benchmarking
Monitor competing items listed on IKEA. Compare rating benchmarks and review frequencies to position your products.

---

## Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | String | No | — | IKEA product page URL |
| `productId` | String | No | — | IKEA 8-digit product ID |
| `resultsWanted` | Integer | No | `20` | Max reviews to collect |
| `maxPages` | Integer | No | `3` | Max review pages to request |
| `sortBy` | String | No | `"submissionOn:desc"` | Sort order parameter |
| `proxyConfiguration` | Object | No | — | Optional proxy settings |

---

## Output Data

| Field | Type | Description |
|-------|------|-------------|
| `productId` | String | Resolved product ID |
| `productName` | String | Name of the product |
| `productUrl` | String | Product page URL |
| `productPrice` | Number | Current product price |
| `productCurrency` | String | Currency code |
| `totalReviewCount` | Integer | Total reviews count |
| `primaryRatingValue` | Number | Overall product rating |
| `reviewId` | String | Unique review ID |
| `reviewSubmissionOn` | String | Review submission date |
| `reviewPrimaryRatingValue` | Number | Rating given by reviewer |
| `reviewTitle` | String | Title of the review |
| `reviewText` | String | Review body text |
| `reviewAuthor` | String | Reviewer name |
| `reviewSourceCountryCode` | String | Review country |
| `reviewVerifiedPurchase` | Boolean | Verified purchase status |

---

## Usage Examples

### Basic Extraction

Extract the most recent reviews for a product using its URL:

```json
{
  "url": "https://www.ikea.com/gb/en/p/poaeng-armchair-white-stained-oak-veneer-knisa-light-beige-s89286612/"
}
```

### ID-Based Extraction

Target a product using its 8-digit ID:

```json
{
  "productId": "89286612",
  "resultsWanted": 50
}
```

### Sorted Extraction

Scrape reviews sorted by lowest rating:

```json
{
  "productId": "89286612",
  "sortBy": "primaryRating.ratingValue:asc"
}
```

---

## Sample Output

```json
{
  "productId": "89286612",
  "productName": "POÄNG",
  "productUrl": "https://www.ikea.com/gb/en/p/poaeng-armchair-white-stained-oak-veneer-knisa-light-beige-s89286612/",
  "productPrice": 95.0,
  "productCurrency": "GBP",
  "totalReviewCount": 427,
  "primaryRatingValue": 4.6,
  "reviewId": "236402484",
  "reviewSubmissionOn": "2023-10-12T14:23:11.000Z",
  "reviewPrimaryRatingValue": 5,
  "reviewTitle": "Classic Comfort",
  "reviewText": "Very comfortable armchair, easy to assemble.",
  "reviewAuthor": "John D.",
  "reviewSourceCountryCode": "GB",
  "reviewVerifiedPurchase": true
}
```

---

## Tips for Best Results

### URL Formats
- Make sure the URL includes regional segment (e.g. `/gb/en/`).
- Verify the product exists on that region's site.

### Sorting Choices
- Use `submissionOn:desc` for fresh monitoring.
- Use `primaryRating.ratingValue:asc` to find product issues.

### Proxy Configuration
- Enable proxies for large scale scraping to avoid rate limits:

```json
{
  "proxyConfiguration": {
    "useApifyProxy": true
  }
}
```

---

## Integrations

Connect your data with:

- **Google Sheets** — Export reviews for analysis.
- **Airtable** — Build feedback databases.
- **Slack** — Get alerts for negative feedback.

### Export Formats

- **JSON** — For developers.
- **CSV** — For spreadsheet analysis.

---

## Frequently Asked Questions

### Can I scrape any regional IKEA website?
Yes, the scraper supports all regional IKEA domains containing product pages.

### Is it possible to scrape all reviews?
Yes, set `resultsWanted` to match the product's total reviews.

### Can I run this with only the Product ID?
Yes, the 8-digit product ID can be used instead of a URL.

### Are verified purchases flagged?
Yes, the `reviewVerifiedPurchase` field indicates verified buyers.

### What is the date format?
Dates are returned as standard ISO timestamps.

---

## Support

For issues or feature requests, contact support through the Apify Console.

### Resources

- [Apify Documentation](https://docs.apify.com/)
- [API Reference](https://docs.apify.com/api/v2)

---

## Legal Notice

This actor is designed for legitimate data collection purposes. Users are responsible for compliance with website terms and applicable laws. Use data responsibly and respect rate limits.