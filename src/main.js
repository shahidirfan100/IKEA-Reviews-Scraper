import { Actor, log } from 'apify';
import { Dataset, sleep } from 'crawlee';
import { gotScraping } from 'got-scraping';

const DEFAULT_COUNTRY = 'gb';
const DEFAULT_LANGUAGE = 'en';
const DEFAULT_RESULTS_WANTED = 20;
const DEFAULT_MAX_PAGES = 3;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_SORT = 'submissionOn:desc';
const SEARCH_API_VERSION = '20250507';
const SEARCH_CLIENT_ID = 'sr';
const REVIEW_CLIENT_ID = 'a1047798-0fc4-446e-9616-0afe3256d0d7';

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 15.7; rv:147.0) Gecko/20100101 Firefox/147.0',
    'Mozilla/5.0 (X11; Linux x86_64; rv:147.0) Gecko/20100101 Firefox/147.0',
];

const pickUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const toTrimmed = (value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed || undefined;
};

const compactValue = (value) => {
    if (value === null || value === undefined) return undefined;

    if (Array.isArray(value)) {
        const cleaned = value
            .map((item) => compactValue(item))
            .filter((item) => item !== undefined);
        return cleaned.length ? cleaned : undefined;
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value)
            .map(([key, nested]) => [key, compactValue(nested)])
            .filter(([, nested]) => nested !== undefined);
        return entries.length ? Object.fromEntries(entries) : undefined;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || undefined;
    }

    return value;
};

const compactObject = (value) => compactValue(value) || {};

const parseIkeaUrl = (url, inputCountry, inputLanguage) => {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);

    let country = toTrimmed(inputCountry)?.toLowerCase();
    let language = toTrimmed(inputLanguage)?.toLowerCase();

    if (!country && pathParts[0] && /^[a-z]{2}$/.test(pathParts[0])) {
        country = pathParts[0].toLowerCase();
    }
    if (!language && pathParts[1] && /^[a-z]{2}$/.test(pathParts[1])) {
        language = pathParts[1].toLowerCase();
    }

    let productId;
    const pathText = parsed.pathname;
    const idMatch = pathText.match(/(?:^|[-_/])s?(\d{8})(?:[/?#]|$)/i);
    if (idMatch) {
        productId = idMatch[1];
    } else if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        if (/^s?\d{8}$/i.test(lastPart)) {
            productId = lastPart.replace(/^s/i, '');
        }
    }

    let searchQuery;
    if (pathParts.includes('search')) {
        searchQuery = toTrimmed(parsed.searchParams.get('q'));
    } else if (pathParts.includes('p')) {
        const productSegment = pathParts[pathParts.length - 1];
        const slug = toTrimmed(productSegment);
        if (slug) {
            const cleaned = slug
                .replace(/-s?\d{8}$/i, '')
                .replace(/^s?\d{8}$/i, '')
                .replace(/-/g, ' ')
                .trim();
            searchQuery = toTrimmed(cleaned);
        }
    }

    return {
        country: country || DEFAULT_COUNTRY,
        language: language || DEFAULT_LANGUAGE,
        productId,
        searchQuery,
    };
};

const buildAcceptLanguage = (language, country) => {
    const lang = (language || DEFAULT_LANGUAGE).toLowerCase();
    const ctry = (country || DEFAULT_COUNTRY).toUpperCase();
    return `${lang}-${ctry},${lang};q=0.9,en;q=0.8`;
};

const requestJson = async ({
    url,
    method = 'GET',
    headers = {},
    json,
    label,
    proxyConfiguration,
    responseType = 'json',
    timeoutMs = 45000,
    retries = 3,
}) => {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
            const response = await gotScraping({
                url,
                method,
                headers,
                json,
                responseType,
                timeout: { request: timeoutMs },
                proxyUrl,
                throwHttpErrors: true,
                retry: { limit: 0 },
            });
            return response;
        } catch (error) {
            lastError = error;
            const status = error.response?.statusCode;
            const retriable = [408, 429, 500, 502, 503, 504, 590].includes(status);
            log.warning(`Attempt ${attempt}/${retries} failed for ${label}: ${status || error.code || error.message}`);
            if (attempt === retries || !retriable) break;
            await sleep(400 * attempt + Math.random() * 700);
        }
    }

    throw lastError;
};

