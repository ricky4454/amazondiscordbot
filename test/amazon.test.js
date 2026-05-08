const { parseKeywords } = require('../src/manageWatches');
const test = require('node:test');
const assert = require('node:assert/strict');

const { extractAvailability, extractListingProducts, normalizeAmazonUrl } = require('../src/amazon');
const { parseBrandWatches, parseProducts } = require('../src/config');
const { shouldSkipAmazon } = require('../src/doctor');
const { buildDiscordErrorMessage } = require('../src/discordBot');
const { matchesKeywordFilter, getProductAlertHeader, getBrandItemsToNotify } = require('../src/index');

test('extractAvailability marks in-stock pages correctly', () => {
  const result = extractAvailability(`
    <html>
      <span id="productTitle">Sample GPU</span>
      <div id="availability">In Stock.</div>
      <input id="add-to-cart-button" />
    </html>
  `);

  assert.equal(result.title, 'Sample GPU');
  assert.equal(result.inStock, true);
});

test('extractAvailability marks unavailable pages correctly', () => {
  const result = extractAvailability(`
    <html>
      <span id="productTitle">Sample GPU</span>
      <div id="availability">Currently unavailable.</div>
    </html>
  `);

  assert.equal(result.inStock, false);
  assert.match(result.availabilityText, /Currently unavailable/i);
});

test('extractAvailability matches the provided Amazon product page state', () => {
  const result = extractAvailability(`
    <html>
      <span id="productTitle">Ichibansho Figure - Persona 5 Royal - Joker Collectbile Statue</span>
      <div id="availability">
        Currently unavailable.
        We don't know when or if this item will be back in stock.
      </div>
    </html>
  `);

  assert.equal(result.title, 'Ichibansho Figure - Persona 5 Royal - Joker Collectbile Statue');
  assert.equal(result.inStock, false);
  assert.match(result.availabilityText, /Currently unavailable/i);
  assert.match(result.availabilityText, /back in stock/i);
});

test('extractListingProducts parses listing links and deduplicates ASINs', () => {
  const items = extractListingProducts(`
    <a href="/dp/B0AAAAAA11">Item 1</a>
    <a href="/dp/B0AAAAAA11?ref_=dup">Item 1 duplicate</a>
    <a href="https://www.amazon.com/gp/product/B0BBBBBB22">Item 2</a>
  `, 30);

  assert.deepEqual(items.map((item) => item.asin), ['B0AAAAAA11', 'B0BBBBBB22']);
  assert.equal(items[0].url, 'https://www.amazon.com/dp/B0AAAAAA11');
});

test('extractListingProducts falls back to ASIN signals used in Amazon store pages', () => {
  const items = extractListingProducts(`
    <div data-item='{"asin":"B0CCCCCC33"}'>
      <img alt="Persona 5 Joker Figure" src="x" />
    </div>
    <script>var foo = "\/dp\/B0DDDDDD44";</script>
  `, 30);

  assert.deepEqual(items.map((item) => item.asin), ['B0CCCCCC33', 'B0DDDDDD44']);
  assert.equal(items[0].title, 'Persona 5 Joker Figure');
  assert.equal(items[1].url, 'https://www.amazon.com/dp/B0DDDDDD44');
});

test('normalizeAmazonUrl strips query parameters down to canonical dp url', () => {
  assert.equal(
    normalizeAmazonUrl('https://www.amazon.com/dp/B0FY7XV4JY/?coliid=I1ICROY7VSIYFH&colid=468FUDFXB0QM&ref_=list_c_wl_lv_ov_lig_dp_it&th=1'),
    'https://www.amazon.com/dp/B0FY7XV4JY'
  );
});

test('parseProducts validates JSON arrays and normalizes URLs', () => {
  assert.deepEqual(
    parseProducts('[{"name":"Item","url":"https://www.amazon.com/dp/B0FY7XV4JY/?ref_=abc"}]'),
    [{ name: 'Item', url: 'https://www.amazon.com/dp/B0FY7XV4JY' }]
  );
});

test('parseBrandWatches supports empty and valid arrays', () => {
  assert.deepEqual(parseBrandWatches(undefined), []);

  assert.deepEqual(
    parseBrandWatches('[{"name":"Bandai","url":"https://www.amazon.com/s?k=bandai","maxItems":20,"keywords":["joker","figure"]}]'),
    [{ name: 'Bandai', url: 'https://www.amazon.com/s?k=bandai', maxItems: 20, keywords: ['joker', 'figure'] }]
  );
});

test('parseProducts rejects invalid JSON payloads', () => {
  assert.throws(() => parseProducts('{bad json}'), /must be valid JSON/);
});

test('shouldSkipAmazon supports cli flag and env override', () => {
  assert.equal(shouldSkipAmazon(['--skip-amazon'], {}), true);
  assert.equal(shouldSkipAmazon([], { DOCTOR_SKIP_AMAZON: '1' }), true);
  assert.equal(shouldSkipAmazon([], {}), false);
});

test('buildDiscordErrorMessage explains unauthorized token errors clearly', () => {
  const message = buildDiscordErrorMessage({
    method: 'GET',
    path: '/channels/123',
    status: 401,
    statusText: 'Unauthorized',
    errorText: '{"message": "401: Unauthorized", "code": 0}'
  });

  assert.match(message, /Check DISCORD_TOKEN/i);
  assert.match(message, /regenerate it/i);
});


test('matchesKeywordFilter matches when title contains keyword', () => {
  assert.equal(matchesKeywordFilter('Persona 5 Joker Figure', ['joker', 'nendoroid']), true);
  assert.equal(matchesKeywordFilter('Persona 5 Joker Figure', ['lego']), false);
  assert.equal(matchesKeywordFilter('Anything', []), true);
});


test('parseKeywords splits comma-separated keywords', () => {
  assert.deepEqual(parseKeywords('joker, figure,persona'), ['joker', 'figure', 'persona']);
  assert.deepEqual(parseKeywords(''), []);
});


test('getProductAlertHeader emits in-stock alerts and distinguishes restock', () => {
  assert.equal(getProductAlertHeader(undefined, true), '✅ **IN STOCK 감지!**');
  assert.equal(getProductAlertHeader(false, true), '🚨 **재입고 감지!**');
  assert.equal(getProductAlertHeader(true, false), null);
});


test('getBrandItemsToNotify matches keywords from first baseline scan', () => {
  const items = [
    { asin: 'A1', title: 'Persona Joker Figure', url: 'https://www.amazon.com/dp/A1' },
    { asin: 'A2', title: 'Random Item', url: 'https://www.amazon.com/dp/A2' }
  ];

  const result = getBrandItemsToNotify({ existingAsins: undefined, items, keywords: ['joker'] });
  assert.deepEqual(result.map((item) => item.asin), ['A1']);
});

test('getBrandItemsToNotify includes existing and new items when keyword matches', () => {
  const items = [
    { asin: 'A1', title: 'Persona Joker Figure', url: 'https://www.amazon.com/dp/A1' },
    { asin: 'A3', title: 'Persona Joker New Ver', url: 'https://www.amazon.com/dp/A3' },
    { asin: 'A4', title: 'Another Product', url: 'https://www.amazon.com/dp/A4' }
  ];

  const result = getBrandItemsToNotify({ items, keywords: ['joker'] });
  assert.deepEqual(result.map((item) => item.asin), ['A1', 'A3']);
});
