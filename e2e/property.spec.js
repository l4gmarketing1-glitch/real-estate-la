import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';

const fixture = fileURLToPath(new URL('./fixtures/scroll-test.mp4', import.meta.url));
async function mockPreparedFilm(page) {
  await page.route('**/assets/media/manifest.json', (route) => route.fulfill({
    json: { ready: true, duration: 30, film: 'film-30s-spatial.mp4', hero: 'hero.mp4', mobileHero: 'hero-mobile.mp4' },
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
  await expect(page.getByRole('button', { name: 'Schedule a private tour' })).toHaveAttribute('data-tour', '');
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
  await expect.poll(() => page.locator('#property-film').evaluate((video) => video.paused)).toBe(true);
});

test('the published film plays the real 30-second edit through its final shot', async ({ page }) => {
  await page.goto('/');
  await page.locator('.hero-bottom [data-film]').click();
  const video = page.locator('#property-film');
  await expect(video).toHaveAttribute('src', './assets/media/film-30s-spatial.mp4');
  await expect.poll(() => video.evaluate((element) => element.duration)).toBe(30);
  await video.evaluate((element) => { element.pause(); element.currentTime = 29; });
  await expect.poll(() => video.evaluate((element) => !element.seeking && element.readyState >= 2)).toBe(true);
  expect(await video.evaluate((element) => [element.videoWidth, element.videoHeight])).toEqual([1280, 720]);
  await page.getByRole('button', { name: 'Close film' }).click();
  await expect.poll(() => video.evaluate((element) => element.paused)).toBe(true);
});

test('tour requests open accessibly and submit required details to the configured service', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Schedule a private tour' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Your next chapter, in person.' });
  await expect(dialog).toBeVisible();
  await expect(page.locator('#tour-name')).toBeFocused();
  await page.getByRole('button', { name: 'Request a private tour' }).click();
  await expect(dialog).toBeVisible();
  await page.getByLabel('Full name').fill('Test Visitor');
  await page.getByLabel('Phone number').fill('+1 555 123 4567');
  await page.getByLabel('Email address').fill('visitor@example.com');
  await page.getByLabel('Preferred viewing date').fill('2000-01-01');
  expect(await page.locator('#tour-date').evaluate(el => el.validity.rangeUnderflow)).toBe(true);
  await page.getByLabel('Preferred viewing date').fill('2099-01-01');
  let submitted;
  await page.route('https://formsubmit.co/**', async route => {
    submitted = new URLSearchParams(route.request().postData());
    await route.fulfill({ contentType: 'text/html', body: '<p>Mock verification step</p>' });
  });
  await page.getByRole('button', { name: 'Request a private tour' }).click();
  await expect(page.getByText('Mock verification step')).toBeVisible();
  expect(submitted.get('email')).toBe('visitor@example.com');
  expect(submitted.get('preferred_date')).toBe('2099-01-01');
  await page.goto('/');
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator('footer')).toHaveCount(0);
});
