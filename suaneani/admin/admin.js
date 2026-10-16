// SuaNeAni admin dashboard: form inbox + editing of website content.
import { app, db, cloudinaryConfig, usingEmulator } from '../js/firebase.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, connectAuthEmulator
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy,
  serverTimestamp, writeBatch
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const auth = getAuth(app);
if (usingEmulator) connectAuthEmulator(auth, `http://${location.hostname}:9099`, { disableWarnings: true });

// ---------------------------------------------------------------- helpers

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// h('div.class1.class2', { attr: value, onclick: fn }, child, 'text', ...)
// (A dot followed by a digit stays part of the class, e.g. "py-2.5".)
function h(spec, props, ...children) {
  const [tag, ...classes] = spec.split(/\.(?!\d)/);
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    children.unshift(props);
    props = null;
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const icon = (name) => h('i', { class: `fas fa-${name}` });

let toastTimer;
function toast(message, isError) {
  const t = $('#toast');
  t.textContent = message;
  t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] text-white text-sm rounded-full px-5 py-3 shadow-lg ' + (isError ? 'bg-red-600' : 'bg-gray-900');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}

function friendlyError(err) {
  const code = err && err.code || '';
  if (code.includes('permission-denied')) return 'You do not have permission to do that.';
  if (code.includes('unavailable')) return 'Cannot reach the server. Check your internet connection.';
  return (err && err.message) || 'Something went wrong.';
}

// Image URLs saved from the website HTML are relative to the site root.
function previewUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    return url.includes('res.cloudinary.com') && url.includes('/image/upload/')
      ? url.replace('/image/upload/', '/image/upload/f_auto,q_auto,c_limit,w_300/') : url;
  }
  return '../' + url.replace(/^\/+/, '');
}

function formatDate(value) {
  if (!value) return '';
  const d = value.toDate ? value.toDate() : new Date(value);
  return isNaN(d) ? '' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const today = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------- dialog

const dialog = $('#dialog');
function openDialog(title, content) {
  $('#dialog-title').textContent = title;
  const body = $('#dialog-body');
  body.textContent = '';
  body.appendChild(content);
  dialog.hidden = false;
  document.body.style.overflow = 'hidden';
  const first = $('input:not([type=hidden]):not([type=file]), textarea, select', body);
  if (first) first.focus();
}
function closeDialog() {
  dialog.hidden = true;
  document.body.style.overflow = '';
}
dialog.addEventListener('click', (e) => {
  if (e.target === dialog || e.target.closest('[data-dialog-close]')) closeDialog();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dialog.hidden) closeDialog(); });

function confirmDialog(title, message, actionLabel = 'Delete') {
  return new Promise((resolve) => {
    const done = (v) => { closeDialog(); resolve(v); };
    openDialog(title, h('div',
      h('p.text-gray-600.mb-6', message),
      h('div.flex.justify-end.gap-3',
        h('button.rounded-full.border.border-gray-300.px-5.py-2.text-sm.font-semibold', { type: 'button', onclick: () => done(false) }, 'Cancel'),
        h('button.rounded-full.bg-red-600.hover:bg-red-700.text-white.px-5.py-2.text-sm.font-semibold', { type: 'button', onclick: () => done(true) }, actionLabel))));
  });
}

// ---------------------------------------------------------------- Cloudinary

async function uploadToCloudinary(file) {
  const { cloudName, uploadPreset } = cloudinaryConfig;
  if (!cloudName || !uploadPreset) {
    throw new Error('Image uploads are not set up yet. Add your Cloudinary cloud name and unsigned upload preset in js/firebase.js, or paste an image URL instead.');
  }
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  form.append('folder', 'suaneani');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) throw new Error((data.error && data.error.message) || 'Upload failed.');
  return data.secure_url;
}

// ---------------------------------------------------------------- form builder

const inputCls = 'w-full rounded-xl border-gray-200 focus:border-[#1a5f4a] focus:ring-[#1a5f4a] text-sm';

function fieldControl(field, value) {
  const id = 'f-' + field.key;
  if (field.type === 'checkbox') {
    return h('label.flex.items-center.gap-3.text-sm.font-semibold.cursor-pointer',
      h('input.rounded.text-[#1a5f4a].focus:ring-[#1a5f4a]', { type: 'checkbox', name: field.key, id, checked: !!value }),
      field.label,
      field.help ? h('span.font-normal.text-gray-500', '– ' + field.help) : null);
  }
  let control;
  if (field.type === 'textarea') {
    control = h('textarea', { class: inputCls, name: field.key, id, rows: field.rows || 4, maxlength: field.max || null });
    control.value = value ?? '';
  } else if (field.type === 'select') {
    control = h('select', { class: inputCls, name: field.key, id },
      h('option', { value: '' }, '— Choose —'),
      field.options.map((o) => h('option', { value: o, selected: o === value }, o)));
  } else if (field.type === 'image') {
    control = imageControl(field, value);
  } else {
    control = h('input', { class: inputCls, name: field.key, id, type: field.type || 'text', maxlength: field.max || null });
    control.value = value ?? '';
  }
  return h('div',
    h('label.block.text-sm.font-semibold.mb-1', { for: id }, field.label, field.required ? h('span.text-red-500', ' *') : null),
    control,
    field.help ? h('p.text-xs.text-gray-500.mt-1', field.help) : null);
}

