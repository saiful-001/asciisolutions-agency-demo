# ASCII Solutions – Dynamic Agency Website

A fast, static-first agency website for the Bangladesh market with a full admin panel, Google Sheets lead capture, privacy-friendly analytics and Meta Pixel support. Deploys on **Vercel**, data lives in **Google Sheets** through **Google Apps Script**. (Same stack and format as the earlier honey landing-page project.)

> **বাংলায় সংক্ষেপে:** `admin.html` খুলে সব কনটেন্ট/দাম/রং/ছবি বদলান → **🚀 প্রকাশ করুন** চাপলে লাইভ সাইটে চলে যায় (কোড বা ডিপ্লয় ছাড়াই)। কন্টাক্ট ফর্মের Leads, ভিজিটর অ্যাক্টিভিটি, Pixel ইভেন্ট আপনার গুগল শিটে জমা হয়। অ্যাডমিন পাসওয়ার্ড **সার্ভারে (Apps Script)** যাচাই হয়, ফ্রন্টএন্ড ফাইলে কোনো পাসওয়ার্ড নেই।

---

## 1. Audit of the previous project (before changes)

| Area | What existed |
|---|---|
| Stack | Static HTML/CSS/JS on Vercel, content in `js/config.js`, Google Apps Script backend. No framework, no npm dependencies. |
| Admin | `admin.html` with a **browser-side** password check (hash in the frontend), config export/zip, sidebar editor. |
| Sheets | `Orders` (honey orders), `User Activity` (19 columns), `Pixel Events` (9 columns), `Report` (14-day), `Dashboard`, optional `Settings`. |
| Tracking | Meta Pixel (configurable ID), session activity beacon, order lock/queue, fraud cooldown. |
| **Did not exist** | A *monthly* report (Report is a 14-day table), a server-side admin login, leads management, an analytics screen, image upload, multi-page structure, SEO files. These were added in the same style. |

## 2. What changed

* **Content & design:** product landing page replaced by a premium multi-page agency site (editorial layout, asymmetric work grid, bold type, animations).
* **Pages are pre-rendered** (`node build.js`) so they work **without JavaScript** and are SEO friendly; JavaScript then adds animations, forms, tracking and **live content** from the admin data source with a safe fallback to `js/config.js`.
* **Admin:** rebuilt (schema-driven editor, right sidebar, Leads, Analytics, Code.gs generator). Login is now **verified by Apps Script**.
* **Backend (`Code.gs`):** leads, admin API, content publish, Drive image upload, analytics. **Orders / User Activity / Pixel Events logic and the first 19 Activity columns are unchanged.**

Main files: `index.html` + 7 pages + `404.html` + `case.html` + `work/<slug>/index.html` (generated) · `admin.html` · `js/config.js` (all content/tokens) · `js/render.js` (shared renderer) · `js/site.js` · `css/site.min.css` · `build.js` · `google-apps-script/Code.gs` · `vercel.json` · `sitemap.xml` · `robots.txt` · `CREDITS.md` · `_source/` (unminified code).

## 3. Pages (and why)

Home · **Services** (details per service) · **Portfolio** + **case-study pages** (`/work/<slug>`) · **About & team** · **Pricing** (BDT) · **Contact** · **Privacy** · **Terms** · **404**. Each has its own SEO title/description, canonical URL and Open Graph tags; `ProfessionalService` JSON-LD on every page and breadcrumb JSON-LD on inner pages.

*Not created:* **Blog** – the architecture is a static site with admin-managed JSON content; a blog would need a post editor and per-post static pages. It adds no value for launch; it can be added later in the same pattern as case studies.

Home sections (all can be shown/hidden and re-ordered from the admin): hero, marquee, services, about, why choose us, portfolio, process, industries, pricing, testimonials, FAQ, contact form, final CTA. Messenger / WhatsApp / Call buttons float on every page (full-width bar on mobile).

## 4. Admin panel – what you can edit (no code needed)

Open `/admin.html`. Right-hand sidebar (☰ on mobile):

