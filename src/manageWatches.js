const { normalizeAmazonUrl } = require('./amazon');
const {
  loadWatchConfig,
  removeByUrl,
  resolveConfigPath,
  saveWatchConfig,
  upsertBrandWatch,
  upsertProduct
} = require('./watchConfig');

function printUsage() {
  console.log('Usage:');
  console.log('  node src/manageWatches.js list');
  console.log('  node src/manageWatches.js add-product "Name" "https://www.amazon.com/dp/ASIN"');
  console.log('  node src/manageWatches.js add-brand "Name" "https://www.amazon.com/s?..." "keyword1,keyword2" [maxItems=30]');
  console.log('  node src/manageWatches.js remove "https://www.amazon.com/dp/ASIN"');
}

function parseKeywords(rawKeywords) {
  if (!rawKeywords) {
    return [];
  }

  return String(rawKeywords)
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function listConfig(config) {
  console.log('=== Product Restock Watches ===');
  if (config.products.length === 0) {
    console.log('(none)');
  } else {
    config.products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} -> ${product.url}`);
    });
  }

  console.log('\n=== Brand New-Item Watches ===');
  if (config.brandWatches.length === 0) {
    console.log('(none)');
  } else {
    config.brandWatches.forEach((watch, index) => {
      console.log(
        `${index + 1}. ${watch.name} -> ${watch.url} | keywords=[${(watch.keywords || []).join(', ')}] | maxItems=${watch.maxItems}`
      );
    });
  }
}

function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;
  const configPath = resolveConfigPath();
  const config = loadWatchConfig(configPath);

  if (!command || command === 'help') {
    printUsage();
    return;
  }

  if (command === 'list') {
    listConfig(config);
    return;
  }

  if (command === 'add-product') {
    const [name, url] = args;
    if (!name || !url) {
      throw new Error('add-product requires: <name> <url>');
    }

    const updated = upsertProduct(config, {
      name,
      url: normalizeAmazonUrl(url)
    });
    saveWatchConfig(updated, configPath);
    console.log(`Saved product watch: ${name}`);
    return;
  }

  if (command === 'add-brand') {
    const [name, url, rawKeywords, rawMaxItems] = args;
    if (!name || !url) {
      throw new Error('add-brand requires: <name> <url> "keyword1,keyword2" [maxItems]');
    }

    const maxItems = rawMaxItems ? Number.parseInt(rawMaxItems, 10) : 30;
    if (Number.isNaN(maxItems) || maxItems <= 0) {
      throw new Error('maxItems must be a positive integer.');
    }

    const updated = upsertBrandWatch(config, {
      name,
      url,
      keywords: parseKeywords(rawKeywords),
      maxItems
    });
    saveWatchConfig(updated, configPath);
    console.log(`Saved brand watch: ${name}`);
    return;
  }

  if (command === 'remove') {
    const [url] = args;
    if (!url) {
      throw new Error('remove requires: <url>');
    }

    const normalizedUrl = url.includes('/dp/') || url.includes('/gp/product/') ? normalizeAmazonUrl(url) : url;
    const updated = removeByUrl(config, normalizedUrl);
    saveWatchConfig(updated, configPath);
    console.log(`Removed watch by url: ${normalizedUrl}`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message || error);
    printUsage();
    process.exit(1);
  }
}

module.exports = {
  main,
  parseKeywords
};
