const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Collect anything the page reports as broken: uncaught exceptions, console
// errors (a failed subresource-integrity check shows up here) and requests
// that never completed.
function watchForErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console: ' + msg.text());
  });
  page.on('requestfailed', (req) => {
    errors.push('requestfailed: ' + req.url() + ' ' + (req.failure() || {}).errorText);
  });
  return errors;
}

function throughputOf(text) {
  return Number(text.split(' ')[1].replace('bps', ''));
}

test('jquery loads from the CDN at the pinned version and passes its integrity check', async ({ page }) => {
  const pinned = indexHtml.match(/ajax\/libs\/jquery\/([^/]+)\/jquery(?:\.min)?\.js/);
  expect(pinned, 'index.html should reference a pinned jquery version').not.toBeNull();

  const errors = watchForErrors(page);
  await page.goto('/index.html');

  expect(await page.evaluate(() => window.jQuery && window.jQuery.fn.jquery)).toBe(pinned[1]);
  expect(await page.evaluate(() => typeof window.JSBWTest)).toBe('function');
  expect(errors).toEqual([]);
});

test('a full download, upload and rtt run completes', async ({ page }) => {
  const errors = watchForErrors(page);
  await page.goto('/index.html');

  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#state')).toHaveText('running');

  await expect(page.locator('#dlstatus')).toHaveText(/^dl .*Mbps .*s$/, { timeout: 30000 });
  await expect(page.locator('#ulstatus')).toHaveText(/^ul .*Mbps .*s$/, { timeout: 30000 });
  await expect(page.locator('#rttstatus')).toHaveText(/^rtt \d+ ms$/, { timeout: 30000 });
  await expect(page.locator('#state')).toHaveText('stopped', { timeout: 30000 });

  for (const id of ['#dlstatus', '#ulstatus']) {
    const throughput = throughputOf(await page.locator(id).textContent());
    expect(Number.isFinite(throughput), id + ' throughput should be a finite number').toBe(true);
    expect(throughput).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test('stop ends a run that is in progress', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.locator('#state')).toHaveText('running');
  await page.getByRole('button', { name: 'Stop' }).click();

  await expect(page.locator('#state')).toHaveText('stopped', { timeout: 30000 });
});
