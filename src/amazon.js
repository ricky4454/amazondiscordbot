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

async function fetchProductAvailability(product, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const normalizedUrl = normalizeAmazonUrl(product.url);
    const response = await fetch(normalizedUrl, {
      headers: {
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'user-agent': options.userAgent
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Amazon responded with ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
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

module.exports = {
  extractAvailability,
  extractFirstMatch,
  fetchProductAvailability,
  normalizeAmazonUrl,
  normalizeWhitespace,
  stripTags
};
