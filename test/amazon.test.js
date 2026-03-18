const test = require('node:test');
const assert = require('node:assert/strict');

const { extractAvailability, normalizeAmazonUrl } = require('../src/amazon');
const { parseProducts } = require('../src/config');

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

test('parseProducts rejects invalid JSON payloads', () => {
  assert.throws(() => parseProducts('{bad json}'), /must be valid JSON/);
});
