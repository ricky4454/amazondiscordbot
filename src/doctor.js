const { fetchProductAvailability } = require('./amazon');
const { loadConfig } = require('./config');
const { DiscordNotifier } = require('./discordBot');
const { loadDotEnv } = require('./index');

function shouldSkipAmazon(argv = process.argv.slice(2), env = process.env) {
  return argv.includes('--skip-amazon') || env.DOCTOR_SKIP_AMAZON === '1';
}

async function runDoctor(options = {}) {
  const argv = options.argv || process.argv.slice(2);
  const env = options.env || process.env;
  const skipAmazon = shouldSkipAmazon(argv, env);

  console.log('== Amazon Discord Bot Doctor ==');
  loadDotEnv();

  const config = loadConfig();
  console.log(`Loaded ${config.products.length} product(s).`);
  console.log(`Poll interval: ${config.pollIntervalMs}ms`);

  const notifier = new DiscordNotifier({
    token: config.discordToken,
    channelId: config.discordChannelId
  });

  console.log('Checking Discord channel access...');
  const channel = await notifier.validateChannel();
  console.log(`Discord channel OK: ${channel.id}`);

  if (skipAmazon) {
    console.log('Skipping Amazon checks because --skip-amazon was provided.');
    console.log('Doctor check finished successfully.');
    return;
  }

  for (const product of config.products) {
    console.log(`Checking Amazon product: ${product.name}`);
    const result = await fetchProductAvailability(product, {
      timeoutMs: config.requestTimeoutMs,
      userAgent: config.userAgent
    });
    console.log(` -> ${result.inStock ? 'IN STOCK' : 'OUT OF STOCK'} | ${result.availabilityText}`);
  }

  console.log('Doctor check finished successfully.');
}

if (require.main === module) {
  runDoctor().catch((error) => {
    console.error('Doctor check failed.');
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  });
}

module.exports = {
  runDoctor,
  shouldSkipAmazon
};