* **Home sections:** hero (+stats), marquee, services intro, about, why us, portfolio intro, process steps, industries, pricing intro, testimonials intro, FAQ intro, contact intro, final CTA – each with show/hide + order.
* **Collections (add / edit / delete / reorder / hide):** services, portfolio & case studies, pricing packages (BDT), testimonials, FAQs, team. Image **upload** (compressed in the browser, stored in Google Drive).
* **Other pages:** About, Contact page text, Privacy, Terms, 404.
* **Site-wide:** brand & logo/favicon path, menu & header button, footer, contact details + Messenger/WhatsApp/social, contact-form options & success text & cooldown, **colors & fonts** (design tokens + 6 presets), **SEO per page** (title, description, social image, with character counters), **tracking** (Pixel ID, on/off, sampling %).
* **Data:** **Leads** (search, filter, status New/Contacted/Won/Lost, internal notes, CSV export) and **Analytics** (visits, sources, devices, CTA clicks, scroll depth, funnel, form conversion, daily chart).
* **Setup:** Google Sheet link + admin password → generates `Code.gs`; API link; backup/restore; download `config.js`.

Items that contain placeholder numbers/people carry a red **SAMPLE** badge (see §8).

## 5. What is saved where

| Sheet | Written when | Columns |
|---|---|---|
| **Leads** | Contact form is submitted and passes validation | A Lead ID · B Date & Time · C Name · D Phone · E Email · F Company · G Service Interest · H Budget · I Message · J Package · K Source Page · L Traffic Source · M Status (dropdown) · N Notes |
| **User Activity** (one row per session, updated in place) | Visitor leaves a page / after ~30 s | A Date & Time · B Session ID · C Source · D Medium · E Campaign · F Referrer · G Device · H Screen · I Landing Page · J Max Scroll % · K Time on Page (sec) · L *Order Btn Clicks* (= all CTA / call / WhatsApp / Messenger clicks) · M *Video Sound On* (unused, always No) · N *Reached Checkout* (= reached Contact section) · O Started Form · P *Ordered* (= lead submitted) · Q *Order ID* (= Lead ID) · R Pixel Events · S Last Update · **T Language · U Pages Viewed · V Sections Viewed · W Form Events** |
| **Pixel Events** | Same beacon | A Date & Time · B Session ID · C Event · D Value · E Currency · F Content IDs · G Order ID (= Lead ID) · H Source · I Device. Events: PageView, ViewContent, Lead, Contact, CTAClick, FormStart, FormSubmit, FormSuccess, FormError (+ the old AddToCart / InitiateCheckout / Purchase still accepted) |
| **Report** | Formulas, live | Last 14 days: visitors, reached contact, leads, won, conversion %, form starts, Pixel Lead; sources; devices |
| **Dashboard** | Formulas, live | Total/today/new/won leads, status table, top services, last 5 leads |
| **Settings** | When you press *Publish* | Published site content (JSON, chunked) + revision |
| **Orders** | Legacy (unchanged) | Only used if something still posts the old order format; not created by `setupAll` |

*The first 19 Activity columns and all 9 Pixel columns keep their original order, names and formats; header notes explain the agency meaning of the repurposed ones.*

**Contact form behaviour:** honeypot field, per-phone/e-mail cooldown (default **2 minutes**, editable), server-side validation, formula-injection protection (cells starting with `= + - @` are neutralised), `<` `>` stripped, idempotent retries, single-writer queue. **Success is shown only after the server returns a Lead ID.** If the server cannot be reached, the visitor sees an error and the phone/e-mail instead.

## 6. Setup & deployment

