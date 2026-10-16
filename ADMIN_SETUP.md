# SuaNeAni website admin: setup guide

The website now saves form messages to **Firestore** (Firebase project `suaneani-ba54b`)
and has an **admin dashboard** at `/admin/` (for example `https://<your-site>/suaneani/admin/`
or `https://<your-site>/admin/`, depending on where the `suaneani` folder is served).

Do the one-time steps below before the forms and dashboard work on the live site.

---

## 1. Turn on the Firebase features (Firebase console, ~5 minutes)

Open <https://console.firebase.google.com/> → project **suaneani-ba54b**.

1. **Firestore Database** → *Create database* (if not created yet). Choose a location close
   to Ghana (e.g. `europe-west1`), start in **production mode**.
2. **Firestore Database → Rules**: replace everything with the contents of
   [`firestore.rules`](firestore.rules) in this repository and click **Publish**.
   Without these rules the forms and dashboard will not work.
3. **Authentication** → *Get started* → **Sign-in method** → enable **Email/Password**.
4. **Authentication → Settings → Authorized domains**: add the domain the website runs on
   (e.g. `suaneani.com` and/or `yourname.github.io`). `localhost` is there by default.

## 2. Create an admin account

1. **Authentication → Users → Add user**: enter the admin's email and a strong password.
2. Copy the new user's **User UID** from the list.
3. **Firestore Database → Data → Start collection**: collection ID `admins`,
   document ID = the **User UID** you copied, add one field `email` (string) with the
   admin's email, and save.

Repeat for every person who should have access. To remove someone, delete their document
in `admins` (and the user in Authentication).

> Admins can only be added from the Firebase console. Nobody can make themselves an admin
> from the website.

If someone signs in and sees **"No admin access"**, the page shows their User UID. Use it in step 2.3.

## 3. Set up Cloudinary image uploads

Images are stored on Cloudinary, not Firebase Storage.

1. Sign in at <https://console.cloudinary.com/>. Your **cloud name** is on the dashboard.
2. **Settings → Upload → Upload presets → Add upload preset**:
   - Signing mode: **Unsigned**
   - Folder: `suaneani` (optional)
   - Under *Upload control* consider limiting allowed formats to `jpg, png, webp` and a
     max file size (e.g. 10 MB).
   - Save and copy the preset name.
3. In [`suaneani/js/firebase.js`](suaneani/js/firebase.js) fill in:

   ```js
   export const cloudinaryConfig = {
     cloudName: 'your-cloud-name',
     uploadPreset: 'your-unsigned-preset'
   };
   ```

   Commit, push and merge to `main`.

Until this is done, the dashboard still works: paste an image URL instead of uploading.

Notes:
- An unsigned preset lets anyone who finds the preset name upload to your Cloudinary
  account (not change your website). Keep upload limits on the preset, and rename the
  preset if it is ever abused.
- Deleting an item in the dashboard does not delete its image from Cloudinary; clean up
  old images in the Cloudinary Media Library when needed.

---

## Using the dashboard

Sign in at `/admin/` with the admin email and password. "Forgot password?" sends a reset email.

| Section | What it controls |
|---|---|
| **Inbox** | Messages from the Contact page and the partner enquiry pop-ups (Development and Technology partner pages). New messages show a count in the menu. Open a message to read it, reply by email, archive, mark unread or delete. **Export CSV** downloads everything. |
| **News** | Articles on the News page and the article page. The newest article, or the one marked *Featured*, is shown at the top. Category *Announcements* also appears in "Latest Announcements". |
| **Gallery** | Photos on the Gallery page, with the same categories as the filter buttons. |
| **Testimonials** | "Voices of Our Community" on the home page. |
| **Partner logos** | "Our Partners" on the About page. |
| **FAQs** | A "Frequently Asked Questions" section on the Contact page. It appears automatically once at least one FAQ is published. The 7 questions from the brief can be added as drafts with one click. Write the answers, then publish. |
| **Impact numbers** | "Our impact by the numbers" on the Impact page. Hidden until *Show this section* is ticked. |
| **Contact details** | Office address, phone numbers, emails and office hours on the Contact page. |

How content works:
- Each page still contains its current content in the HTML. Until something is **published**
  in the dashboard, visitors see the HTML version.
- For lists (testimonials, partner logos, gallery), the first time you open the section,
  click **Import current website items**. This copies what the site shows today into the
  dashboard so you can edit it. Once any item is published, the dashboard list replaces
  the built-in one.
- *Draft* items (Published unticked) are never shown to visitors.
- *Display order*: lower numbers come first.
- News article formatting: blank line between paragraphs, `## ` heading, `### ` sub-heading,
  `- ` bullet points, `> ` quote, `**bold**`.

## Showing the Gallery and News pages

They are ready but hidden from the menus. To show them, open `suaneani/js/layout.js`
and uncomment the lines marked `<!-- Gallery & News: uncomment ... -->`. There are three places:
the mobile menu, the desktop menu and the footer's Quick Links. Remove the `<!-- ` and ` -->`
around each link, for example:

```html
<!-- <a href="gallery.html" data-page="gallery" ...>Gallery</a> -->
```
becomes
```html
<a href="gallery.html" data-page="gallery" ...>Gallery</a>
```

Then push and merge to `main`.

---

## For developers

- `suaneani/js/firebase.js`: Firebase config (public by design; security comes from the rules) and Cloudinary settings.
- `suaneani/js/forms.js`: saves the Contact form; `suaneani/js/partner-form.js`: the partner pop-up form.
- `suaneani/js/site-content.js`: loads published content into the pages. Lists use the first item in the HTML as the template (`data-list`, `data-f` attributes).
- `suaneani/js/layout.js`: the menu (header) and footer shared by all pages.
- `suaneani/admin/`: the dashboard.
- `firestore.rules`: security rules. Deploy from the console (above) or with the Firebase CLI:
  `firebase deploy --only firestore:rules` (uses `firebase.json` / `.firebaserc`).

Local testing with the Firebase emulator (no real data touched):

```sh
firebase emulators:start --only firestore,auth --project suaneani-ba54b
cd suaneani && python3 -m http.server 8765
# open http://127.0.0.1:8765/admin/?emulator=1 (the flag is remembered per browser tab)
```

Create a test admin in the emulator's Auth and an `admins/<uid>` document, as in step 2.