const buildSearchPayload = ({ query, offset, size }) => ({
    searchParameters: {
        input: query,
        type: 'QUERY',
    },
    components: [
        {
            component: 'PRIMARY_AREA',
            types: { main: 'PRODUCT', breakouts: [] },
            filterConfig: {},
            window: { size, offset },
            columns: 4,
        },
    ],
});

const mapSearchProduct = (product, { country, language }) => {
    const salesPrice = product?.salesPrice || {};
    const categoryPathText = Array.isArray(product?.categoryPath)
        ? product.categoryPath
            .map((entry) => toTrimmed(entry?.name))
            .filter(Boolean)
            .join(' > ')
        : undefined;

    return compactObject({
        productId: toTrimmed(product?.itemNo),
        globalProductId: toTrimmed(product?.itemNoGlobal),
        internalId: toTrimmed(product?.id),
        name: toTrimmed(product?.name),
        typeName: toTrimmed(product?.typeName),
        itemType: toTrimmed(product?.itemType),
        url: toTrimmed(product?.pipUrl),
        image: toTrimmed(product?.mainImageUrl) || toTrimmed(product?.imageUrl),
        imageAlt: toTrimmed(product?.mainImageAlt),
        price: toNumber(salesPrice.numeral),
        priceText: toTrimmed(salesPrice.priceText),
        currency: toTrimmed(salesPrice.currencyCode),
        rating: toNumber(product?.ratingValue),
        reviewCountFromSearch: toNumber(product?.ratingCount),
        onlineSellable: typeof product?.onlineSellable === 'boolean' ? product.onlineSellable : undefined,
        lastChance: typeof product?.lastChance === 'boolean' ? product.lastChance : undefined,
        categoryPathText,
        country,
        language,
    });
};

const findProductById = async ({ productId, country, language, proxyConfiguration }) => {
    const endpoint = `https://sik.search.blue.cdtapps.com/${country}/${language}/search?c=${SEARCH_CLIENT_ID}&v=${SEARCH_API_VERSION}`;

    const response = await requestJson({
        url: endpoint,
        method: 'POST',
        json: buildSearchPayload({ query: productId, offset: 0, size: 24 }),
        headers: {
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': buildAcceptLanguage(language, country),
            'Content-Type': 'application/json',
            Origin: 'https://www.ikea.com',
            Referer: `https://www.ikea.com/${country}/${language}/search/?q=${encodeURIComponent(productId)}`,
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'User-Agent': pickUserAgent(),
        },
        label: `search-by-product-id:${productId}`,
        proxyConfiguration,
    });

    const items = response.body?.results
        ?.find((result) => result?.component === 'PRIMARY_AREA')
        ?.items
        ?.filter((item) => item?.type === 'PRODUCT' && item?.product) || [];

    const exact = items.find((item) => String(item.product.itemNo || '') === productId)
        || items.find((item) => String(item.product.itemNoGlobal || '') === productId)
        || items[0];

    return exact?.product;
};

const searchProducts = async ({ query, country, language, maxPages, pageSize, proxyConfiguration }) => {
    const endpoint = `https://sik.search.blue.cdtapps.com/${country}/${language}/search?c=${SEARCH_CLIENT_ID}&v=${SEARCH_API_VERSION}`;
    const products = [];
    const seen = new Set();

    for (let page = 1; page <= maxPages; page++) {
        const offset = (page - 1) * pageSize;
        const response = await requestJson({
            url: endpoint,
            method: 'POST',
            json: buildSearchPayload({ query, offset, size: pageSize }),
            headers: {
                Accept: 'application/json, text/plain, */*',
                'Accept-Language': buildAcceptLanguage(language, country),
                'Content-Type': 'application/json',
                Origin: 'https://www.ikea.com',
                Referer: `https://www.ikea.com/${country}/${language}/search/?q=${encodeURIComponent(query)}`,
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'cross-site',
                'User-Agent': pickUserAgent(),
            },
            label: `search-products:${query}:page-${page}`,
            proxyConfiguration,
        });

        const pageItems = response.body?.results
            ?.find((result) => result?.component === 'PRIMARY_AREA')
            ?.items
            ?.filter((item) => item?.type === 'PRODUCT' && item?.product) || [];

        if (!pageItems.length) break;

        for (const item of pageItems) {
            const key = String(item.product.itemNo || item.product.itemNoGlobal || item.product.id || '');
            if (!key || seen.has(key)) continue;
            seen.add(key);
            products.push(item.product);
        }

        if (pageItems.length < pageSize) break;
    }

    return products;
};

