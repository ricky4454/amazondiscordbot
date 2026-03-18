const { normalizeAmazonUrl } = require('./amazon');

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 15 * 1000;

function parseProducts(rawProducts) {
  if (!rawProducts) {
    throw new Error('AMAZON_PRODUCTS_JSON is required.');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawProducts);
  } catch (error) {
    throw new Error(`AMAZON_PRODUCTS_JSON must be valid JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AMAZON_PRODUCTS_JSON must be a non-empty JSON array.');
  }

  return parsed.map((product, index) => {
    if (!product || typeof product !== 'object') {
      throw new Error(`Product at index ${index} must be an object.`);
    }

    if (!product.name || !product.url) {
      throw new Error(`Product at index ${index} requires both name and url.`);
    }

    return {
      name: String(product.name),
      url: normalizeAmazonUrl(String(product.url))
    };
  });
}

function parseInteger(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}

function loadConfig() {
  const discordToken = process.env.DISCORD_TOKEN;
  const discordChannelId = process.env.DISCORD_CHANNEL_ID;

  if (!discordToken) {
    throw new Error('DISCORD_TOKEN is required.');
  }

  if (!discordChannelId) {
    throw new Error('DISCORD_CHANNEL_ID is required.');
  }

  return {
    discordToken,
    discordChannelId,
    pollIntervalMs: parseInteger('POLL_INTERVAL_MS', DEFAULT_POLL_INTERVAL_MS),
    requestTimeoutMs: parseInteger('REQUEST_TIMEOUT_MS', DEFAULT_REQUEST_TIMEOUT_MS),
    userAgent:
      process.env.USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    products: parseProducts(process.env.AMAZON_PRODUCTS_JSON)
  };
}

module.exports = {
  loadConfig,
  parseProducts
};
