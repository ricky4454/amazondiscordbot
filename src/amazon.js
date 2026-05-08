function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function stripTags(value) {
  return normalizeWhitespace(value.replace(/<[^>]+>/g, ' '));
}

function extractFirstMatch(html, regex) {
  const match = html.match(regex);
  return match ? stripTags(match[1]) : '';
}

function normalizeAmazonUrl(rawUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (error) {
    throw new Error(`Invalid product url: ${rawUrl}`);
  }

  const asinMatch = parsedUrl.pathname.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
  if (asinMatch) {
    return `https://${parsedUrl.hostname}/dp/${asinMatch[2].toUpperCase()}`;
  }

  parsedUrl.search = '';
  parsedUrl.hash = '';
  return parsedUrl.toString();
}

function extractAvailability(html) {
  const title =
    extractFirstMatch(html, /<span[^>]*id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i) ||
    extractFirstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
    'Amazon product';

  const availabilityText =
    extractFirstMatch(html, /<div[^>]*id=["']availability["'][^>]*>([\s\S]*?)<\/div>/i) ||
    'Availability text not found';

  const addToCartButton = /id=["']add-to-cart-button["']/i.test(html);
  const buyNowButton = /id=["']buy-now-button["']/i.test(html);
  const normalizedAvailability = availabilityText.toLowerCase();
  const soldOutSignals = [
    'currently unavailable',
    'temporarily out of stock',
    'we don\'t know when or if this item will be back in stock',
    'unavailable'
  ];
  const hasSoldOutSignal = soldOutSignals.some((signal) => normalizedAvailability.includes(signal));
  const inStockSignal = normalizedAvailability.includes('in stock') || addToCartButton || buyNowButton;

  return {
    title,
    availabilityText,
    inStock: Boolean(inStockSignal && !hasSoldOutSignal)
  };
}

function extractListingProducts(html, maxItems = 30) {
  const matches = [...html.matchAll(/<a[^>]+href=["']([^"']*(?:\/dp\/|\/gp\/product\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const asinSignals = [...html.matchAll(/(?:\/dp\/|\/gp\/product\/|"asin"\s*:\s*")([A-Z0-9]{10})/gi)];
  const seen = new Set();
  const products = [];

  for (const match of matches) {
    const href = match[1];
    const anchorText = stripTags(match[2]);
    const maybeUrl = href.startsWith('http') ? href : `https://www.amazon.com${href}`;

    let normalizedUrl;
    try {
      normalizedUrl = normalizeAmazonUrl(maybeUrl);
    } catch {
      continue;
    }

    if (seen.has(normalizedUrl)) {
      continue;
    }

    const asinMatch = normalizedUrl.match(/\/dp\/([A-Z0-9]{10})/i);
    if (!asinMatch) {
      continue;
    }

    seen.add(normalizedUrl);
    products.push({
      asin: asinMatch[1].toUpperCase(),
      url: normalizedUrl,
      title: anchorText || `Amazon product ${asinMatch[1].toUpperCase()}`
    });

    if (products.length >= maxItems) {
      break;
    }
  }

  for (const match of asinSignals) {
    const asin = String(match[1] || '').toUpperCase();
    if (!asin) {
      continue;
    }

    const normalizedUrl = `https://www.amazon.com/dp/${asin}`;
    if (seen.has(normalizedUrl)) {
      continue;
    }

    const vicinity = html.slice(Math.max(0, match.index - 250), Math.min(html.length, match.index + 450));
    const hintedTitle =
      extractFirstMatch(vicinity, /aria-label=["']([\s\S]*?)["']/i) ||
      extractFirstMatch(vicinity, /alt=["']([\s\S]*?)["']/i) ||
      extractFirstMatch(vicinity, /title=["']([\s\S]*?)["']/i);

    seen.add(normalizedUrl);
    products.push({
      asin,
      url: normalizedUrl,
      title: hintedTitle || `Amazon product ${asin}`
    });

    if (products.length >= maxItems) {
      break;
    }
  }

  return products;
}

async function fetchHtml(url, options) {
  const response = await fetch(url, {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      'user-agent': options.userAgent
    },
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(`Amazon responded with ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchProductAvailability(product, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const normalizedUrl = normalizeAmazonUrl(product.url);
    const html = await fetchHtml(normalizedUrl, {
      userAgent: options.userAgent,
      signal: controller.signal
    });
    const parsed = extractAvailability(html);

    return {
      ...product,
      url: normalizedUrl,
      ...parsed,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Amazon request timed out after ${options.timeoutMs}ms`);
    }

    if (error.cause) {
      throw new Error(`Amazon request failed: ${error.message}`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchBrandListing(brandWatch, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const html = await fetchHtml(brandWatch.url, {
      userAgent: options.userAgent,
      signal: controller.signal
    });

    return {
      ...brandWatch,
      checkedAt: new Date().toISOString(),
      items: extractListingProducts(html, brandWatch.maxItems)
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Brand listing request timed out after ${options.timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  extractAvailability,
  extractFirstMatch,
  extractListingProducts,
  fetchBrandListing,
  fetchProductAvailability,
  normalizeAmazonUrl,
  normalizeWhitespace,
  stripTags
};
