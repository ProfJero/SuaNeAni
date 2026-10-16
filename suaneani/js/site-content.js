// Loads content managed in the admin dashboard (/admin/) from Firestore and
// renders it into the page. The HTML already contains default content, so if
// nothing has been published yet (or Firestore can't be reached) the page
// simply keeps showing what is in the HTML.
//
// Lists use the first item in the HTML as a template. Elements inside it are
// marked with data-f="<field>" and filled in for each published item.
import { db } from './firebase.js';
import {
  collection, query, where, getDocs, doc, getDoc
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// ---------- helpers ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Only allow http(s) and site-relative image/link URLs (never javascript: etc).
function safeUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return '';
  url = url.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (/^[\w./-]+$/.test(url) && !url.startsWith('//')) return url;
  return '';
}

// Ask Cloudinary for a resized, auto-format/quality version of an upload.
export function imageUrl(url, width) {
  url = safeUrl(url);
  if (url && width && url.includes('res.cloudinary.com') && url.includes('/image/upload/') &&
      !/\/image\/upload\/[^/]*(w_|f_auto)/.test(url)) {
    url = url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
  }
  return url;
}

function formatDate(value) {
  if (!value) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function loadList(name) {
  const snap = await getDocs(query(collection(db, name), where('published', '==', true)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);
const byDateDesc = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));

// Template = <template> inside the list, or the list's first element.
function takeTemplate(list) {
  const tpl = $(':scope > template', list);
  const node = tpl ? tpl.content.firstElementChild : list.firstElementChild;
  return node ? node.cloneNode(true) : null;
}

function initials(name) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

// Fill data-f fields in a cloned template node.
function fill(node, values) {
  for (const el of $$('[data-f]', node).concat(node.matches('[data-f]') ? [node] : [])) {
    const key = el.dataset.f;
    if (!(key in values)) continue;
    const value = values[key];
    if (el.tagName === 'IMG') {
      if (value) {
        el.src = value;
        el.alt = values.alt || el.alt;
        el.loading = 'lazy';
      } else if (values.imgFallback) {
        el.replaceWith(values.imgFallback());
      } else {
        el.remove();
      }
    } else if (key === 'link' || key === 'title-link') {
      if (key === 'title-link') el.textContent = values.title || '';
      if (value) el.href = value; else el.removeAttribute('href');
    } else {
      // Keep a nested link (e.g. a title that is also a link) and set its text.
      const innerLink = $('a[data-f="link"]', el);
      if (innerLink) innerLink.textContent = value ?? '';
      else el.textContent = value ?? '';
    }
  }
  return node;
}

function renderList(list, items, toValues) {
  const tpl = takeTemplate(list);
  if (!tpl) return;
  $$(':scope > :not(template)', list).forEach((n) => n.remove());
  for (const item of items) list.appendChild(fill(tpl.cloneNode(true), toValues(item)));
}

function setLines(el, text) {
  el.textContent = '';
  String(text).split(/\r?\n/).forEach((line, i) => {
    if (i) el.appendChild(document.createElement('br'));
    el.appendChild(document.createTextNode(line));
  });
}

function linkLines(container, values, hrefPrefix, cleanHref) {
  const cls = ($('p', container) || {}).className || 'text-sm text-gray-600';
  container.textContent = '';
  for (const value of values) {
    const p = document.createElement('p');
    p.className = cls;
    const a = document.createElement('a');
    a.className = 'hover:text-secondary';
    a.href = hrefPrefix + cleanHref(value);
    a.textContent = value;
    p.appendChild(a);
    container.appendChild(p);
  }
}

// Very small, safe text formatter for news articles:
// blank line = new paragraph, "## " heading, "### " sub-heading,
// "- " bullet list, "> " quote, **bold**.
function renderArticle(container, text) {
  container.textContent = '';
  const inline = (parent, str) => {
    str.split(/(\*\*[^*]+\*\*)/).forEach((part) => {
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        const b = document.createElement('strong');
        b.textContent = part.slice(2, -2);
        parent.appendChild(b);
      } else if (part) {
        parent.appendChild(document.createTextNode(part));
      }
    });
    return parent;
  };
  for (const block of String(text || '').split(/\n\s*\n/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((l) => l.startsWith('- '))) {
      const ul = document.createElement('ul');
      lines.forEach((l) => ul.appendChild(inline(document.createElement('li'), l.slice(2))));
      container.appendChild(ul);
    } else if (lines[0].startsWith('### ')) {
      container.appendChild(inline(document.createElement('h3'), lines.join(' ').slice(4)));
    } else if (lines[0].startsWith('## ')) {
      container.appendChild(inline(document.createElement('h2'), lines.join(' ').slice(3)));
    } else if (lines.every((l) => l.startsWith('> '))) {
      const q = document.createElement('blockquote');
      q.appendChild(inline(document.createElement('p'), lines.map((l) => l.slice(2)).join(' ')));
      container.appendChild(q);
    } else {
      container.appendChild(inline(document.createElement('p'), lines.join(' ')));
    }
  }
}