1. **Admin → "Sheet, পাসওয়ার্ড ও API"**: paste your (private) Google Sheet link, choose an admin password (min 8 chars) → **Copy Code.gs**. (Only the SHA-256 *hash* goes into Code.gs.)
2. Google Sheet → **Extensions → Apps Script** → replace code → **Save** → run **`setupAll`** (grant Sheets + Drive permission) → creates Leads, User Activity, Pixel Events, Report, Dashboard, Settings.
3. **Deploy → New deployment → Web app** (Execute as *Me*, Access *Anyone*) → copy the `/exec` link. Later code changes: *Deploy → Manage deployments → ✏️ → New version* (link stays the same).
4. In the admin Setup page paste the `/exec` link into **API link**, click **⬇️ config.js**, replace `js/config.js`, commit and push.
5. **Vercel:** import the repo (framework: *Other*). `vercel.json` already sets `buildCommand: node build.js`, clean URLs, the `/work/:slug` rewrite, cache and security headers. If your Vercel plan/settings ignore `outputDirectory: "."`, run `node build.js` locally and commit the generated HTML instead (they are already included).
6. In admin **SEO**, set your real domain (used for canonical, OG and `sitemap.xml`). Then re-run `node build.js` or push.
7. Open `/admin.html` → log in → edit → **🚀 Publish**. Changes appear on the live site immediately (cached for ≤5 minutes); search-engine HTML refreshes on the next deploy.
8. Optional: add your **Facebook Pixel ID** in *Tracking*.

Local build any time: `node build.js` (Node 18+, no dependencies).

## 7. Security & privacy

* Admin login is **checked on the server**; sessions are random tokens held server-side (6 h); wrong-password attempts are rate-limited (6 tries → 15-minute lock). No passwords or secrets in frontend files. Until an API link exists, `/admin.html` runs in *Setup mode* (no data access; it can only edit locally and generate files).
* Admin content is always rendered escaped; URLs are filtered; colors/fonts are validated; uploads accept JPG/PNG/WebP only (≤ ~1.6 MB); settings are size-limited.
* Keep the Google Sheet **private** (it holds phone numbers and e-mails). The Drive folder only holds public site images.
* **Tracking privacy note:** tracking is anonymous. It stores a random per-session ID plus pages, scroll depth, clicks, device type, screen size, language, referrer and UTM tags. **No name, phone or e-mail is sent through tracking.** Visitors with *Do Not Track* enabled are not tracked. Mention Meta Pixel and Google-hosted storage in your privacy policy (a draft is included, edit it with your lawyer).

## 8. Sample content you must replace before launch

Marked **SAMPLE** in the admin: hero statistics, all 6 portfolio case studies (fictional clients and results), 4 testimonials, 4 team members. Also placeholders: phone `+8801700000000`, WhatsApp, Messenger link, e-mail `hello@asciisolutions.example`, address, social links, domain `asciisolutions.example`, Privacy/Terms drafts, package prices.

## 9. Verification

**Verified here (automated, real headless Chromium + a local test server running the real `Code.gs` logic):** all pages render with and without JavaScript; one H1 and no heading-order gaps; alt text, image dimensions and form labels present; no horizontal overflow at 360 px; admin login (wrong password rejected, lock-out, token checked on every call); editing, bad-slug blocking, publish; the published change (heading, hidden section, new service, colours, FAQ) appearing on the public site; contact form → Lead row; duplicate within cooldown rejected; invalid phone rejected; honeypot rejected; formula/tag injection neutralised; tracking rows (one per session, updated) and Pixel rows; Leads status update; Analytics; legacy order flow; Drive-upload validation (mock Drive).

**Not verified:** deployment to real Google Apps Script / Google Sheets (formulas in Report/Dashboard, conditional formats and real Drive uploads were not run against Google), a real Vercel build, Meta Pixel delivery, behaviour in Safari/Firefox, and visual checks on real phones. Fonts were verified from the self-hosted files; Google-Fonts alternatives were not loaded.

## 10. Known limitations

* New case studies added from the admin open instantly at `/work/<slug>` (rendered in the browser); their SEO-friendly static page is generated on the next `node build.js` / deploy.
* Pages show baked content first; if published content differs, it updates a moment later (cached copy used on repeat visits).
* Images are original SVG illustrations (no stock photos could be downloaded – see `CREDITS.md`). Uploaded photos are JPEG.
* Apps Script has quotas (~30 simultaneous executions): lead capture has priority; use the *sampling %* in Tracking if you run very heavy ad traffic.

---

## 🆕 অ্যাডমিন প্যানেলের নতুন ফিচার (আপডেট)

