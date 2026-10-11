import { photos } from './property.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const connection = navigator.connection;
const economicalConnection = connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType);
const canAnimate = () => !reduceMotion.matches;
if (canAnimate()) document.documentElement.classList.add('motion');

// The navigation works with touch, keyboard, and normal anchor links.
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
function closeMenu() {
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open menu');
  nav.classList.remove('open');
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  nav.classList.toggle('open', open);
});
nav.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

// Lazy gallery: only six preview images are present until the visitor opens the full collection.
const grid = document.querySelector('#gallery-grid');
const photoDialog = document.querySelector('#photo-dialog');
const lightboxImage = document.querySelector('#lightbox-image');
const photoCaption = document.querySelector('#photo-caption');
const thumbnails = document.querySelector('#photo-thumbnails');
let filteredPhotos = photos;
let activePhotos = photos;
let activeIndex = 0;
let dialogOpener;

function showPhoto(index) {
  activeIndex = (index + activePhotos.length) % activePhotos.length;
  const photo = activePhotos[activeIndex];
  lightboxImage.src = `./assets/images/${photo.id}-1024.webp`;
  lightboxImage.alt = photo.alt;
  photoCaption.textContent = photo.title;
  document.querySelector('#photo-counter').textContent = `${activeIndex + 1} / ${activePhotos.length}`;
  for (const [i, button] of [...thumbnails.children].entries()) {
    button.classList.toggle('active', i === activeIndex);
    button.setAttribute('aria-current', String(i === activeIndex));
  }
  thumbnails.children[activeIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}
function openPhotos(index, collection, opener) {
  activePhotos = collection;
  dialogOpener = opener;
  thumbnails.replaceChildren();
  for (const [i, photo] of activePhotos.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `View photograph ${i + 1}: ${photo.title}`);
    const image = document.createElement('img');
    image.src = `./assets/images/${photo.id}-640.webp`;
    image.alt = '';
    image.loading = 'lazy';
    button.append(image);
    button.addEventListener('click', () => showPhoto(i));
    thumbnails.append(button);
  }
  photoDialog.showModal();
  document.body.classList.add('modal-open');
  showPhoto(index);
}
function renderGallery(category = 'All') {
  filteredPhotos = category === 'All' ? photos : photos.filter((photo) => photo.category === category);
  grid.replaceChildren();
  for (const [index, photo] of filteredPhotos.slice(0, 6).entries()) {
    const button = document.createElement('button');
    button.className = 'gallery-card';
    button.type = 'button';
    button.setAttribute('aria-label', `Open photograph: ${photo.title}`);
    const imageBox = document.createElement('div');
    imageBox.className = 'gallery-image';
    const image = document.createElement('img');
    image.src = `./assets/images/${photo.id}-640.webp`;
    image.srcset = `./assets/images/${photo.id}-640.webp 640w, ./assets/images/${photo.id}-1024.webp 1024w`;
    image.sizes = '(max-width: 540px) 90vw, 45vw';
    image.alt = photo.alt;
    image.width = 1024;
    image.height = 683;
    image.loading = 'lazy';
    image.decoding = 'async';
    const expand = document.createElement('span');
    expand.className = 'gallery-expand';
    expand.textContent = '+';
    expand.setAttribute('aria-hidden', 'true');
    imageBox.append(image, expand);
    const caption = document.createElement('div');
    caption.className = 'gallery-caption';
    const number = document.createElement('small');
    number.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('strong');
    title.textContent = photo.title;
    caption.append(number, title);
    button.append(imageBox, caption);
    button.addEventListener('click', () => openPhotos(index, filteredPhotos, button));
    grid.append(button);
  }
  document.querySelector('#gallery-count').textContent = `${filteredPhotos.length} photographs`;
}
renderGallery();
for (const filter of document.querySelectorAll('[data-filter]')) {
  filter.addEventListener('click', () => {
    for (const other of document.querySelectorAll('[data-filter]')) {
      other.classList.toggle('active', other === filter);
      other.setAttribute('aria-pressed', String(other === filter));
    }
    renderGallery(filter.dataset.filter);
  });
}
document.querySelector('#view-all').addEventListener('click', (event) => openPhotos(0, photos, event.currentTarget));
document.querySelector('.photo-prev').addEventListener('click', () => showPhoto(activeIndex - 1));
document.querySelector('.photo-next').addEventListener('click', () => showPhoto(activeIndex + 1));
photoDialog.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(activeIndex - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(activeIndex + 1); }
});
let touchStart = null;
lightboxImage.addEventListener('touchstart', (event) => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
lightboxImage.addEventListener('touchend', (event) => {
  if (touchStart === null) return;
  const distance = event.changedTouches[0].clientX - touchStart;
  if (Math.abs(distance) > 50) showPhoto(activeIndex + (distance < 0 ? 1 : -1));
  touchStart = null;
}, { passive: true });
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    dialogOpener?.focus({ preventScroll: true });
  });
}

// Intersection-based reveals stop observing after their single entrance.
const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) if (entry.isIntersecting) {
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  }
}, { threshold: 0.12 });
for (const element of document.querySelectorAll('[data-reveal]')) revealObserver.observe(element);

