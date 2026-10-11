import { property } from './property.js';

for (const element of document.querySelectorAll('[data-field]')) {
  element.textContent = property[element.dataset.field] ?? '';
}

document.title = `${property.name} | ${property.city}`;
document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('#demo-banner').hidden = !property.isDemo;
document.querySelector('#footer-disclaimer').hidden = !property.isDemo;

const highlights = document.querySelector('#highlights');
for (const item of property.highlights) {
  const article = document.createElement('article');
  const number = document.createElement('span');
  const heading = document.createElement('h3');
  const text = document.createElement('p');
  number.className = 'highlight-number';
  number.textContent = item.number;
  heading.textContent = item.title;
  text.textContent = item.text;
  article.append(number, heading, text);
  highlights.append(article);
}

const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#nav-links');
menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!expanded));
  menu.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  nav.classList.toggle('open', !expanded);
});
nav.addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('open');
  }
});

const form = document.querySelector('#inquiry-form');
const note = document.querySelector('#form-note');
if (!property.agentEmail) {
  form.querySelector('button').disabled = true;
  note.textContent = 'Inquiries open when verified contact details are added.';
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity() || !property.agentEmail) return;
  const data = new FormData(form);
  const subject = `Inquiry about ${property.name}`;
  const body = `${data.get('message')}\n\nFrom: ${data.get('name')}\nEmail: ${data.get('email')}`;
  window.location.href = `mailto:${encodeURIComponent(property.agentEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
