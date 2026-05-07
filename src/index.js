const fs = require('node:fs');
const path = require('node:path');
const { loadConfig } = require('./config');
const { fetchBrandListing, fetchProductAvailability } = require('./amazon');
const { DiscordNotifier } = require('./discordBot');

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function createMonitor({ notifier, config, logger = console }) {
  const previousProductState = new Map();
  const seenBrandAsins = new Map();
  let intervalId;
  let running = false;

  async function checkProducts() {
    for (const product of config.products) {
      try {
        const result = await fetchProductAvailability(product, {
          timeoutMs: config.requestTimeoutMs,
          userAgent: config.userAgent
        });

        const previousInStock = previousProductState.get(product.url);
        previousProductState.set(product.url, result.inStock);

        logger.info(
          `[${result.checkedAt}] ${result.name} => ${result.inStock ? 'IN STOCK' : 'OUT OF STOCK'} (${result.availabilityText})`
        );

        if (previousInStock === false && result.inStock === true) {
          await notifier.sendMessage([
            '🚨 **재입고 감지!**',
            `상품: **${result.title || result.name}**`,
            `상태: ${result.availabilityText}`,
            `링크: ${result.url}`
          ].join('\n'));
        }
      } catch (error) {
        logger.error(`Failed to check ${product.name}: ${error.message}`);
        await notifier.sendMessage(`⚠️ ${product.name} 확인 중 오류가 발생했습니다: ${error.message}`);
      }
    }
  }

  async function checkBrandWatches() {
    for (const watch of config.brandWatches) {
      try {
        const listing = await fetchBrandListing(watch, {
          timeoutMs: config.requestTimeoutMs,
          userAgent: config.userAgent
        });

        logger.info(`[${listing.checkedAt}] ${watch.name} listing => ${listing.items.length} items`);

        const existing = seenBrandAsins.get(watch.url);
        const currentAsins = new Set(listing.items.map((item) => item.asin));

        if (!existing) {
          seenBrandAsins.set(watch.url, currentAsins);
          continue;
        }

        const newlyDiscovered = listing.items.filter((item) => !existing.has(item.asin));
        seenBrandAsins.set(watch.url, currentAsins);

        for (const item of newlyDiscovered) {
          await notifier.sendMessage([
            '🆕 **브랜드 신규 상품 감지!**',
            `브랜드/감시명: **${watch.name}**`,
            `상품: ${item.title}`,
            `링크: ${item.url}`
          ].join('\n'));
        }
      } catch (error) {
        logger.error(`Failed to check brand watch ${watch.name}: ${error.message}`);
        await notifier.sendMessage(`⚠️ ${watch.name} 브랜드 감시 중 오류가 발생했습니다: ${error.message}`);
      }
    }
  }

  async function checkAll() {
    if (running) {
      logger.warn('Previous stock check is still running, skipping this interval.');
      return;
    }

    running = true;
    try {
      await checkProducts();
      await checkBrandWatches();
    } finally {
      running = false;
    }
  }

  return {
    async start() {
      await checkAll();
      intervalId = setInterval(checkAll, config.pollIntervalMs);
    },
    stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    }
  };
}

async function main() {
  loadDotEnv();
  const config = loadConfig();
  const notifier = new DiscordNotifier({
    token: config.discordToken,
    channelId: config.discordChannelId
  });

  await notifier.validateChannel();
  await notifier.sendMessage([
    '🛎️ Amazon 감시를 시작합니다.',
    `재입고 감시: ${config.products.length}개`,
    ...config.products.map((product) => `• ${product.name}`),
    `브랜드 신규상품 감시: ${config.brandWatches.length}개`,
    ...config.brandWatches.map((watch) => `• ${watch.name}`),
    `폴링 주기: ${Math.round(config.pollIntervalMs / 1000)}초`
  ].join('\n'));

  const monitor = createMonitor({ notifier, config });
  await monitor.start();

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down.`);
    monitor.stop();
    process.exitCode = 0;
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  createMonitor,
  loadDotEnv,
  main
};
