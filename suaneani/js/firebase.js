// Shared Firebase setup for the public site and the admin dashboard.
// The web config below is public by design: access is controlled by the
// Firestore security rules in /firestore.rules, not by hiding these values.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyBcArqjqq7n1dPx4_1u6dSBhF46Mgyq2Lo',
  authDomain: 'suaneani-ba54b.firebaseapp.com',
  projectId: 'suaneani-ba54b',
  storageBucket: 'suaneani-ba54b.firebasestorage.app',
  messagingSenderId: '873607423633',
  appId: '1:873607423633:web:db99d73243bf5d9447c130',
  measurementId: 'G-2RXBDW94R9'
};

// Images are hosted on Cloudinary (not Firebase Storage).
// Fill these in from the Cloudinary console: the cloud name is on the
// dashboard, and the upload preset must be an *unsigned* preset
// (Settings > Upload > Upload presets).
export const cloudinaryConfig = {
  cloudName: '',
  uploadPreset: ''
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Local testing against the Firebase emulator: on localhost, open any page
// with ?emulator=1 once; it is remembered for the browser tab.
export const usingEmulator = (() => {
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return false;
  try {
    if (new URLSearchParams(location.search).has('emulator')) sessionStorage.setItem('fb-emulator', '1');
    return sessionStorage.getItem('fb-emulator') === '1';
  } catch (e) {
    return false;
  }
})();

if (usingEmulator) {
  const { connectFirestoreEmulator } = await import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js');
  connectFirestoreEmulator(db, location.hostname, 8080);
}

// Google Analytics (measurementId above). Loaded lazily so a blocked
// analytics script never breaks forms or content.
if (!usingEmulator) {
  import('https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js')
    .then(async ({ getAnalytics, isSupported }) => { if (await isSupported()) getAnalytics(app); })
    .catch(() => {});
}