const articleLink = (item) => 'news-details.html?id=' + encodeURIComponent(item.id);

const newsValues = (width) => (item) => ({
  title: item.title || '',
  date: formatDate(item.date),
  category: item.category || '',
  excerpt: item.excerpt || '',
  img: imageUrl(item.imageUrl, width),
  alt: item.title || '',
  link: articleLink(item),
  'title-link': articleLink(item)
});

// ---------- sections ----------

async function contactDetails() {
  const office = $('[data-content="contact-office"]');
  if (!office) return;
  const snap = await getDoc(doc(db, 'content', 'contact'));
  if (!snap.exists()) return;
  const c = snap.data();
  if (c.office) setLines(office, c.office);
  const hours = $('[data-content="contact-hours"]');
  if (hours && c.hours) setLines(hours, c.hours);
  const phones = (c.phones || []).filter(Boolean);
  const emails = (c.emails || []).filter(Boolean);
  if (phones.length) linkLines($('[data-content="contact-phones"]'), phones, 'tel:', (v) => v.replace(/[^\d+]/g, ''));
  if (emails.length) linkLines($('[data-content="contact-emails"]'), emails, 'mailto:', (v) => v.trim());
}

async function testimonials() {
  const list = $('[data-list="testimonials"]');
  if (!list) return;
  const items = (await loadList('testimonials')).sort(byOrder);
  if (!items.length) return;
  renderList(list, items, (t) => ({
    quote: '“' + (t.quote || '').replace(/^["“]|["”]$/g, '') + '”',
    name: t.name || '',
    role: t.role || '',
    photo: imageUrl(t.photoUrl, 120),
    alt: t.name || '',
    imgFallback: () => {
      const s = document.createElement('div');
      s.className = 'w-12 h-12 rounded-full bg-orange-100 text-orange-600 font-bold flex items-center justify-center shrink-0';
      s.textContent = initials(t.name);
      return s;
    }
  }));
}

async function partners() {
  const list = $('[data-list="partners"]');
  if (!list) return;
  const items = (await loadList('partners')).sort(byOrder);
  if (!items.length) return;
  renderList(list, items, (p) => ({ logo: imageUrl(p.logoUrl, 240), alt: p.name || '', name: p.name || '' }));
  // Make logos clickable when a website is set.
  $$(':scope > *', list).forEach((node, i) => {
    const site = safeUrl(items[i].website);
    const img = $('img', node);
    if (site && /^https?:/i.test(site) && img) {
      const a = document.createElement('a');
      a.href = site;
      a.target = '_blank';
      a.rel = 'noopener';
      img.replaceWith(a);
      a.appendChild(img);
    }
  });
}

async function faqs() {
  const list = $('[data-list="faqs"]');
  if (!list) return;
  const items = (await loadList('faqs')).sort(byOrder);
  if (!items.length) return;
  renderList(list, items, (f) => ({ question: f.question || '', answer: f.answer || '' }));
  list.closest('[data-section="faqs"]').style.display = '';
}