const fetchRatings = async ({ productId, country, language, proxyConfiguration }) => {
    const endpoint = `https://web-api.ikea.com/tugc/public/v5/rating/${country}/${language}/${productId}`;

    const response = await requestJson({
        url: endpoint,
        headers: {
            Accept: 'application/json',
            'Accept-Language': buildAcceptLanguage(language, country),
            'User-Agent': pickUserAgent(),
            'x-client-id': REVIEW_CLIENT_ID,
        },
        label: `ratings:${productId}`,
        proxyConfiguration,
    });

    const payload = Array.isArray(response.body) ? response.body[0] : response.body;
    return payload || {};
};

const normalizeSortValue = (sortValue) => {
    const normalized = toTrimmed(sortValue) || DEFAULT_SORT;
    const [field, directionRaw] = normalized.split(':');
    const direction = String(directionRaw || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const allowedFields = new Set(['submissionOn', 'primaryRating.ratingValue', 'positiveFeedbacksCount']);
    return {
        field: allowedFields.has(field) ? field : 'submissionOn',
        direction,
    };
};

const fetchReviewsPage = async ({
    productId,
    country,
    language,
    pageNumber,
    pageSize,
    sort,
    proxyConfiguration,
}) => {
    const endpoint = `https://web-api.ikea.com/tugc/public/v5/reviews/${country}/${language}/${productId}`;

    const body = {
        filter: {
            and: [],
            not: [],
        },
        sort: [{ field: sort.field, direction: sort.direction }],
        page: {
            size: pageSize,
            number: pageNumber,
        },
    };

    const response = await requestJson({
        url: endpoint,
        method: 'POST',
        json: body,
        headers: {
            Accept: 'application/json',
            'Accept-Language': buildAcceptLanguage(language, country),
            'Content-Type': 'application/json',
            'User-Agent': pickUserAgent(),
            'x-client-id': REVIEW_CLIENT_ID,
        },
        label: `reviews:${productId}:page-${pageNumber}`,
        proxyConfiguration,
    });

    return Array.isArray(response.body) ? response.body : [];
};

const mapReview = (review, index) => {
    const secondaryRatings = Array.isArray(review?.secondaryRatings)
        ? review.secondaryRatings.map((entry) => compactObject({
            id: toTrimmed(entry?.id),
            label: toTrimmed(entry?.label),
            ratingValue: toNumber(entry?.ratingValue),
            ratingRange: toNumber(entry?.ratingRange),
        })).filter((entry) => Object.keys(entry).length > 0)
        : undefined;

    const badges = Array.isArray(review?.badges)
        ? review.badges.map((badge) => compactObject({
            id: toTrimmed(badge?.id),
            label: toTrimmed(badge?.label),
        })).filter((badge) => Object.keys(badge).length > 0)
        : undefined;

    return compactObject({
        reviewId: toTrimmed(review?.id),
        reviewType: toTrimmed(review?.type),
        title: toTrimmed(review?.title),
        text: toTrimmed(review?.text),
        author: toTrimmed(review?.reviewer?.name),
        authorNickname: toTrimmed(review?.reviewer?.nickname),
        authorLocation: toTrimmed(review?.reviewer?.location),
        sourceCountryCode: toTrimmed(review?.sourceCountryCode),
        sourceLangCode: toTrimmed(review?.sourceLangCode),
        submissionOn: toTrimmed(review?.submissionOn),
        primaryRatingValue: toNumber(review?.primaryRating?.ratingValue),
        primaryRatingRange: toNumber(review?.primaryRating?.ratingRange),
        secondaryRatings,
        positiveFeedbacksCount: toNumber(review?.positiveFeedbacksCount),
        negativeFeedbacksCount: toNumber(review?.negativeFeedbacksCount),
        recommended: typeof review?.recommended === 'boolean' ? review.recommended : undefined,
        verifiedPurchase: typeof review?.verifiedPurchase === 'boolean' ? review.verifiedPurchase : undefined,
        hasMedia: typeof review?.hasMedia === 'boolean' ? review.hasMedia : undefined,
        language: toTrimmed(review?.language),
        translatedFrom: toTrimmed(review?.translatedFrom),
        response: compactObject({
            responder: toTrimmed(review?.response?.authorName),
            responseText: toTrimmed(review?.response?.text),
            respondedOn: toTrimmed(review?.response?.submissionOn),
        }),
        badges,
        reviewPosition: index,
    });
};

const resolveSingleProduct = async ({
    url,
    productId,
    maxPages,
    pageSize,
    proxyConfiguration,
}) => {
    let resolvedCountry = DEFAULT_COUNTRY;
    let resolvedLanguage = DEFAULT_LANGUAGE;
    let resolvedProductId = toTrimmed(productId);
    let queryFromUrl;

    if (url) {
        const parsed = parseIkeaUrl(url, resolvedCountry, resolvedLanguage);
        resolvedCountry = parsed.country;
        resolvedLanguage = parsed.language;
        resolvedProductId = resolvedProductId || parsed.productId;
        queryFromUrl = parsed.searchQuery;
    }

    const searchQuery = queryFromUrl;

    if (resolvedProductId) {
        const product = await findProductById({
            productId: resolvedProductId,
            country: resolvedCountry,
            language: resolvedLanguage,
            proxyConfiguration,
        });

        if (product) {
            return {
                product,
                country: resolvedCountry,
                language: resolvedLanguage,
                resolution: 'productId',
            };
        }

        log.warning(`No exact product found for productId=${resolvedProductId}. Will try keyword search fallback.`);
    }

    if (!searchQuery) {
        throw new Error('Provide at least one of: url or productId.');
    }

    const products = await searchProducts({
        query: searchQuery,
        country: resolvedCountry,
        language: resolvedLanguage,
        maxPages,
        pageSize,
        proxyConfiguration,
    });

    if (!products.length) {
        throw new Error(`No products found for query "${searchQuery}" in ${resolvedCountry}/${resolvedLanguage}.`);
    }

    return {
        product: products[0],
        country: resolvedCountry,
        language: resolvedLanguage,
        resolution: 'keyword',
        matchedCount: products.length,
        matchedQuery: searchQuery,
    };
};

await Actor.init();

try {
    const input = (await Actor.getInput()) || {};
    const {
        url,
        productId,
        resultsWanted = DEFAULT_RESULTS_WANTED,
        maxPages = DEFAULT_MAX_PAGES,
        sortBy = DEFAULT_SORT,
        proxyConfiguration,
    } = input;

    const normalizedResultsWanted = Number.isFinite(+resultsWanted) && +resultsWanted > 0
        ? Math.max(1, +resultsWanted)
        : DEFAULT_RESULTS_WANTED;

    const normalizedMaxPages = Number.isFinite(+maxPages) && +maxPages > 0
        ? Math.max(1, +maxPages)
        : DEFAULT_MAX_PAGES;

    const normalizedReviewsPerPage = DEFAULT_PAGE_SIZE;

    const proxyConf = proxyConfiguration
        ? await Actor.createProxyConfiguration({ ...proxyConfiguration })
        : undefined;

    const resolved = await resolveSingleProduct({
        url: toTrimmed(url),
        productId: toTrimmed(productId),
        maxPages: normalizedMaxPages,
        pageSize: normalizedReviewsPerPage,
        proxyConfiguration: proxyConf,
    });

    const normalizedProduct = mapSearchProduct(resolved.product, {
        country: resolved.country,
        language: resolved.language,
    });

    const finalProductId = normalizedProduct.productId || normalizedProduct.globalProductId;
    if (!finalProductId) {
        throw new Error('Could not resolve product ID from selected product.');
    }

    log.info('Resolved target product', {
        productId: finalProductId,
        name: normalizedProduct.name,
        country: resolved.country,
        language: resolved.language,
        resolution: resolved.resolution,
    });

    const ratings = await fetchRatings({
        productId: finalProductId,
        country: resolved.country,
        language: resolved.language,
        proxyConfiguration: proxyConf,
    });

    const sort = normalizeSortValue(sortBy);

    const reviewRecords = [];
    const seenReviewIds = new Set();

    for (let pageNumber = 1; pageNumber <= normalizedMaxPages && reviewRecords.length < normalizedResultsWanted; pageNumber++) {
        const pageReviews = await fetchReviewsPage({
            productId: finalProductId,
            country: resolved.country,
            language: resolved.language,
            pageNumber,
            pageSize: normalizedReviewsPerPage,
            sort,
            proxyConfiguration: proxyConf,
        });

        if (!pageReviews.length) {
            log.info(`No more reviews returned on page ${pageNumber}. Stopping pagination.`);
            break;
        }

        for (const review of pageReviews) {
            const reviewId = String(review?.id || '').trim();
            if (!reviewId || seenReviewIds.has(reviewId)) continue;
            seenReviewIds.add(reviewId);
            reviewRecords.push(review);
            if (reviewRecords.length >= normalizedResultsWanted) break;
        }

        log.info('Fetched reviews page', {
            pageNumber,
            fetched: pageReviews.length,
            uniqueSaved: reviewRecords.length,
            wanted: normalizedResultsWanted,
        });

        if (pageReviews.length < normalizedReviewsPerPage) break;
    }

    const ratingDistribution = Array.isArray(ratings?.ratingDistribution)
        ? ratings.ratingDistribution.map((entry) => compactObject({
            stars: toNumber(entry?.ratingType),
            count: toNumber(entry?.ratingCount),
        })).filter((entry) => Object.keys(entry).length > 0)
        : undefined;

    const secondaryRatings = Array.isArray(ratings?.secondaryRatings)
        ? ratings.secondaryRatings
            .map((entry) => compactObject({
                id: toTrimmed(entry?.id),
                label: toTrimmed(entry?.label),
                ratingValue: toNumber(entry?.ratingValue),
                ratingRange: toNumber(entry?.ratingRange),
                ratingPercentage: toNumber(entry?.ratingPercentage),
            }))
            .filter((entry) => Object.keys(entry).length > 0)
        : undefined;

    const ratingSummary = compactObject({
        totalRatingCount: toNumber(ratings?.totalRatingCount),
        totalReviewCount: toNumber(ratings?.totalReviewCount),
        totalRecommendedCount: toNumber(ratings?.totalRecommendedCount),
        totalNotRecommendedCount: toNumber(ratings?.totalNotRecommendedCount),
        totalPositiveFeedbackCount: toNumber(ratings?.totalPositiveFeedbackCount),
        totalNegativeFeedbackCount: toNumber(ratings?.totalNegativeFeedbackCount),
        firstReviewedOn: toTrimmed(ratings?.firstReviewedOn),
        lastReviewedOn: toTrimmed(ratings?.lastReviewedOn),
        primaryRatingValue: toNumber(ratings?.primaryRating?.ratingValue),
        primaryRatingRange: toNumber(ratings?.primaryRating?.ratingRange),
        primaryRatingPercentage: toNumber(ratings?.primaryRating?.ratingPercentage),
        secondaryRatings,
        ratingDistribution,
    });

    const commonFields = compactObject({
        productId: finalProductId,
        productName: normalizedProduct.name,
        productTypeName: normalizedProduct.typeName,
        productItemType: normalizedProduct.itemType,
        productUrl: normalizedProduct.url,
        productImage: normalizedProduct.image,
        productImageAlt: normalizedProduct.imageAlt,
        productPrice: normalizedProduct.price,
        productPriceText: normalizedProduct.priceText,
        productCurrency: normalizedProduct.currency,
        productCategoryPath: normalizedProduct.categoryPathText,
        productRatingFromSearch: normalizedProduct.rating,
        productReviewCountFromSearch: normalizedProduct.reviewCountFromSearch,
        productOnlineSellable: normalizedProduct.onlineSellable,
        productLastChance: normalizedProduct.lastChance,
        marketCountry: resolved.country,
        marketLanguage: resolved.language,
        sourceType: resolved.resolution,
        sortBy: `${sort.field}:${sort.direction}`,
        resultsWanted: normalizedResultsWanted,
        maxPages: normalizedMaxPages,
        reviewsPerPage: normalizedReviewsPerPage,
        totalRatingCount: ratingSummary.totalRatingCount,
        totalReviewCount: ratingSummary.totalReviewCount,
        totalRecommendedCount: ratingSummary.totalRecommendedCount,
        totalNotRecommendedCount: ratingSummary.totalNotRecommendedCount,
        totalPositiveFeedbackCount: ratingSummary.totalPositiveFeedbackCount,
        totalNegativeFeedbackCount: ratingSummary.totalNegativeFeedbackCount,
        firstReviewedOn: ratingSummary.firstReviewedOn,
        lastReviewedOn: ratingSummary.lastReviewedOn,
        primaryRatingValue: ratingSummary.primaryRatingValue,
        primaryRatingRange: ratingSummary.primaryRatingRange,
        primaryRatingPercentage: ratingSummary.primaryRatingPercentage,
    });

    if (!reviewRecords.length) {
        const fallbackRecord = compactObject({
            ...commonFields,
            inputUrl: toTrimmed(url),
            inputProductId: toTrimmed(productId),
            reviewCountCollected: 0,
            reviewPosition: 0,
            source: 'ikea-web-api',
            scrapedAt: new Date().toISOString(),
        });
        await Dataset.pushData(fallbackRecord);
    } else {
        let position = 0;
        for (const rawReview of reviewRecords) {
            position += 1;
            const mappedReview = mapReview(rawReview, position);
            const record = compactObject({
                ...commonFields,
                inputUrl: toTrimmed(url),
                inputProductId: toTrimmed(productId),
                reviewCountCollected: reviewRecords.length,
                reviewPosition: position,
                reviewId: mappedReview.reviewId,
                reviewType: mappedReview.reviewType,
                reviewTitle: mappedReview.title,
                reviewText: mappedReview.text,
                reviewAuthor: mappedReview.author,
                reviewAuthorNickname: mappedReview.authorNickname,
                reviewAuthorLocation: mappedReview.authorLocation,
                reviewSourceCountryCode: mappedReview.sourceCountryCode,
                reviewSourceLangCode: mappedReview.sourceLangCode,
                reviewSubmissionOn: mappedReview.submissionOn,
                reviewPrimaryRatingValue: mappedReview.primaryRatingValue,
                reviewPrimaryRatingRange: mappedReview.primaryRatingRange,
                reviewPositiveFeedbacksCount: mappedReview.positiveFeedbacksCount,
                reviewNegativeFeedbacksCount: mappedReview.negativeFeedbacksCount,
                reviewRecommended: mappedReview.recommended,
                reviewVerifiedPurchase: mappedReview.verifiedPurchase,
                reviewHasMedia: mappedReview.hasMedia,
                reviewLanguage: mappedReview.language,
                reviewTranslatedFrom: mappedReview.translatedFrom,
                reviewResponseResponder: mappedReview.response?.responder,
                reviewResponseText: mappedReview.response?.responseText,
                reviewResponseOn: mappedReview.response?.respondedOn,
                source: 'ikea-web-api',
                scrapedAt: new Date().toISOString(),
            });
            await Dataset.pushData(record);
        }
    }

    log.info('Run completed', {
        productId: finalProductId,
        reviewCountCollected: reviewRecords.length,
        totalReviewCountFromRatingsApi: ratingSummary.totalReviewCount,
    });
} catch (error) {
    log.error(`Fatal error: ${error.message}`);
    log.exception(error);
    throw error;
} finally {
    await Actor.exit();
}
