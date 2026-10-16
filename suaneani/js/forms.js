// Saves website form submissions to Firestore (collection "submissions"),
// where they appear in the admin dashboard inbox (/admin/).
import { db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

export const FALLBACK_EMAIL = 'hp@suaneani.com';
const MAX = { name: 200, email: 200, institution: 200, topic: 100, subject: 100, page: 100, message: 5000 };

// fields: { type: 'contact' | 'partner', name, email, message, institution?, topic?, subject? }
export async function submitForm(fields) {
  const data = { type: fields.type, status: 'new', page: location.pathname.split('/').pop() || 'index.html' };
  for (const key of ['name', 'email', 'message', 'institution', 'topic', 'subject']) {
    const value = (fields[key] || '').trim();
    if (value) data[key] = value.slice(0, MAX[key]);
  }
  data.page = data.page.slice(0, MAX.page);
  data.createdAt = serverTimestamp();
  await addDoc(collection(db, 'submissions'), data);
}

export const isValidEmail = (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

// Contact page form: <form data-firestore-form="contact">
function initContactForm(form) {
  const button = form.querySelector('button[type="submit"]');
  const status = document.createElement('p');
  status.className = 'text-sm hidden';
  status.setAttribute('role', 'status');
  form.appendChild(status);

  const show = (text, ok) => {
    status.textContent = text;
    status.className = 'text-sm ' + (ok ? 'text-green-700' : 'text-red-600');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.elements['name'].value.trim();
    const email = form.elements['email'].value.trim();
    const message = form.elements['message'].value.trim();
    const select = form.elements['subject'];
    const subject = select && select.selectedIndex > 0 ? select.value : '';
    if (!name || !message || !isValidEmail(email)) {
      show('Please enter your name, a valid email address and a message.', false);
      return;
    }
    button.disabled = true;
    try {
      await submitForm({ type: 'contact', name, email, subject, message });
      form.reset();
      show('Thank you! Your message has been sent. We will get back to you soon.', true);
    } catch (err) {
      console.error('Contact form submission failed', err);
      show('Sorry, your message could not be sent. Please email us at ' + FALLBACK_EMAIL + '.', false);
    } finally {
      button.disabled = false;
    }
  });
}

document.querySelectorAll('form[data-firestore-form="contact"]').forEach(initContactForm);