async function impactNumbers() {
  const section = $('[data-section="impact"]');
  if (!section) return;
  const snap = await getDoc(doc(db, 'content', 'impact'));
  if (!snap.exists()) return;
  const data = snap.data();
  const stats = data.stats || [];
  $$('.grid > div', section).forEach((item, i) => {
    const s = stats[i];
    if (!s) return;
    const label = $('p', item);
    if (label && s.label) label.textContent = s.label;
    if (s.value) {
      const v = document.createElement('p');
      v.className = 'text-3xl font-extrabold text-gray-900 mb-1';
      v.textContent = s.value;
      (label || item).before(v);
    }
  });
  if (data.visible) section.style.display = '';
}

async function gallery() {
  const list = $('[data-list="gallery"]');
  if (!list) return;
  const items = (await loadList('gallery')).sort(byOrder);
  if (!items.length) return;

  const PAGE = 8;
  let shown = PAGE;
  let category = 'All';
  const count = $('[data-gallery-count]');
  const more = $('[data-gallery-more]');
  const template = takeTemplate(list);
  const filters = $$('[data-purpose="gallery-filters"] button');
  const activeCls = filters[0] ? filters[0].className : '';
  const idleCls = filters[1] ? filters[1].className : '';

  function draw() {
    const matches = items.filter((g) => category === 'All' || (g.category || '') === category);
    $$(':scope > :not(template)', list).forEach((n) => n.remove());
    matches.slice(0, shown).forEach((g) => {
      const card = fill(template.cloneNode(true), { img: imageUrl(g.imageUrl, 600), alt: g.title || '', title: g.title || '' });
      list.appendChild(card);
    });
    if (count) count.textContent = matches.length
      ? `Showing 1 – ${Math.min(shown, matches.length)} of ${matches.length}`
      : 'No photos in this category yet.';
    if (more) more.style.display = shown < matches.length ? '' : 'none';
  }

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      category = btn.textContent.trim();
      shown = PAGE;
      filters.forEach((b) => { b.className = b === btn ? activeCls : idleCls; });
      draw();
    });
  });
  if (more) more.addEventListener('click', () => { shown += PAGE; draw(); });
  draw();
}