// A restrained CSS 3D perspective effect, with no WebGL or animation framework.
for (const card of document.querySelectorAll('[data-tilt]')) {
  let frame;
  card.addEventListener('pointermove', (event) => {
    if (!canAnimate() || event.pointerType !== 'mouse' || !matchMedia('(hover: hover)').matches) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      card.style.transform = `perspective(1200px) rotateX(${-y * 4}deg) rotateY(${x * 5}deg)`;
    });
  });
  card.addEventListener('pointerleave', () => { cancelAnimationFrame(frame); card.style.transform = ''; });
}

// Scroll controls a short, frequently-keyframed Seedance clip. The poster is always available.
const hero = document.querySelector('.hero-scroll');
const heroVideo = document.querySelector('#hero-video');
const heroCopy = document.querySelector('.hero-content');
const heroChapter = document.querySelector('.hero-chapter');
const progressBar = document.querySelector('#scroll-progress');
const mobileBar = document.querySelector('.mobile-bar');
let mediaManifest = null;
let desiredTime = 0;
let scrollFrame = null;
let heroLoaded = false;
function seekHero() {
  if (!heroLoaded || heroVideo.readyState < 2 || heroVideo.seeking || !canAnimate()) return;
  if (Math.abs(heroVideo.currentTime - desiredTime) > 0.045) heroVideo.currentTime = desiredTime;
}
heroVideo.addEventListener('seeked', seekHero);
heroVideo.addEventListener('loadeddata', () => { heroVideo.classList.add('is-ready'); updateScroll(); });
heroVideo.addEventListener('error', () => { heroVideo.classList.remove('is-ready'); });
function updateScroll() {
  scrollFrame = null;
  const box = hero.getBoundingClientRect();
  const headerHeight = document.querySelector('.header').offsetHeight;
  const travel = Math.max(1, hero.offsetHeight - (innerHeight - headerHeight));
  const progress = Math.min(1, Math.max(0, (headerHeight - box.top) / travel));
  mobileBar.classList.toggle('visible', box.bottom < innerHeight * 0.45);
  if (!canAnimate()) return;
  const copyOpacity = Math.max(0, 1 - progress * 3);
  heroCopy.style.opacity = String(copyOpacity);
  heroCopy.style.transform = `translateY(${-progress * 45}px)`;
  heroCopy.style.pointerEvents = copyOpacity < 0.05 ? 'none' : '';
  heroChapter.style.opacity = String(Math.min(1, Math.max(0, (progress - 0.38) * 3.2)));
  heroChapter.style.transform = `translateY(${Math.max(0, 1 - progress * 1.6) * 28}px)`;
  progressBar.style.transform = `scaleX(${progress})`;
  if (Number.isFinite(heroVideo.duration)) {
    desiredTime = progress * Math.max(0, heroVideo.duration - 0.06);
    seekHero();
  }
}
function requestScrollUpdate() {
  if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateScroll);
}
addEventListener('scroll', requestScrollUpdate, { passive: true });
addEventListener('resize', requestScrollUpdate, { passive: true });
updateScroll();

function loadHero() {
  if (heroLoaded || !mediaManifest?.ready || !canAnimate() || economicalConnection) return;
  heroLoaded = true;
  heroVideo.src = `./assets/media/${innerWidth <= 600 ? mediaManifest.mobileHero : mediaManifest.hero}`;
  heroVideo.preload = 'auto';
  heroVideo.load();
}
reduceMotion.addEventListener('change', () => {
  document.documentElement.classList.toggle('motion', canAnimate());
  if (!canAnimate()) {
    heroCopy.style.opacity = '';
    heroCopy.style.transform = '';
    heroCopy.style.pointerEvents = '';
    heroVideo.pause();
  } else loadHero();
  requestScrollUpdate();
});

const filmDialog = document.querySelector('#film-dialog');
const filmPlayer = document.querySelector('#property-film');
for (const button of document.querySelectorAll('[data-film]')) {
  button.addEventListener('click', () => {
    if (!mediaManifest?.ready) return;
    dialogOpener = button;
    if (!filmPlayer.getAttribute('src')) filmPlayer.src = `./assets/media/${mediaManifest.film}`;
    filmDialog.showModal();
    document.body.classList.add('modal-open');
    filmPlayer.play().catch(() => { /* Native controls remain available if autoplay is restricted. */ });
  });
}
filmDialog.addEventListener('close', () => filmPlayer.pause());
fetch('./assets/media/manifest.json')
  .then((response) => response.ok ? response.json() : null)
  .then((manifest) => {
    if (!manifest?.ready || !['film', 'hero', 'mobileHero'].every((field) => /^[a-z0-9-]+\.mp4$/.test(manifest[field]))) return;
    mediaManifest = manifest;
    for (const button of document.querySelectorAll('[data-film]')) button.hidden = false;
    document.querySelector('#film').hidden = false;
    // Let the first content render before loading the lightweight scrolling clip.
    if ('requestIdleCallback' in window) requestIdleCallback(loadHero, { timeout: 2500 });
    else setTimeout(loadHero, 1800);
  })
  .catch(() => { /* The photographic page remains complete if media is unavailable. */ });
