// Partner enquiry form (popup).
// Any element with data-partner-form="<Topic>" opens a form asking for name,
// contact email, institution and a message. Sending opens the visitor's email
// app with a message to hp@suaneani.com, the same as the Contact page form.
// Optional: data-institution-label="School name" changes the institution label.
(function () {
  var RECIPIENT = 'hp@suaneani.com';

  var modal = document.createElement('div');
  modal.id = 'partner-form-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'partner-form-title');
  modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:100;background:rgba(15,23,42,0.55);align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML =
    '<div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 relative max-h-full overflow-y-auto">' +
      '<button type="button" data-close class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl" aria-label="Close"><i class="fas fa-times"></i></button>' +
      '<p class="text-sm font-bold tracking-widest text-[#1a5f4a] uppercase mb-2" id="partner-form-topic"></p>' +
      '<h2 class="text-2xl font-extrabold text-gray-900 mb-1" id="partner-form-title">Let\'s talk</h2>' +
      '<p class="text-sm text-gray-600 mb-6">Leave your details and a short message and we will get back to you.</p>' +
      '<form class="space-y-4" novalidate>' +
        '<div><label class="block text-sm font-semibold text-gray-700 mb-1" for="pf-name">Name</label>' +
          '<input id="pf-name" name="name" required class="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-[#1a5f4a] outline-none" /></div>' +
        '<div><label class="block text-sm font-semibold text-gray-700 mb-1" for="pf-email">Contact email</label>' +
          '<input id="pf-email" name="email" type="email" required class="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-[#1a5f4a] outline-none" /></div>' +
        '<div><label class="block text-sm font-semibold text-gray-700 mb-1" for="pf-inst" id="pf-inst-label">Institution</label>' +
          '<input id="pf-inst" name="institution" required class="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-[#1a5f4a] outline-none" /></div>' +
        '<div><label class="block text-sm font-semibold text-gray-700 mb-1" for="pf-msg">Message</label>' +
          '<textarea id="pf-msg" name="message" rows="4" required class="w-full rounded-xl border border-gray-200 px-4 py-2.5 focus:ring-2 focus:ring-[#1a5f4a] outline-none"></textarea></div>' +
        '<p class="text-sm text-red-600 hidden" data-error>Please fill in every field with a valid email address.</p>' +
        '<button type="submit" class="w-full inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-semibold text-white bg-[#1a5f4a] hover:bg-[#134d3b] transition-colors">' +
          '<i class="fas fa-paper-plane mr-2"></i> Send Message</button>' +
      '</form>' +
    '</div>';

  var topic = '';
  var lastTrigger = null;

  function open(trigger) {
    lastTrigger = trigger;
    topic = trigger.getAttribute('data-partner-form') || 'Partnership';
    modal.querySelector('#partner-form-topic').textContent = topic;
    modal.querySelector('#pf-inst-label').textContent = trigger.getAttribute('data-institution-label') || 'Institution';
    modal.querySelector('[data-error]').classList.add('hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    modal.querySelector('#pf-name').focus();
  }

  function close() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    if (lastTrigger) lastTrigger.focus();
  }

  function init() {
    document.body.appendChild(modal);

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-partner-form]');
      if (trigger) {
        e.preventDefault();
        open(trigger);
        return;
      }
      if (e.target === modal || e.target.closest('#partner-form-modal [data-close]')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.style.display === 'flex') close();
    });

    modal.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var emailField = f.elements['email'];
      var name = f.elements['name'].value.trim(), email = emailField.value.trim();
      var inst = f.elements['institution'].value.trim(), msg = f.elements['message'].value.trim();
      if (!name || !inst || !msg || !email || !emailField.checkValidity()) {
        modal.querySelector('[data-error]').classList.remove('hidden');
        return;
      }
      var body = 'Name: ' + name + '\n' +
                 'Email: ' + email + '\n' +
                 modal.querySelector('#pf-inst-label').textContent + ': ' + inst + '\n\n' +
                 msg;
      window.location.href = 'mailto:' + RECIPIENT +
        '?subject=' + encodeURIComponent(topic + ' enquiry – ' + inst) +
        '&body=' + encodeURIComponent(body);
      f.reset();
      close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
