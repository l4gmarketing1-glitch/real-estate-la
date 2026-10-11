import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const fixture = fileURLToPath(new URL('./fixtures/scroll-test.mp4', import.meta.url));
async function mockPreparedFilm(page) {
  await page.route('**/assets/media/manifest.json', (route) => route.fulfill({
    json: { ready: true, duration: 20, film: 'film.mp4', hero: 'hero.mp4', mobileHero: 'hero-mobile.mp4' },
  }));
  await page.route('**/assets/media/*.mp4', (route) => route.fulfill({
    path: fixture,
    contentType: 'video/mp4',
    headers: { 'accept-ranges': 'bytes', 'content-length': String(statSync(fixture).size) },
  }));
}

test('property loads without broken resources, overflow, or an eager film download', async ({ page }) => {
  const errors = [];
  const failures = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failures.push(response.url()); });
  // Test the photo fallback regardless of whether production media has been generated.
  await page.route('**/assets/media/manifest.json', (route) => route.fulfill({ json: { ready: false } }));
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A little history.A new beginning.');
  await expect(page.locator('.price-fact')).toContainText('$1,175,000');
  await expect(page.locator('.gallery-card')).toHaveCount(6);
  await expect(page.locator('[data-film]').first()).toBeHidden();
  expect(await page.locator('#property-film').getAttribute('src')).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => performance.getEntriesByType('resource').reduce((sum, entry) => sum + entry.transferSize, 0))).toBeLessThan(600_000);
  await expect(page.getByRole('link', { name: 'Schedule a private tour' })).toHaveAttribute('href', /redfin\.com\/CA\/Van-Nuys\/14127-Lemay/);
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});

test('gallery filtering, keyboard navigation, and all 26 photographs work', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Kitchen', exact: true }).click();
  await expect(page.locator('.gallery-card')).toHaveCount(4);
  await page.locator('.gallery-card').first().click();
  await expect(page.locator('#photo-dialog')).toBeVisible();
  await expect(page.locator('#photo-counter')).toHaveText('1 / 4');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#photo-counter')).toHaveText('2 / 4');
  await page.keyboard.press('Escape');
  await expect(page.locator('#photo-dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'View all 26 photographs' }).click();
  await expect(page.locator('.photo-thumbnails button')).toHaveCount(26);
  await page.getByRole('button', { name: 'Close photo gallery' }).click();
  await expect(page.locator('#view-all')).toBeFocused();
});

test('navigation and reduced-motion preferences remain usable', async ({ page }) => {
  await mockPreparedFilm(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  if (page.viewportSize().width < 800) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'true');
    await page.locator('#navigation').getByRole('link', { name: 'The spaces' }).click();
    await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded', 'false');
  }
  await expect(page.locator('html')).not.toHaveClass(/motion/);
  expect(await page.locator('#hero-video').getAttribute('src')).toBeNull();
  await expect(page.locator('#residence h2')).toBeVisible();
});

test('prepared video scrubs on scroll and the film opens with playback controls', async ({ page }) => {
  await mockPreparedFilm(page);
  await page.goto('/');
  await expect(page.locator('#hero-video')).toHaveClass(/is-ready/);
  await page.evaluate(() => {
    const hero = document.querySelector('.hero-scroll');
    const header = document.querySelector('.header').offsetHeight;
    scrollTo({ top: hero.offsetTop - header + (hero.offsetHeight - innerHeight + header) * 0.55, behavior: 'instant' });
  });
  await expect.poll(() => page.locator('#hero-video').evaluate((video) => video.currentTime)).toBeGreaterThan(1);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('.hero-bottom [data-film]').click();
  await expect(page.locator('#film-dialog')).toBeVisible();
  await expect(page.locator('#property-film')).toHaveAttribute('controls', '');
  await page.getByRole('button', { name: 'Close film' }).click();
  expect(await page.locator('#property-film').evaluate((video) => video.paused)).toBe(true);
});