async function newsList() {
  const list = $('[data-list="news"]');
  if (!list) return;
  const items = (await loadList('news')).sort(byDateDesc);
  if (!items.length) return;

  const PAGE = 6;
  const featuredEl = $('[data-news-featured]');
  const pager = $('[data-news-pagination]');
  const template = takeTemplate(list);
  const filterBtns = $$('[data-news-filters] button');
  const activeCls = filterBtns[0] ? filterBtns[0].className : '';
  const idleCls = filterBtns[1] ? filterBtns[1].className : '';
  const featured = items.find((n) => n.featured) || items[0];
  let category = 'All News';
  let search = '';
  let page = 1;

  if (featuredEl) fill(featuredEl, newsValues(1200)(featured));

  function draw() {
    const filtering = category !== 'All News' || search;
    if (featuredEl) featuredEl.style.display = filtering ? 'none' : '';
    const matches = items.filter((n) => {
      if (!filtering && n === featured) return false;
      if (category !== 'All News' && (n.category || '') !== category) return false;
      if (search && !`${n.title} ${n.excerpt}`.toLowerCase().includes(search)) return false;
      return true;
    });
    const pages = Math.max(1, Math.ceil(matches.length / PAGE));
    page = Math.min(page, pages);
    $$(':scope > :not(template)', list).forEach((n) => n.remove());
    matches.slice((page - 1) * PAGE, page * PAGE)
      .forEach((n) => list.appendChild(fill(template.cloneNode(true), newsValues(600)(n))));
    if (!matches.length) {
      const p = document.createElement('p');
      p.className = 'text-gray-500 sm:col-span-2';
      p.textContent = filtering ? 'No news matches your search.' : 'More stories coming soon.';
      list.appendChild(p);
    }
    if (pager) drawPager(pages);
  }

  function drawPager(pages) {
    pager.style.display = pages > 1 ? '' : 'none';
    const btns = $$('button', pager);
    const numCls = btns[2] ? btns[2].className : '';
    const curCls = btns[1] ? btns[1].className : numCls;
    const arrowCls = btns[0] ? btns[0].className : '';
    pager.textContent = '';
    const add = (label, target, cls, disabled) => {
      const b = document.createElement('button');
      b.className = cls;
      b.innerHTML = label;
      b.disabled = disabled;
      b.addEventListener('click', () => { page = target; draw(); list.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      pager.appendChild(b);
    };
    add('<i class="fas fa-chevron-left text-sm"></i>', page - 1, arrowCls, page === 1);
    for (let i = 1; i <= pages; i++) add(String(i), i, i === page ? curCls : numCls, false);
    add('<i class="fas fa-chevron-right text-sm"></i>', page + 1, arrowCls, page === pages);
  }

  filterBtns.forEach((btn) => btn.addEventListener('click', () => {
    category = btn.textContent.trim();
    page = 1;
    filterBtns.forEach((b) => { b.className = b === btn ? activeCls : idleCls; });
    draw();
  }));
  $$('[data-news-search]').forEach((input) => {
    input.addEventListener('input', () => { search = input.value.trim().toLowerCase(); page = 1; draw(); });
  });
  draw();

  const ann = $('[data-list="announcements"]');
  if (ann) {
    const latest = items.filter((n) => n.category === 'Announcements').slice(0, 3);
    if (latest.length) renderList(ann, latest, newsValues(160));
    else ann.parentElement.style.display = 'none';
  }
}

async function newsArticle() {
  const body = $('[data-news="body"]');
  if (!body) return;
  const id = new URLSearchParams(location.search).get('id');
  let others = [];
  try {
    others = (await loadList('news')).sort(byDateDesc);
  } catch (e) { /* sidebar lists keep their defaults */ }

  if (id) {
    let article = null;
    try {
      const snap = await getDoc(doc(db, 'news', id));
      if (snap.exists()) article = { id: snap.id, ...snap.data() };
    } catch (e) { /* unpublished or missing: handled below */ }
    const set = (key, value) => { const el = $(`[data-news="${key}"]`); if (el) el.textContent = value; };
    if (!article) {
      set('title', 'Article not found');
      set('category', 'News');
      body.textContent = '';
      const p = document.createElement('p');
      p.innerHTML = 'This article is no longer available. <a href="news.html" class="text-brand-green font-semibold">See all news</a>.';
      body.appendChild(p);
      ['date', 'readtime', 'image', 'tags'].forEach((k) => { const el = $(`[data-news="${k}"]`); if (el) el.style.display = 'none'; });
    } else {
      document.title = `${article.title} - SuaNeAni`;
      set('title', article.title || '');
      set('category', article.category || 'News');
      set('date', formatDate(article.date));
      const words = String(article.body || '').split(/\s+/).filter(Boolean).length;
      set('readtime', `${Math.max(1, Math.round(words / 200))} min read`);
      const img = $('[data-news="image"]');
      const src = imageUrl(article.imageUrl, 1200);
      if (img) { if (src) { img.src = src; img.alt = article.title || ''; } else img.closest('div').style.display = 'none'; }
      renderArticle(body, article.body);
      const tags = $('[data-news="tags"]');
      if (tags) tags.style.display = 'none';
    }
    others = others.filter((n) => n.id !== id);
  }

  if (others.length) {
    const recent = $('[data-list="recent"]');
    if (recent) renderList(recent, others.slice(0, 3), newsValues(160));
    const related = $('[data-list="related"]');
    if (related) renderList(related, others.slice(0, 3), newsValues(600));
  }
}

// ---------- run ----------

for (const section of [contactDetails, testimonials, partners, faqs, impactNumbers, gallery, newsList, newsArticle]) {
  section().catch((err) => console.warn('SuaNeAni content: ' + section.name + ' kept default content.', err));
}