| # | ফিচার | কোথায় |
|---|-------|--------|
| ১ | সব সেকশন দেখান/লুকান | **সেকশনের ক্রম** (হোমের ১২টি, "সব দেখান/সব লুকান" বাটনসহ) + **সেকশন দেখান/লুকান** (Services, Portfolio, About, Pricing পেজের সেকশন; ফ্লোটিং বাটন, প্রগ্রেস বার, হেডার বাটন, ব্রেডক্রাম্ব, ফুটার সোশ্যাল) |
| ২ | সব সেকশনের ডাটা আপডেট | বাঁ-মেনুর প্রতিটি সেকশন + নতুন **বাটন ও সাধারণ লেখা** + **কন্টাক্ট ফর্ম** (সব লেবেল/প্লেসহোল্ডার/সাবমিট বাটন) |
| ৩ | Google Sheet যুক্ত করা | **Sheet, পাসওয়ার্ড ও API** পেজ: শিট লিংক → আইডি স্বয়ংক্রিয় ধরা পড়ে, Code.gs কপি/ডাউনলোড, API লিংক যাচাই |
| ৪ | রং/থিম পরিবর্তন | **রং, থিম ও লেআউট**: ৬টি প্রিসেট, প্রতিটি রং, ফন্ট, কর্নার রেডিয়াস (০–৪০px), বাটনের আকার |
| ৫ | "ডাটা কীভাবে সেভ হয়" বাটন | ফর্মের নিচে বাটন → লাইভ প্রিভিউ মডাল (Leads শিটের মতো টেবিল, ভিজিটরের লেখা ডাটা সারিতে বসে; কিছু পাঠানো হয় না)। চালু/বন্ধ: Setup পেজের **কাস্টমার প্রাইভেসি** অংশ |
| ৬ | থিম-১ / থিম-২ | **রং, থিম ও লেআউট** পেজের উপরের দুটি কার্ড। থিম-১ = আগের ডিফল্ট ডিজাইন। থিম-২ = আলাদা স্ট্রাকচার, কনটেন্ট একই |

### থিম-২ এ কী আলাদা
ভাসমান পিল হেডার · মাঝখানের হিরো + চওড়া আর্ট প্যানেল + স্ট্যাট কার্ড · নম্বর দেওয়া সার্ভিস লিস্ট · স্টিকি-হেডিং "কেন আমরা" · হরিজন্টাল পোর্টফোলিও রেইল · ভার্টিকাল টাইমলাইন প্রসেস · বড় ফিচার্ড টেস্টিমোনিয়াল · দুই-কলাম FAQ · উপরে তথ্য-টাইল ও নিচে ফর্ম · বক্স CTA · মাঝখানের ফুটার।

### গোপনীয়তা নোট
আসল Leads শিটের লিংক ওয়েবসাইটে কোথাও দেখানো হয় না। মডালে শুধু নমুনা প্রিভিউ থাকে; চাইলে আলাদা একটি পাবলিক **ডেমো শিটের** লিংক (শুধু `https://docs.google.com/…`) দেওয়া যায়।

### ডেভেলপার নোট
সোর্স: `_source/` (render.js, site.js, site.css)। পরিবর্তনের পর মিনিফাই: `esbuild _source/render.js --minify --outfile=js/render.js` (site.js ও site.css এর জন্যও একই, css → `css/site.min.css`), তারপর `node build.js`। `Code.gs` বদলাতে হয়নি।

---

## 💻 কম্পিউটারে ডাবল-ক্লিকে দেখা (file://)

জিপ Extract করে `index.html` সরাসরি Chrome-এ খুললেও এখন পুরো ডিজাইন, ছবি, ফন্ট ও পেজ-লিংক ঠিকমতো কাজ করে (`admin.html` ও কাজ করে)।
- **পুরো প্রজেক্ট ফোল্ডারটা একসাথে রাখুন** (শুধু `index.html` আলাদা করে নিলে চলবে না)।
- লোকালি ফর্ম সাবমিট, Leads ও লাইভ প্রকাশ কাজ করবে না (Google Apps Script API লাগে)। ওগুলো Vercel এ ডিপ্লয়ের পর চলবে।
- Vercel/সার্ভারে আগের মতোই চলে, কিছু বদলায়নি।
