// Partner enquiry form (popup).
// Any element with data-partner-form="<Topic>" opens a form asking for name,
// contact email, institution and a message. Submissions are saved to Firestore
// and appear in the admin dashboard inbox.
// Optional: data-institution-label="School name" changes the institution label.
import { submitForm, isValidEmail, FALLBACK_EMAIL } from './forms.js';

const modal = document.createElement('div');
modal.id = 'partner-form-modal';
modal.setAttribute('role', 'dialog');
modal.setAttribute('aria-modal', 'true');
modal.setAttribute('aria-labelledby', 'partner-form-title');
modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:100;background:rgba(15,23,42,0.55);align-items:center;justify-content:center;padding:16px;';
modal.innerHTML = `
  <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 relative max-h-full overflow-y-auto">
    <button type="button" data-close class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl" aria-label="Close"><i class="fas fa-times"></i></button>
    <div data-form-view>
      <p class="text-sm font-bold tracking-widest text-[#1a5f4a] uppercase mb-2" id="partner-form-topic"></p>
      <h2 class="text-2xl font-extrabold text-gray-900 mb-1" id="partner-form-title">Let's talk</h2>
      <p class="text-sm text-gray-600 mb-6">Leave your details and a short message and we will get back to you.</p>
      <form class="space-y-4" novalidate>
        <div><label class="block text-sm font-semibold text-gray-700 mb-1" for="pf-name">Name</label>
          <input id="pf-name" name="name" maxlength="200" required class="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-[#1a5f4a] outline-none" /></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-1" for="pf-email">Contact email</label>
          <input id="pf-email" name="email" type="email" maxlength="200" required class="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-[#1a5f4a] outline-none" /></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-1" for="pf-inst" id="pf-inst-label">Institution</label>
          <input id="pf-inst" name="institution" maxlength="200" required class="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-[#1a5f4a] outline-none" /></div>
        <div><label class="block text-sm font-semibold text-gray-700 mb-1" for="pf-msg">Message</label>
          <textarea id="pf-msg" name="message" rows="4" maxlength="5000" required class="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-[#1a5f4a] outline-none"></textarea></div>
        <p class="text-sm text-red-600 hidden" data-error role="alert"></p>
        <button type="submit" class="w-full inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold text-white bg-[#1a5f4a] hover:bg-[#134d3b] transition-colors disabled:opacity-60">
          <i class="fas fa-paper-plane mr-2"></i> <span data-submit-label>Send Message</span></button>
      </form>
    </div>
    <div data-thanks-view class="hidden text-center py-6">
      <div class="w-16 h-16 mx-auto rounded-full bg-green-50 text-[#1a5f4a] flex items-center justify-center text-2xl mb-4"><i class="fas fa-check"></i></div>
      <h2 class="text-2xl font-extrabold text-gray-900 mb-2">Thank you!</h2>
      <p class="text-gray-600 mb-6">Your message has been sent. We will get back to you soon.</p>
      <button type="button" data-close class="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold text-white bg-[#1a5f4a] hover:bg-[#134d3b]">Close</button>
    </div>
  </div>`;

const form = modal.querySelector('form');
const errorEl = modal.querySelector('[data-error]');
const submitBtn = form.querySelector('button[type="submit"]');
const formView = modal.querySelector('[data-form-view]');
const thanksView = modal.querySelector('[data-thanks-view]');
let topic = '';
let lastTrigger = null;

function showError(text) {
  errorEl.textContent = text;
  errorEl.classList.remove('hidden');
}

function open(trigger) {
  lastTrigger = trigger;
  topic = trigger.getAttribute('data-partner-form') || 'Partnership';
  modal.querySelector('#partner-form-topic').textContent = topic;
  modal.querySelector('#pf-inst-label').textContent = trigger.getAttribute('data-institution-label') || 'Institution';
  errorEl.classList.add('hidden');
  formView.classList.remove('hidden');
  thanksView.classList.add('hidden');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  modal.querySelector('#pf-name').focus();
}

function close() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
  if (lastTrigger) lastTrigger.focus();
}

document.body.appendChild(modal);

document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-partner-form]');
  if (trigger) {
    e.preventDefault();
    open(trigger);
    return;
  }
  if (e.target === modal || e.target.closest('#partner-form-modal [data-close]')) close();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.style.display === 'flex') close();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = form.elements['name'].value.trim();
  const email = form.elements['email'].value.trim();
  const institution = form.elements['institution'].value.trim();
  const message = form.elements['message'].value.trim();
  if (!name || !institution || !message || !isValidEmail(email)) {
    showError('Please fill in every field with a valid email address.');
    return;
  }
  errorEl.classList.add('hidden');
  submitBtn.disabled = true;
  try {
    await submitForm({ type: 'partner', topic, name, email, institution, message });
    form.reset();
    formView.classList.add('hidden');
    thanksView.classList.remove('hidden');
  } catch (err) {
    console.error('Partner form submission failed', err);
    showError('Sorry, your message could not be sent. Please email us at ' + FALLBACK_EMAIL + '.');
  } finally {
    submitBtn.disabled = false;
  }
});
