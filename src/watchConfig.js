const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), 'watch-config.json');

function resolveConfigPath() {
  return process.env.WATCH_CONFIG_PATH || DEFAULT_CONFIG_PATH;
}

function loadWatchConfig(configPath = resolveConfigPath()) {
  if (!fs.existsSync(configPath)) {
    return { products: [], brandWatches: [] };
  }

  const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return {
    products: Array.isArray(parsed.products) ? parsed.products : [],
    brandWatches: Array.isArray(parsed.brandWatches) ? parsed.brandWatches : []
  };
}

function saveWatchConfig(config, configPath = resolveConfigPath()) {
  const normalized = {
    products: Array.isArray(config.products) ? config.products : [],
    brandWatches: Array.isArray(config.brandWatches) ? config.brandWatches : []
  };

  fs.writeFileSync(configPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
}

function upsertProduct(config, product) {
  const products = config.products.filter((item) => item.url !== product.url);
  products.push(product);
  return { ...config, products };
}

function upsertBrandWatch(config, brandWatch) {
  const brandWatches = config.brandWatches.filter((item) => item.url !== brandWatch.url);
  brandWatches.push(brandWatch);
  return { ...config, brandWatches };
}

function removeByUrl(config, url) {
  return {
    products: config.products.filter((item) => item.url !== url),
    brandWatches: config.brandWatches.filter((item) => item.url !== url)
  };
}

module.exports = {
  loadWatchConfig,
  removeByUrl,
  resolveConfigPath,
  saveWatchConfig,
  upsertBrandWatch,
  upsertProduct
};