function imageControl(field, value) {
  const urlInput = h('input', { class: inputCls, name: field.key, id: 'f-' + field.key, type: 'text', placeholder: 'https://… or upload an image' });
  urlInput.value = value || '';
  const img = h('img.w-24.h-24.object-cover.rounded-xl.border.border-gray-100.bg-gray-50', { alt: '' });
  const refresh = () => { img.src = previewUrl(urlInput.value.trim()); img.hidden = !urlInput.value.trim(); };
  urlInput.addEventListener('input', refresh);
  const fileInput = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const status = h('span.text-xs.text-gray-500');
  const uploadBtn = h('button.rounded-full.border.border-gray-300.px-4.py-2.text-sm.font-semibold.hover:bg-gray-50', { type: 'button', onclick: () => fileInput.click() },
    icon('upload'), ' Upload image');
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    uploadBtn.disabled = true;
    status.textContent = 'Uploading…';
    try {
      urlInput.value = await uploadToCloudinary(file);
      refresh();
      status.textContent = 'Uploaded.';
    } catch (err) {
      status.textContent = '';
      toast(err.message, true);
    } finally {
      uploadBtn.disabled = false;
      fileInput.value = '';
    }
  });
  refresh();
  return h('div.flex.gap-4.items-start', img,
    h('div.flex-1.space-y-2', urlInput, h('div.flex.items-center.gap-3', uploadBtn, status), fileInput));
}

function readForm(form, fields) {
  const data = {};
  for (const f of fields) {
    const el = form.elements[f.key];
    if (!el) continue;
    if (f.type === 'checkbox') data[f.key] = el.checked;
    else if (f.type === 'number') data[f.key] = el.value === '' ? null : Number(el.value);
    else data[f.key] = el.value.trim();
  }
  return data;
}

function validate(data, fields) {
  for (const f of fields) {
    if (f.required && (data[f.key] === '' || data[f.key] === null || data[f.key] === undefined)) return `${f.label} is required.`;
    if (f.type === 'url' && data[f.key] && !/^https?:\/\//i.test(data[f.key])) return `${f.label} must start with http:// or https://`;
  }
  return '';
}

function editForm(fields, values, onSave) {
  const message = h('p.text-sm.text-red-600', { role: 'alert', hidden: true });
  const save = h('button.rounded-full.bg-[#1a5f4a].hover:bg-[#134d3b].text-white.px-6.py-2.5.text-sm.font-semibold.disabled:opacity-60', { type: 'submit' }, 'Save');
  const form = h('form.space-y-5', { novalidate: true },
    fields.map((f) => fieldControl(f, values[f.key])),
    message,
    h('div.flex.justify-end.gap-3.pt-2',
      h('button.rounded-full.border.border-gray-300.px-6.py-2.5.text-sm.font-semibold', { type: 'button', 'data-dialog-close': true }, 'Cancel'),
      save));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    message.hidden = true;
    const data = readForm(form, fields);
    const problem = validate(data, fields);
    if (problem) { message.textContent = problem; message.hidden = false; return; }
    save.disabled = true;
    try {
      await onSave(data);
      closeDialog();
    } catch (err) {
      message.textContent = friendlyError(err);
      message.hidden = false;
    } finally {
      save.disabled = false;
    }
  });
  return form;
}

// ---------------------------------------------------------------- reading defaults from the website

async function fetchPage(name) {
  const res = await fetch('../' + name, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Could not load ' + name);
  return new DOMParser().parseFromString(await res.text(), 'text/html');
}

// Lists on the website mark fields only in their first item; the other items
// have the same structure, so fields are found by their position.
function readListItems(list) {
  const items = Array.from(list.children).filter((c) => c.tagName !== 'TEMPLATE');
  if (!items.length) return [];
  const paths = $$('[data-f]', items[0]).map((el) => {
    const path = [];
    for (let n = el; n !== items[0]; n = n.parentElement) path.unshift(Array.prototype.indexOf.call(n.parentElement.children, n));
    return { key: el.dataset.f, path };
  });
  return items.map((item) => {
    const out = {};
    for (const { key, path } of paths) {
      let n = item;
      for (const i of path) n = n && n.children[i];
      if (!n) continue;
      if (n.tagName === 'IMG') out[key] = n.getAttribute('src') || '';
      else out[key] = n.textContent.trim().replace(/\s+/g, ' ');
    }
    return out;
  });
}

// ---------------------------------------------------------------- content list sections

const NEWS_CATEGORIES = ['Announcements', 'Programs', 'Community', 'Partnerships', 'Events', 'Media'];
const GALLERY_CATEGORIES = ['Learning in Action', 'Community', 'Environment', 'Events', 'Special Moments'];
const orderField = { key: 'order', label: 'Display order', type: 'number', help: 'Lower numbers appear first.' };
const publishedField = { key: 'published', label: 'Published', type: 'checkbox', help: 'show on the website' };

const LISTS = {
  news: {
    title: 'News',
    icon: 'newspaper',
    intro: 'Stories on the News page. The newest article (or the one marked Featured) is shown at the top. The News page is currently hidden from the menu; uncomment it in header.html when you are ready.',
    sort: (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
    fields: [
      { key: 'title', label: 'Title', required: true, max: 200 },
      { key: 'category', label: 'Category', type: 'select', options: NEWS_CATEGORIES, required: true, help: 'Announcements also appear in the "Latest Announcements" box.' },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'excerpt', label: 'Short summary', type: 'textarea', rows: 2, max: 400, help: 'Shown on the news list.' },
      { key: 'body', label: 'Article', type: 'textarea', rows: 12, max: 50000,
        help: 'Leave a blank line between paragraphs. Formatting: "## " heading, "### " sub-heading, "- " bullet, "> " quote, **bold**.' },
      { key: 'imageUrl', label: 'Image', type: 'image' },
      { key: 'featured', label: 'Featured', type: 'checkbox', help: 'show at the top of the News page' },
      publishedField
    ],
    newItem: () => ({ date: today(), published: true }),
    summary: (n) => [n.category, n.date].filter(Boolean).join(' · '),
    label: (n) => n.title,
    image: (n) => n.imageUrl
  },
  gallery: {
    title: 'Gallery',
    icon: 'images',
    intro: 'Photos on the Gallery page. Categories match the filter buttons on the page. The Gallery is currently hidden from the menu; uncomment it in header.html when you are ready.',
    sort: (a, b) => (a.order ?? 999) - (b.order ?? 999),
    fields: [
      { key: 'title', label: 'Caption', required: true, max: 120 },
      { key: 'category', label: 'Category', type: 'select', options: GALLERY_CATEGORIES },
      { key: 'imageUrl', label: 'Photo', type: 'image', required: true },
      orderField,
      publishedField
    ],
    newItem: () => ({ published: true }),
    summary: (g) => g.category || 'No category',
    label: (g) => g.title,
    image: (g) => g.imageUrl,
    importFrom: async () => {
      const page = await fetchPage('gallery.html');
      return readListItems($('[data-list="gallery"]', page)).map((g, i) => ({ title: g.title, imageUrl: g.img, category: '', order: i + 1, published: true }));
    }
  },
  testimonials: {
    title: 'Testimonials',
    icon: 'quote-left',
    intro: 'Quotes in the "Voices of Our Community" section on the home page.',
    sort: (a, b) => (a.order ?? 999) - (b.order ?? 999),
    fields: [
      { key: 'quote', label: 'Quote', type: 'textarea', rows: 3, required: true, max: 600 },
      { key: 'name', label: 'Name', required: true, max: 100 },
      { key: 'role', label: 'Role', max: 100, help: 'e.g. Teacher, North Legon' },
      { key: 'photoUrl', label: 'Photo', type: 'image', help: 'Optional. Without a photo, the person\'s initials are shown.' },
      orderField,
      publishedField
    ],
    newItem: () => ({ published: true }),
    summary: (t) => t.role || '',
    label: (t) => `${t.name}: “${(t.quote || '').slice(0, 80)}${(t.quote || '').length > 80 ? '…' : ''}”`,
    image: (t) => t.photoUrl,
    importFrom: async () => {
      const page = await fetchPage('index.html');
      return readListItems($('[data-list="testimonials"]', page)).map((t, i) => ({
        quote: (t.quote || '').replace(/^[“"]|[”"]$/g, ''), name: t.name, role: t.role, photoUrl: t.photo, order: i + 1, published: true
      }));
    }
  },
  partners: {
    title: 'Partner logos',
    icon: 'handshake',
    intro: 'Logos in the "Our Partners" section on the About page.',
    sort: (a, b) => (a.order ?? 999) - (b.order ?? 999),
    fields: [
      { key: 'name', label: 'Name', required: true, max: 100 },
      { key: 'logoUrl', label: 'Logo', type: 'image' },
      { key: 'website', label: 'Website', type: 'url', help: 'Optional. Makes the logo clickable.' },
      orderField,
      publishedField
    ],
    newItem: () => ({ published: true }),
    summary: (p) => p.website || '',
    label: (p) => p.name,
    image: (p) => p.logoUrl,
    importFrom: async () => {
      const page = await fetchPage('about.html');
      return readListItems($('[data-list="partners"]', page)).map((p, i) => ({
        name: p.name, logoUrl: /placeholder\.com/.test(p.logo || '') ? '' : p.logo, website: '', order: i + 1, published: true
      }));
    }
  },
  faqs: {
    title: 'FAQs',
    icon: 'question-circle',
    intro: 'Frequently asked questions. The FAQ section on the Contact page appears automatically once at least one FAQ is published.',
    sort: (a, b) => (a.order ?? 999) - (b.order ?? 999),
    fields: [
      { key: 'question', label: 'Question', required: true, max: 300 },
      { key: 'answer', label: 'Answer', type: 'textarea', rows: 5, required: true, max: 3000 },
      orderField,
      publishedField
    ],
    newItem: () => ({ published: true }),
    summary: (f) => (f.answer || '').slice(0, 100),
    label: (f) => f.question,
    importFrom: async () => [
      'Can we access the learning journey everywhere?',
      'Will learners be provided with the digital tools?',
      'When will all the subjects be available in the system?',
      'How much will it cost to use it?',
      'Is there an audio option to the content?',
      'Can we redo the quizzes?',
      'Can we use smart phones to access the learning journey?'
    ].map((question, i) => ({ question, answer: '', order: i + 1, published: false })),
    importLabel: 'Add the 7 FAQ questions from the brief as drafts'
  }
};

function renderListSection(name) {
  const cfg = LISTS[name];
  const main = $('#main');
  const listEl = h('div.space-y-3', h('p.text-gray-500.text-sm', icon('circle-notch fa-spin'), ' Loading…'));
  const addBtn = h('button.rounded-full.bg-[#1a5f4a].hover:bg-[#134d3b].text-white.px-5.py-2.5.text-sm.font-semibold', { type: 'button' }, icon('plus'), ' Add');
  main.replaceChildren(
    h('div.flex.flex-wrap.items-start.justify-between.gap-4.mb-2',
      h('h1.text-2xl.font-extrabold', cfg.title), addBtn),
    h('p.text-sm.text-gray-500.mb-6.max-w-3xl', cfg.intro),
    listEl);

  const col = collection(db, name);
  addBtn.addEventListener('click', () => openDialog('Add to ' + cfg.title, editForm(cfg.fields, cfg.newItem(), async (data) => {
    await addDoc(col, { ...data, updatedAt: serverTimestamp() });
    toast('Saved.');
  })));

  const unsubscribe = onSnapshot(col, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(cfg.sort);
    listEl.replaceChildren();
    if (!items.length) {
      listEl.appendChild(h('div.bg-white.rounded-2xl.border.border-dashed.border-gray-300.p-8.text-center',
        h('p.text-gray-600.mb-1', 'Nothing here yet.'),
        cfg.importFrom
          ? h('div',
              h('p.text-sm.text-gray-500.mb-4', cfg.importLabel ? '' : 'The website is showing its built-in items. Import them first so you can edit them. Once anything is published here, it replaces the built-in items.'),
              h('button.rounded-full.border.border-[#1a5f4a].text-[#1a5f4a].px-5.py-2.text-sm.font-semibold.hover:bg-[#1a5f4a].hover:text-white', {
                type: 'button',
                onclick: async (e) => {
                  e.target.disabled = true;
                  try {
                    const rows = await cfg.importFrom();
                    const batch = writeBatch(db);
                    rows.forEach((r) => batch.set(doc(col), { ...r, updatedAt: serverTimestamp() }));
                    await batch.commit();
                    toast(`Imported ${rows.length} items.`);
                  } catch (err) {
                    e.target.disabled = false;
                    toast(friendlyError(err), true);
                  }
                }
              }, icon('file-import'), ' ', cfg.importLabel || 'Import current website items'))
          : h('p.text-sm.text-gray-500', 'Use “Add” to create the first one.')));
      return;
    }
    for (const item of items) listEl.appendChild(listRow(cfg, col, item));
  }, (err) => {
    listEl.replaceChildren(h('p.text-red-600.text-sm', friendlyError(err)));
  });
  return unsubscribe;
}

function listRow(cfg, col, item) {
  const img = cfg.image ? previewUrl(cfg.image(item)) : '';
  const ref = doc(col, item.id);
  return h('div.bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.flex.flex-wrap.items-center.gap-x-4.gap-y-2',
    cfg.image
      ? (img ? h('img.w-16.h-16.rounded-xl.object-cover.bg-gray-50.shrink-0', { src: img, alt: '' })
             : h('div.w-16.h-16.rounded-xl.bg-gray-100.text-gray-400.flex.items-center.justify-center.shrink-0', icon('image')))
      : null,
    h('div.flex-1.min-w-[10rem]',
      h('p.font-semibold.truncate', cfg.label(item) || '(untitled)'),
      h('p.text-xs.text-gray-500.truncate', cfg.summary(item))),
    h('span', { class: 'text-xs font-semibold rounded-full px-3 py-1 shrink-0 ' + (item.published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500') },
      item.published ? 'Published' : 'Draft'),
    h('div.flex.gap-1.shrink-0.ml-auto',
      h('button.w-9.h-9.rounded-full.hover:bg-gray-100.text-gray-600', {
        type: 'button', title: item.published ? 'Unpublish' : 'Publish', 'aria-label': item.published ? 'Unpublish' : 'Publish',
        onclick: () => updateDoc(ref, { published: !item.published, updatedAt: serverTimestamp() }).catch((e) => toast(friendlyError(e), true))
      }, icon(item.published ? 'eye-slash' : 'eye')),
      h('button.w-9.h-9.rounded-full.hover:bg-gray-100.text-gray-600', {
        type: 'button', title: 'Edit', 'aria-label': 'Edit',
        onclick: () => openDialog('Edit', editForm(cfg.fields, item, async (data) => {
          await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
          toast('Saved.');
        }))
      }, icon('pen')),
      h('button.w-9.h-9.rounded-full.hover:bg-red-50.text-red-500', {
        type: 'button', title: 'Delete', 'aria-label': 'Delete',
        onclick: async () => {
          if (!(await confirmDialog('Delete this item?', `“${cfg.label(item) || 'This item'}” will be removed from the website. This cannot be undone.`))) return;
          deleteDoc(ref).then(() => toast('Deleted.')).catch((e) => toast(friendlyError(e), true));
        }
      }, icon('trash'))));
}

// ---------------------------------------------------------------- single-document sections

async function renderContactSection() {
  const main = $('#main');
  main.replaceChildren(h('h1.text-2xl.font-extrabold.mb-2', 'Contact details'),
    h('p.text-sm.text-gray-500.mb-6', 'Shown under “Our Contact Details” on the Contact page.'),
    h('p.text-gray-500.text-sm', icon('circle-notch fa-spin'), ' Loading…'));
  const ref = doc(db, 'content', 'contact');
  let values;
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const c = snap.data();
    values = { office: c.office || '', phones: (c.phones || []).join('\n'), emails: (c.emails || []).join('\n'), hours: c.hours || '' };
  } else {
    // Start from what the Contact page shows today.
    const page = await fetchPage('contact.html');
    const lines = (el) => el ? el.innerHTML.split(/<br\s*\/?>/i).map((s) => new DOMParser().parseFromString(s, 'text/html').body.textContent.trim()).filter(Boolean).join('\n') : '';
    values = {
      office: lines($('[data-content="contact-office"]', page)),
      phones: $$('[data-content="contact-phones"] p', page).map((p) => p.textContent.trim()).join('\n'),
      emails: $$('[data-content="contact-emails"] p', page).map((p) => p.textContent.trim()).join('\n'),
      hours: lines($('[data-content="contact-hours"]', page))
    };
  }
  const fields = [
    { key: 'office', label: 'Office address', type: 'textarea', rows: 3, required: true, help: 'One line per row.' },
    { key: 'phones', label: 'Phone numbers', type: 'textarea', rows: 3, help: 'One number per row.' },
    { key: 'emails', label: 'Email addresses', type: 'textarea', rows: 3, help: 'One address per row.' },
    { key: 'hours', label: 'Office hours', type: 'textarea', rows: 2, help: 'One line per row.' }
  ];
  const form = editForm(fields, values, async (data) => {
    const rows = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
    const emails = rows(data.emails);
    const bad = emails.find((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (bad) throw new Error(`“${bad}” is not a valid email address.`);
    await setDoc(ref, { office: data.office, phones: rows(data.phones), emails, hours: data.hours, updatedAt: serverTimestamp() });
    toast('Contact details saved.');
  });
  $('[data-dialog-close]', form).remove();
  main.replaceChildren(main.children[0], main.children[1], h('div.bg-white.rounded-3xl.border.border-gray-100.shadow-sm.p-6.max-w-2xl', form));
}

async function renderImpactSection() {
  const main = $('#main');
  main.replaceChildren(h('h1.text-2xl.font-extrabold.mb-2', 'Impact numbers'),
    h('p.text-sm.text-gray-500.mb-6.max-w-3xl', '“Our impact by the numbers” on the Impact page. The section stays hidden until you tick “Show this section”.'),
    h('p.text-gray-500.text-sm', icon('circle-notch fa-spin'), ' Loading…'));
  const ref = doc(db, 'content', 'impact');
  const snap = await getDoc(ref);
  let stats = snap.exists() ? (snap.data().stats || []) : [];
  const visible = snap.exists() && !!snap.data().visible;
  if (!stats.length) {
    const page = await fetchPage('impact.html');
    stats = $$('[data-section="impact"] .grid > div p', page).map((p) => ({ label: p.textContent.trim(), value: '' }));
  }
  const fields = [{ key: 'visible', label: 'Show this section', type: 'checkbox', help: 'on the Impact page' }];
  const values = { visible };
  stats.forEach((s, i) => {
    fields.push({ key: `label${i}`, label: `Item ${i + 1} – label`, max: 60 });
    fields.push({ key: `value${i}`, label: `Item ${i + 1} – number`, max: 20, help: 'e.g. 1,200 or 15+' });
    values[`label${i}`] = s.label;
    values[`value${i}`] = s.value;
  });
  const form = editForm(fields, values, async (data) => {
    await setDoc(ref, {
      visible: data.visible,
      stats: stats.map((_, i) => ({ label: data[`label${i}`], value: data[`value${i}`] })),
      updatedAt: serverTimestamp()
    });
    toast('Impact numbers saved.');
  });
  $('[data-dialog-close]', form).remove();
  // Lay out label/number pairs side by side.
  const blocks = Array.from(form.children);
  const grid = h('div.grid.sm:grid-cols-2.gap-4');
  blocks.slice(1, 1 + stats.length * 2).forEach((b) => grid.appendChild(b));
  blocks[0].after(grid);
  main.replaceChildren(main.children[0], main.children[1], h('div.bg-white.rounded-3xl.border.border-gray-100.shadow-sm.p-6.max-w-2xl', form));
}

// ---------------------------------------------------------------- inbox

const STATUS_STYLE = { new: 'bg-amber-100 text-amber-800', read: 'bg-gray-100 text-gray-600', archived: 'bg-slate-100 text-slate-500' };
let inboxState = { status: 'active', search: '' };

function renderInbox() {
  const main = $('#main');
  const listEl = h('div.space-y-2', h('p.text-gray-500.text-sm', icon('circle-notch fa-spin'), ' Loading…'));
  const search = h('input', { class: inputCls + ' sm:w-64', type: 'search', placeholder: 'Search name, email, message…', value: inboxState.search });
  const statusSel = h('select', { class: inputCls + ' sm:w-48' },
    [['active', 'New & read'], ['new', 'New only'], ['archived', 'Archived'], ['all', 'All']].map(([v, l]) => h('option', { value: v, selected: v === inboxState.status }, l)));
  const exportBtn = h('button.rounded-full.border.border-gray-300.px-4.py-2.text-sm.font-semibold.hover:bg-gray-50', { type: 'button' }, icon('download'), ' Export CSV');
  main.replaceChildren(
    h('div.flex.flex-wrap.items-center.justify-between.gap-4.mb-6',
      h('div', h('h1.text-2xl.font-extrabold', 'Inbox'), h('p.text-sm.text-gray-500', 'Messages from the Contact page and the partner enquiry forms.')),
      exportBtn),
    h('div.flex.flex-col.sm:flex-row.gap-3.mb-4', search, statusSel),
    listEl);

  let all = [];
  const draw = () => {
    const q = inboxState.search.toLowerCase();
    const rows = all.filter((s) => {
      const st = s.status || 'new';
      if (inboxState.status === 'active' && st === 'archived') return false;
      if (inboxState.status !== 'active' && inboxState.status !== 'all' && st !== inboxState.status) return false;
      return !q || [s.name, s.email, s.institution, s.message, s.topic, s.subject].some((v) => (v || '').toLowerCase().includes(q));
    });
    listEl.replaceChildren();
    if (!rows.length) {
      listEl.appendChild(h('div.bg-white.rounded-2xl.border.border-dashed.border-gray-300.p-8.text-center.text-gray-500', all.length ? 'No messages match.' : 'No messages yet.'));
      return;
    }
    for (const s of rows) listEl.appendChild(inboxRow(s));
  };
  search.addEventListener('input', () => { inboxState.search = search.value.trim(); draw(); });
  statusSel.addEventListener('change', () => { inboxState.status = statusSel.value; draw(); });
  exportBtn.addEventListener('click', () => exportCsv(all));

  return onSnapshot(query(collection(db, 'submissions'), orderBy('createdAt', 'desc')), (snap) => {
    all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    draw();
  }, (err) => listEl.replaceChildren(h('p.text-red-600.text-sm', friendlyError(err))));
}

function submissionKind(s) {
  return s.type === 'partner' ? (s.topic || 'Partner enquiry') : ('Contact form' + (s.subject ? ' · ' + s.subject : ''));
}

function inboxRow(s) {
  const status = s.status || 'new';
  return h('button.w-full.text-left.bg-white.rounded-2xl.border.border-gray-100.shadow-sm.p-4.hover:border-[#1a5f4a]/40.transition-colors.flex.gap-4.items-start', {
    type: 'button', onclick: () => openSubmission(s)
  },
    h('span', { class: 'mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ' + (status === 'new' ? 'bg-amber-400' : 'bg-transparent') }),
    h('div.flex-1.min-w-0',
      h('div.flex.flex-wrap.items-center.gap-x-3.gap-y-1',
        h('p', { class: 'truncate ' + (status === 'new' ? 'font-bold' : 'font-semibold') }, s.name || '(no name)'),
        h('span.text-xs.text-gray-500.truncate', s.institution || s.email || '')),
      h('p.text-xs.text-[#1a5f4a].font-semibold.mt-0.5', submissionKind(s)),
      h('p.text-sm.text-gray-600.truncate.mt-1', s.message || '')),
    h('div.text-right.shrink-0',
      h('p.text-xs.text-gray-400.whitespace-nowrap', formatDate(s.createdAt)),
      h('span', { class: 'inline-block mt-2 text-[11px] font-semibold rounded-full px-2.5 py-0.5 ' + STATUS_STYLE[status] }, status)));
}

function openSubmission(s) {
  const ref = doc(db, 'submissions', s.id);
  if ((s.status || 'new') === 'new') updateDoc(ref, { status: 'read' }).catch(() => {});
  const row = (label, value) => value ? h('div.grid.grid-cols-3.gap-3.py-2.border-b.border-gray-50',
    h('dt.text-sm.text-gray-500', label), h('dd.col-span-2.text-sm.break-words', value)) : null;
  const subject = encodeURIComponent('Re: ' + (s.topic || s.subject || 'Your message to SuaNeAni'));
  const archived = s.status === 'archived';
  openDialog(submissionKind(s), h('div',
    h('dl.mb-4',
      row('Received', formatDate(s.createdAt)),
      row('Name', s.name),
      row('Email', s.email),
      row('Institution', s.institution),
      row('Form', s.type === 'partner' ? 'Partner enquiry' : 'Contact form'),
      row('Subject', s.subject || s.topic),
      row('Page', s.page)),
    h('p.text-sm.text-gray-500.mb-1', 'Message'),
    h('div.bg-gray-50.rounded-2xl.p-4.text-sm.whitespace-pre-wrap.break-words.mb-6', s.message || ''),
    h('div.flex.flex-wrap.justify-between.gap-3',
      h('button.rounded-full.text-red-600.hover:bg-red-50.px-4.py-2.text-sm.font-semibold', {
        type: 'button',
        onclick: async () => {
          if (!(await confirmDialog('Delete this message?', 'The message will be permanently deleted.'))) return;
          deleteDoc(ref).then(() => toast('Message deleted.')).catch((e) => toast(friendlyError(e), true));
        }
      }, icon('trash'), ' Delete'),
      h('div.flex.flex-wrap.gap-3',
        h('button.rounded-full.border.border-gray-300.px-4.py-2.text-sm.font-semibold.hover:bg-gray-50', {
          type: 'button',
          onclick: () => updateDoc(ref, { status: archived ? 'read' : 'archived' })
            .then(() => { closeDialog(); toast(archived ? 'Moved back to inbox.' : 'Archived.'); })
            .catch((e) => toast(friendlyError(e), true))
        }, icon(archived ? 'inbox' : 'archive'), archived ? ' Move to inbox' : ' Archive'),
        h('button.rounded-full.border.border-gray-300.px-4.py-2.text-sm.font-semibold.hover:bg-gray-50', {
          type: 'button',
          onclick: () => updateDoc(ref, { status: 'new' }).then(() => { closeDialog(); toast('Marked as unread.'); }).catch((e) => toast(friendlyError(e), true))
        }, icon('envelope'), ' Mark unread'),
        s.email ? h('a.rounded-full.bg-[#1a5f4a].hover:bg-[#134d3b].text-white.px-5.py-2.text-sm.font-semibold', { href: `mailto:${s.email}?subject=${subject}` }, icon('reply'), ' Reply') : null))));
}

function exportCsv(rows) {
  const cols = ['createdAt', 'status', 'type', 'topic', 'subject', 'name', 'email', 'institution', 'message', 'page'];
  const cell = (v) => {
    let s = v && v.toDate ? v.toDate().toISOString() : String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = [cols.join(',')].concat(rows.map((r) => cols.map((c) => cell(r[c])).join(','))).join('\r\n');
  const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })), download: `suaneani-messages-${today()}.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------------------------------------------------------------- navigation

const SECTIONS = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox', render: renderInbox },
  { group: 'Website content' },
  { id: 'news', label: 'News', icon: LISTS.news.icon, render: () => renderListSection('news') },
  { id: 'gallery', label: 'Gallery', icon: LISTS.gallery.icon, render: () => renderListSection('gallery') },
  { id: 'testimonials', label: 'Testimonials', icon: LISTS.testimonials.icon, render: () => renderListSection('testimonials') },
  { id: 'partners', label: 'Partner logos', icon: LISTS.partners.icon, render: () => renderListSection('partners') },
  { id: 'faqs', label: 'FAQs', icon: LISTS.faqs.icon, render: () => renderListSection('faqs') },
  { id: 'impact', label: 'Impact numbers', icon: 'chart-bar', render: renderImpactSection },
  { id: 'contact', label: 'Contact details', icon: 'address-card', render: renderContactSection }
];

let stopCurrent = null;
let unreadBadge = null;

async function show(id) {
  const section = SECTIONS.find((s) => s.id === id) || SECTIONS[0];
  if (stopCurrent) { stopCurrent(); stopCurrent = null; }
  $$('#nav .nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === section.id));
  if (window.innerWidth < 1024) $('#nav').classList.add('hidden');
  try {
    const result = await section.render();
    if (typeof result === 'function') stopCurrent = result;
  } catch (err) {
    $('#main').replaceChildren(h('p.text-red-600', friendlyError(err)));
  }
}

function buildNav() {
  const nav = $('#nav');
  nav.replaceChildren();
  for (const s of SECTIONS) {
    if (s.group) { nav.appendChild(h('p.text-[11px].uppercase.tracking-widest.text-gray-400.font-bold.px-3.pt-5.pb-1', s.group)); continue; }
    const badge = s.id === 'inbox' ? h('span.badge.ml-auto.text-[11px].font-bold.rounded-full.px-2.py-0.5.bg-amber-100.text-amber-800', { hidden: true }) : null;
    if (badge) unreadBadge = badge;
    nav.appendChild(h('button.nav-btn.w-full.flex.items-center.gap-3.rounded-xl.px-3.py-2.5.text-sm.font-semibold.text-gray-700.hover:bg-gray-50.text-left', {
      type: 'button', 'data-id': s.id, onclick: () => { location.hash = s.id; }
    }, h('span.w-5.text-center', icon(s.icon)), s.label, badge));
  }
  nav.appendChild(h('button.lg:hidden.w-full.flex.items-center.gap-3.rounded-xl.px-3.py-2.5.text-sm.font-semibold.text-[#1a5f4a].text-left.mt-2', { type: 'button', 'data-signout': true },
    h('span.w-5.text-center', icon('sign-out-alt')), 'Sign out'));
}

// Unread count in the menu, kept live.
let stopBadge = null;
function watchUnread() {
  stopBadge = onSnapshot(query(collection(db, 'submissions'), orderBy('createdAt', 'desc')), (snap) => {
    const n = snap.docs.filter((d) => (d.data().status || 'new') === 'new').length;
    unreadBadge.textContent = n;
    unreadBadge.hidden = !n;
  }, () => {});
}

window.addEventListener('hashchange', () => { if (!$('#view-app').hidden) show(location.hash.slice(1)); });
$('#menu-toggle').addEventListener('click', () => $('#nav').classList.toggle('hidden'));
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-signout]')) signOut(auth);
});

// ---------------------------------------------------------------- sign in

function showView(name) {
  for (const v of ['loading', 'login', 'denied', 'app']) $('#view-' + v).hidden = v !== name;
}

const loginForm = $('#login-form');
const loginMsg = $('#login-message');
function loginMessage(text, ok) {
  loginMsg.textContent = text;
  loginMsg.className = 'text-sm ' + (ok ? 'text-green-700' : 'text-red-600');
  loginMsg.hidden = !text;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('button[type=submit]', loginForm);
  btn.disabled = true;
  loginMessage('');
  try {
    await signInWithEmailAndPassword(auth, $('#login-email').value.trim(), $('#login-password').value);
  } catch (err) {
    const code = err.code || '';
    loginMessage(code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')
      ? 'Wrong email or password.'
      : code.includes('too-many-requests') ? 'Too many attempts. Please wait a few minutes and try again.' : friendlyError(err));
  } finally {
    btn.disabled = false;
  }
});

$('#forgot-password').addEventListener('click', async () => {
  const email = $('#login-email').value.trim();
  if (!email) { loginMessage('Enter your email above first.'); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    loginMessage('If this email has an account, a reset link has been sent.', true);
  } catch (err) {
    loginMessage(friendlyError(err));
  }
});

onAuthStateChanged(auth, async (user) => {
  if (stopCurrent) { stopCurrent(); stopCurrent = null; }
  if (stopBadge) { stopBadge(); stopBadge = null; }
  closeDialog();
  if (!user) { showView('login'); return; }
  showView('loading');
  let isAdmin = false;
  try {
    isAdmin = (await getDoc(doc(db, 'admins', user.uid))).exists();
  } catch (err) {
    console.error(err);
  }
  if (!isAdmin) {
    $('#denied-email').textContent = user.email || '';
    $('#denied-uid').textContent = user.uid;
    showView('denied');
    return;
  }
  $('#account-email').textContent = user.email || '';
  buildNav();
  showView('app');
  watchUnread();
  show(location.hash.slice(1));
});
