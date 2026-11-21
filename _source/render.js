/* ASCII Solutions – shared renderer (runs in the browser AND in build.js).
   Pure functions: config in, HTML string out. All dynamic text is escaped. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.R = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- helpers ---------- */
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); };
  var arr = function (x) { return Array.isArray(x) ? x : []; };
  var on = function (x) { return x && x.show !== false; };
  function U(p) { p = String(p || ""); if (!p) return ""; return /^(https?:|data:|\/|#|mailto:|tel:)/i.test(p) ? p : "/" + p; }
  function safeUrl(u) { u = String(u || "").trim(); return /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(u) ? u : (u ? "/" + u : ""); }
  function digits(s) { return String(s || "").replace(/\D/g, ""); }
  function href(cfg, h) {
    var c = cfg.contact || {};
    if (h === "whatsapp") return "https://wa.me/" + digits(c.whatsapp);
    if (h === "messenger") return c.messenger || "#";
    if (h === "call") return "tel:" + String(c.phone || "").replace(/[^\d+]/g, "");
    if (h === "email") return "mailto:" + (c.email || "");
    return safeUrl(h) || "#";
  }
  function hash(o) { var s = JSON.stringify(o), h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + s.length.toString(36); }
  function paras(t) { return String(t || "").split(/\n{2,}/).filter(Boolean).map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; }).join(""); }
  function md(t) {
    var out = [], list = false;
    String(t || "").split("\n").forEach(function (ln) {
      var m;
      var inl = function (s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); };
      if ((m = ln.match(/^##\s+(.*)/))) { if (list) { out.push("</ul>"); list = false; } out.push("<h2>" + inl(m[1]) + "</h2>"); }
      else if ((m = ln.match(/^-\s+(.*)/))) { if (!list) { out.push("<ul>"); list = true; } out.push("<li>" + inl(m[1]) + "</li>"); }
      else if (!ln.trim()) { if (list) { out.push("</ul>"); list = false; } }
      else { if (list) { out.push("</ul>"); list = false; } out.push("<p>" + inl(ln) + "</p>"); }
    });
    if (list) out.push("</ul>");
    return out.join("");
  }
  /* heading with [[accent]] words and word-by-word reveal */
  function heading(text) {
    var i = 0, parts = String(text || "").split(/(\[\[.*?\]\])/), out = "";
    parts.forEach(function (p) {
      var acc = /^\[\[/.test(p); p = p.replace(/^\[\[|\]\]$/g, "");
      var glue = !acc && out && /^[^\s]/.test(p);            // punctuation right after an accent word: no gap
      p.split(/\s+/).filter(Boolean).forEach(function (w, n) {
        if (glue && n === 0) out = out.replace(/ $/, "");
        out += '<span class="wd"><span class="wi' + (acc ? " hl" : "") + '" style="--i:' + (i++) + '">' + esc(w) + "</span></span> ";
      });
    });
    return out.trim();
  }

  /* ---------- icons (24x24 stroke) ---------- */
  var IC = {
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    brand: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>',
    ads: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    seo: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    social: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>',
    app: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
    bot: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M8 16h.01M16 16h.01"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    chart: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
    health: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
    school: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    arrow: '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    instagram: '<rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
    youtube: '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
    behance: '<path d="M3 6h6a3 3 0 0 1 0 6H3z"/><path d="M3 12h7a3 3 0 0 1 0 6H3z"/><path d="M15 8h6"/><path d="M21 15a3 3 0 1 0-3 3 3 3 0 0 0 3-3h-6"/>'
  };
  function icon(n, s) { return '<svg class="ic" width="' + (s || 24) + '" height="' + (s || 24) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (IC[n] || IC.star) + "</svg>"; }
  function img(src, alt, w, h, o) {
    o = o || {};
    return '<img src="' + esc(U(src)) + '" alt="' + esc(alt || "") + '" width="' + w + '" height="' + h + '"' + (o.eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async"' + (o.cls ? ' class="' + o.cls + '"' : "") + ">";
  }

  /* ---------- theme / fonts ---------- */
  var BUNDLED = { "Space Grotesk": 1, "Inter": 1 };
  function fontFaces() {
    return '@font-face{font-family:"Space Grotesk";font-style:normal;font-weight:300 700;font-display:swap;src:url(/assets/fonts/space-grotesk-latin-wght-normal.woff2) format("woff2")}' +
      '@font-face{font-family:"Inter";font-style:normal;font-weight:100 900;font-display:swap;src:url(/assets/fonts/inter-latin-wght-normal.woff2) format("woff2")}' +
      '@font-face{font-family:"Hind Siliguri";font-style:normal;font-weight:400;font-display:swap;src:url(/assets/fonts/hind-siliguri-bengali-400-normal.woff2) format("woff2");unicode-range:U+0980-09FF,U+200C-200D,U+25CC}' +
      '@font-face{font-family:"Hind Siliguri";font-style:normal;font-weight:600 700;font-display:swap;src:url(/assets/fonts/hind-siliguri-bengali-600-normal.woff2) format("woff2");unicode-range:U+0980-09FF,U+200C-200D,U+25CC}';
  }
  var SAFE = /^[A-Za-z0-9 \-]{2,40}$/, HEX = /^#[0-9a-fA-F]{3,8}$/;
  function themeCss(cfg) {
    var t = cfg.theme || {}, v = [];
    [["bg", "bg"], ["surface", "surface"], ["ink", "ink"], ["muted", "muted"], ["line", "line"], ["accent", "accent"], ["accentInk", "accent-ink"], ["dark", "dark"], ["darkSoft", "dark-soft"]].forEach(function (k) { if (HEX.test(t[k[0]] || "")) v.push("--" + k[1] + ":" + t[k[0]]); });
    var fh = SAFE.test(t.fontHead || "") ? t.fontHead : "Space Grotesk", fb = SAFE.test(t.fontBody || "") ? t.fontBody : "Inter";
    v.push('--font-head:"' + fh + '","Hind Siliguri",system-ui,sans-serif');
    v.push('--font-body:"' + fb + '","Hind Siliguri",system-ui,sans-serif');
    var rad = Number(t.radius);
    if (t.radius !== "" && t.radius != null && rad >= 0 && rad <= 40) { v.push("--r:" + rad + "px"); v.push("--r-sm:" + Math.round(rad * 0.64) + "px"); }
    var br = { pill: "999px", round: "14px", square: "4px" }[t.btnShape]; if (br) v.push("--btn-r:" + br);
    return ":root{" + v.join(";") + "}";
  }
  function googleFontsHref(cfg) {
    var t = cfg.theme || {}, fam = [];
    [[t.fontHead, "500;600;700"], [t.fontBody, "400;500;600"]].forEach(function (f) { if (f[0] && SAFE.test(f[0]) && !BUNDLED[f[0]]) fam.push("family=" + encodeURIComponent(f[0]).replace(/%20/g, "+") + ":wght@" + f[1]); });
    return fam.length ? "https://fonts.googleapis.com/css2?" + fam.join("&") + "&display=swap" : "";
  }

  /* ---------- layout / texts / visibility ---------- */
  function layoutOf(cfg) { return cfg && cfg.layout === "t2" ? "t2" : "t1"; }
  var TXT = { learnMore: "Learn more", getQuote: "Get a quote", startingFrom: "Starting from", nextProject: "Next project", challenge: "The challenge", solution: "Our solution", sheetBtn: "See how your data is saved" };
  function tx(cfg, k) { var t = (cfg.text || {})[k]; return t ? String(t) : TXT[k]; }
  function ps(cfg, page, key) { return ((cfg.pageSections || {})[page] || {})[key] !== false; }
  function ui(cfg, key) { return (cfg.ui || {})[key] !== false; }
  function fl(cfg, k, d) { var v = ((cfg.form || {}).labels || {})[k]; return v ? String(v) : d; }

  /* ---------- pieces ---------- */
  function btn(cfg, o, cls) { if (!o || !o.label) return ""; return '<a class="btn ' + (cls || "btn--primary") + '" href="' + esc(href(cfg, o.href)) + '" data-cta="' + esc(o.label) + '"><span>' + esc(o.label) + "</span>" + icon("arrow", 18) + "</a>"; }
  function head(eyebrow, title, sub, o) {
    o = o || {};
    return '<header class="sh' + (o.center ? " sh--c" : "") + '">' + (eyebrow ? '<p class="eyebrow">' + esc(eyebrow) + "</p>" : "") + '<h2 class="h-lg" data-split>' + heading(title) + "</h2>" + (sub ? '<p class="lead">' + esc(sub) + "</p>" : "") + "</header>";
  }
  function stars(n) { var s = ""; for (var i = 0; i < 5; i++) s += '<span class="' + (i < n ? "on" : "") + '">' + icon("star", 16) + "</span>"; return '<span class="stars" role="img" aria-label="' + n + ' out of 5">' + s + "</span>"; }
  function counter(v, suffix) {
    var n = parseFloat(v), isNum = !isNaN(n) && String(v).trim() !== "" && /^[\d.]+$/.test(String(v));
    return isNum ? '<span class="count" data-count="' + n + '" data-dec="' + (String(v).indexOf(".") > -1 ? String(v).split(".")[1].length : 0) + '">' + esc(v) + "</span>" + esc(suffix || "") : esc(v) + esc(suffix || "");
  }
  function serviceCard(cfg, s, i) {
    return '<article class="svc' + (i === 0 ? " svc--wide" : "") + ' tilt" data-reveal><a href="/services#' + esc(s.slug) + '" class="svc__a" data-cta="service:' + esc(s.slug) + '"><span class="svc__ic">' + icon(s.icon, 26) + '</span><h3>' + esc(s.title) + "</h3><p>" + esc(s.summary) + '</p><span class="svc__more">' + esc(tx(cfg, "learnMore")) + " " + icon("arrow", 16) + "</span></a></article>";
  }
  function workCard(cfg, p, i) {
    return '<article class="work' + (i % 5 === 0 ? " work--lg" : "") + '" data-reveal data-cat="' + esc(p.category) + '"><a href="/work/' + esc(p.slug) + '" class="work__a" data-cta="case:' + esc(p.slug) + '"><div class="work__img">' + img(p.cover, p.title + " project preview", 1600, 1000) + '</div><div class="work__meta"><div><p class="work__cat">' + esc(p.category) + " · " + esc(p.year) + "</p><h3>" + esc(p.title) + "</h3><p class=\"work__sum\">" + esc(p.summary) + "</p></div>" + '<span class="work__go">' + icon("arrow", 22) + "</span></div></a></article>";
  }
  function pkgCard(cfg, k) {
    return '<article class="pkg' + (k.highlight ? " pkg--hot" : "") + '" data-reveal>' + (k.badge ? '<span class="pkg__badge">' + esc(k.badge) + "</span>" : "") + "<h3>" + esc(k.name) + '</h3><p class="pkg__price"><strong>' + esc(k.price) + "</strong>" + (k.period ? "<span>" + esc(k.period) + "</span>" : "") + '</p><p class="pkg__desc">' + esc(k.desc) + '</p><ul class="ticks">' + arr(k.features).map(function (f) { return "<li>" + icon("check", 18) + "<span>" + esc(f) + "</span></li>"; }).join("") + '</ul><a class="btn ' + (k.highlight ? "btn--primary" : "btn--ghost") + '" href="/contact?package=' + encodeURIComponent(k.name) + '#contact-form" data-cta="package:' + esc(k.name) + '"><span>' + esc(k.cta || "Get started") + "</span>" + icon("arrow", 18) + "</a></article>";
  }
  function testiCard(t) {
    return '<figure class="tq" data-reveal>' + stars(t.rating || 5) + "<blockquote>" + esc(t.text) + '</blockquote><figcaption>' + (t.avatar ? img(t.avatar, "", 400, 400, { cls: "tq__av" }) : "") + "<span><strong>" + esc(t.name) + "</strong><small>" + esc(t.role) + (t.company ? ", " + esc(t.company) : "") + "</small></span></figcaption></figure>";
  }
  function faqList(cfg) {
    return '<div class="faq">' + arr(cfg.faq).filter(on).map(function (f, i) { return '<details class="faq__i" data-reveal' + (i === 0 ? " open" : "") + '><summary><span>' + esc(f.q) + "</span>" + icon("plus", 22) + '</summary><div class="faq__a">' + paras(f.a) + "</div></details>"; }).join("") + "</div>";
  }
  function iconGrid(items, cls) {
    return '<div class="' + (cls || "igrid") + '">' + arr(items).map(function (it) { return '<article class="ig" data-reveal><span class="ig__ic">' + icon(it.icon, 26) + "</span><h3>" + esc(it.title) + "</h3><p>" + esc(it.text) + "</p></article>"; }).join("") + "</div>";
  }
  function leadForm(cfg, id) {
    var f = cfg.form || {}, sv = cfg.sheetView || {}, opt = function (a) { return arr(a).map(function (o) { return "<option>" + esc(o) + "</option>"; }).join(""); };
    var sheet = sv.show !== false ? '<button class="btn btn--ghost btn--lg sheetbtn" type="button" data-sheetview data-cta="sheet-preview">' + icon("chart", 18) + "<span>" + esc(sv.button || tx(cfg, "sheetBtn")) + "</span></button>" : "";
    return '<form class="lform" id="' + (id || "contact-form") + '" data-lead novalidate method="post" action="/contact">' +
      '<div class="lead__row"><label class="fld"><span>' + esc(fl(cfg, "name", "Your name *")) + '</span><input name="name" type="text" autocomplete="name" required minlength="2" maxlength="80" placeholder="' + esc(fl(cfg, "namePh", "e.g. Rahim Uddin")) + '"></label>' +
      '<label class="fld"><span>' + esc(fl(cfg, "phone", "Phone / WhatsApp *")) + '</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" placeholder="' + esc(fl(cfg, "phonePh", "01XXXXXXXXX")) + '"></label></div>' +
      '<div class="lead__row"><label class="fld"><span>' + esc(fl(cfg, "email", "Email")) + '</span><input name="email" type="email" autocomplete="email" maxlength="120" placeholder="' + esc(fl(cfg, "emailPh", "you@company.com")) + '"></label>' +
      '<label class="fld"><span>' + esc(fl(cfg, "company", "Company / brand")) + '</span><input name="company" type="text" autocomplete="organization" maxlength="100" placeholder="' + esc(fl(cfg, "companyPh", "Your business name")) + '"></label></div>' +
      '<div class="lead__row"><label class="fld"><span>' + esc(fl(cfg, "interest", "I need help with")) + '</span><select name="interest"><option value="">' + esc(fl(cfg, "interestPh", "Select a service")) + '</option>' + opt(f.interests) + '</select></label>' +
      '<label class="fld"><span>' + esc(fl(cfg, "budget", "Budget")) + '</span><select name="budget"><option value="">' + esc(fl(cfg, "budgetPh", "Select a range")) + '</option>' + opt(f.budgets) + "</select></label></div>" +
      '<label class="fld"><span>' + esc(fl(cfg, "message", "Tell us about your project *")) + '</span><textarea name="message" rows="5" required minlength="10" maxlength="1500" placeholder="' + esc(fl(cfg, "messagePh", "Goals, timeline, links… any detail helps")) + '"></textarea></label>' +
      '<div class="hp" aria-hidden="true"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<input type="hidden" name="package" value=""><input type="hidden" name="page" value="">' +
      '<div class="lead__btns"><button class="btn btn--primary btn--lg" type="submit"><span class="lead__lbl">' + esc(fl(cfg, "submit", "Send message")) + '</span>' + icon("arrow", 18) + "</button>" + sheet + "</div>" +
      '<p class="lead__note">' + esc(fl(cfg, "note", "We reply within one business day. Your details are used only to reply to you.")) + ' <a href="/privacy">' + esc(fl(cfg, "privacyLink", "Privacy Policy")) + '</a>.</p>' +
      '<div class="lead__msg" role="status" aria-live="polite" hidden></div>' +
      '<noscript><p class="lead__ns">JavaScript is off. Please call ' + esc((cfg.contact || {}).phone) + " or email " + esc((cfg.contact || {}).email) + ".</p></noscript></form>";
  }
  function contactInfo(cfg) {
    var c = cfg.contact || {}, rows = [];
    if (c.phone) rows.push('<a class="ci" href="' + esc(href(cfg, "call")) + '" data-cta="call"><span class="ci__ic">' + icon("phone", 22) + "</span><span><small>Call us</small><strong>" + esc(c.phone) + "</strong></span></a>");
    if (c.whatsapp) rows.push('<a class="ci ci--wa" href="' + esc(href(cfg, "whatsapp")) + '" target="_blank" rel="noopener" data-cta="whatsapp"><span class="ci__ic">' + icon("chat", 22) + "</span><span><small>WhatsApp</small><strong>Chat now</strong></span></a>");
    if (c.messenger) rows.push('<a class="ci ci--ms" href="' + esc(safeUrl(c.messenger)) + '" target="_blank" rel="noopener" data-cta="messenger"><span class="ci__ic">' + icon("chat", 22) + "</span><span><small>Messenger</small><strong>Message us</strong></span></a>");
    if (c.email) rows.push('<a class="ci" href="' + esc(href(cfg, "email")) + '" data-cta="email"><span class="ci__ic">' + icon("mail", 22) + "</span><span><small>Email</small><strong>" + esc(c.email) + "</strong></span></a>");
    if (c.address) rows.push('<div class="ci"><span class="ci__ic">' + icon("pin", 22) + "</span><span><small>Studio</small><strong>" + esc(c.address) + "</strong></span></div>");
    if (c.hours) rows.push('<div class="ci"><span class="ci__ic">' + icon("clock", 22) + "</span><span><small>Hours</small><strong>" + esc(c.hours) + "</strong></span></div>");
    return '<div class="cinfo">' + rows.join("") + "</div>";
  }
  function socials(cfg) {
    var s = (cfg.contact || {}).social || {};
    return '<ul class="soc">' + ["facebook", "instagram", "linkedin", "youtube", "behance", "github"].filter(function (k) { return s[k]; }).map(function (k) { return '<li><a href="' + esc(safeUrl(s[k])) + '" target="_blank" rel="noopener" aria-label="' + k + '" data-cta="social:' + k + '">' + icon(k, 20) + "</a></li>"; }).join("") + "</ul>";
  }

  /* ---------- home sections ---------- */
  var S = {};
  S.hero = function (cfg) {
    var h = (cfg.home || {}).hero || {};
    return '<section class="hero" id="top" data-sec="hero"><div class="wrap hero__grid"><div class="hero__txt"><p class="eyebrow eyebrow--pill"><span class="dot"></span>' + esc(h.eyebrow) + '</p><h1 class="h-xl" data-split>' + heading(h.title) + '</h1><p class="lead lead--lg">' + esc(h.sub) + '</p><div class="hero__btns">' + btn(cfg, h.primary, "btn--primary btn--lg magnet") + btn(cfg, h.secondary, "btn--ghost btn--lg") + "</div></div>" +
      '<div class="hero__art" aria-hidden="false">' + (h.image ? img(h.image, "ASCII-style globe illustration", 640, 570, { eager: true, cls: "hero__ascii" }) : "") + (h.card ? '<div class="hero__card">' + img(h.card, "Website dashboard preview", 520, 340, { eager: true }) + "</div>" : "") + "</div></div>" +
      '<div class="wrap"><ul class="stats">' + arr(h.stats).map(function (s) { return '<li class="stat"><strong>' + counter(s.value, s.suffix) + "</strong><span>" + esc(s.label) + "</span></li>"; }).join("") + "</ul></div></section>";
  };
  S.marquee = function (cfg) {
    var items = arr(((cfg.home || {}).marquee || {}).items), one = items.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("");
    return '<div class="mqw" data-sec="marquee"><section class="mq" aria-label="Our capabilities"><div class="mq__track">' + one + one + one + one + "</div></section></div>";
  };
  S.services = function (cfg) {
    var h = cfg.home.services || {}, list = arr(cfg.services).filter(on);
    return '<section class="sec" id="services" data-sec="services"><div class="wrap">' + head(h.eyebrow, h.title, h.sub) + '<div class="svc-grid">' + list.map(function (s, i) { return serviceCard(cfg, s, i); }).join("") + "</div>" + (h.cta ? '<p class="sec__cta">' + btn(cfg, h.cta, "btn--ghost") + "</p>" : "") + "</div></section>";
  };
  S.about = function (cfg) {
    var h = cfg.home.about || {};
    return '<section class="sec sec--tint" id="about" data-sec="about"><div class="wrap split"><div class="split__img" data-reveal>' + (h.image ? img(h.image, "ASCII Solutions studio illustration", 900, 700) : "") + '</div><div class="split__txt"><p class="eyebrow">' + esc(h.eyebrow) + '</p><h2 class="h-lg" data-split>' + heading(h.title) + "</h2><div class=\"prose\">" + paras(h.text) + '</div><ul class="ticks">' + arr(h.points).map(function (p) { return "<li>" + icon("check", 18) + "<span>" + esc(p) + "</span></li>"; }).join("") + "</ul>" + (h.cta ? "<p>" + btn(cfg, h.cta, "btn--ghost") + "</p>" : "") + "</div></div></section>";
  };
  S.why = function (cfg) {
    var h = cfg.home.why || {};
    return '<section class="sec sec--dark" id="why" data-sec="why"><div class="wrap">' + head(h.eyebrow, h.title, h.sub) + iconGrid(h.items, "igrid igrid--dark") + "</div></section>";
  };
  S.portfolio = function (cfg) {
    var h = cfg.home.portfolio || {}, list = arr(cfg.portfolio).filter(on), feat = list.filter(function (p) { return p.featured; });
    if (feat.length < 3) feat = list.slice(0, 3);
    return '<section class="sec" id="work" data-sec="portfolio"><div class="wrap">' + head(h.eyebrow, h.title, h.sub) + '<div class="work-grid">' + feat.map(function (p, i) { return workCard(cfg, p, i); }).join("") + "</div>" + (h.cta ? '<p class="sec__cta">' + btn(cfg, h.cta, "btn--ghost") + "</p>" : "") + "</div></section>";
  };
  S.process = function (cfg) {
    var h = cfg.home.process || {};
    return '<section class="sec sec--tint" id="process" data-sec="process"><div class="wrap">' + head(h.eyebrow, h.title, h.sub) + '<ol class="steps">' + arr(h.steps).map(function (s, i) { return '<li class="step" data-reveal><span class="step__n">' + ("0" + (i + 1)).slice(-2) + "</span><h3>" + esc(s.title) + "</h3><p>" + esc(s.text) + "</p></li>"; }).join("") + "</ol></div></section>";
  };
  S.industries = function (cfg) {
    var h = cfg.home.industries || {};
    return '<section class="sec" id="industries" data-sec="industries"><div class="wrap">' + head(h.eyebrow, h.title, h.sub) + iconGrid(h.items, "igrid igrid--3") + "</div></section>";
  };
  S.pricing = function (cfg) {
    var h = cfg.home.pricing || {};
    return '<section class="sec sec--tint" id="pricing" data-sec="pricing"><div class="wrap">' + head(h.eyebrow, h.title, h.sub) + '<div class="pkg-grid">' + arr(cfg.packages).filter(on).map(function (k) { return pkgCard(cfg, k); }).join("") + "</div>" + (h.cta ? '<p class="sec__cta">' + btn(cfg, h.cta, "btn--ghost") + "</p>" : "") + "</div></section>";
  };
  S.testimonials = function (cfg) {
    var h = cfg.home.testimonials || {};
    return '<section class="sec" id="testimonials" data-sec="testimonials"><div class="wrap">' + head(h.eyebrow, h.title, h.sub) + '<div class="tq-grid">' + arr(cfg.testimonials).filter(on).map(testiCard).join("") + "</div></div></section>";
  };
  S.faq = function (cfg) {
    var h = cfg.home.faq || {};
    return '<section class="sec sec--tint" id="faq" data-sec="faq"><div class="wrap wrap--narrow">' + head(h.eyebrow, h.title, h.sub, { center: true }) + faqList(cfg) + "</div></section>";
  };
  S.contact = function (cfg) {
    var h = cfg.home.contact || {};
    return '<section class="sec" id="contact" data-sec="contact"><div class="wrap contact-grid"><div>' + head(h.eyebrow, h.title, h.sub) + contactInfo(cfg) + socials(cfg) + '</div><div class="formcard" data-reveal>' + leadForm(cfg, "contact-form") + "</div></div></section>";
  };
  S.cta = function (cfg) {
    var h = cfg.home.cta || {};
    return '<section class="cta" id="start" data-sec="cta"><div class="wrap cta__in"><h2 class="h-lg" data-split>' + heading(h.title) + '</h2><p class="lead lead--lg">' + esc(h.sub) + '</p><div class="hero__btns hero__btns--c">' + btn(cfg, h.primary, "btn--primary btn--lg magnet") + btn(cfg, h.secondary, "btn--light btn--lg") + "</div></div></section>";
  };

  /* ---------- Theme-2 home sections (different structure, same content) ---------- */
  var S2 = {};
  S2.hero = function (cfg) {
    var h = (cfg.home || {}).hero || {};
    return '<section class="hero hero--c" id="top" data-sec="hero"><div class="wrap"><div class="hero__txt"><p class="eyebrow eyebrow--pill"><span class="dot"></span>' + esc(h.eyebrow) + '</p><h1 class="h-xl" data-split>' + heading(h.title) + '</h1><p class="lead lead--lg">' + esc(h.sub) + '</p><div class="hero__btns hero__btns--c">' + btn(cfg, h.primary, "btn--primary btn--lg magnet") + btn(cfg, h.secondary, "btn--ghost btn--lg") + "</div></div>" +
      '<div class="hero__art hero__art--wide">' + (h.image ? img(h.image, "ASCII-style globe illustration", 640, 570, { eager: true, cls: "hero__ascii" }) : "") + (h.card ? '<div class="hero__card">' + img(h.card, "Website dashboard preview", 520, 340, { eager: true }) + "</div>" : "") + "</div>" +
      '<ul class="stats stats--cards">' + arr(h.stats).map(function (x) { return '<li class="stat"><strong>' + counter(x.value, x.suffix) + "</strong><span>" + esc(x.label) + "</span></li>"; }).join("") + "</ul></div></section>";
  };
  S2.services = function (cfg) {
    var h = cfg.home.services || {}, list = arr(cfg.services).filter(on);
    return '<section class="sec" id="services" data-sec="services"><div class="wrap svl-wrap"><div class="svl-head">' + head(h.eyebrow, h.title, h.sub) + (h.cta ? "<p>" + btn(cfg, h.cta, "btn--ghost") + "</p>" : "") + '</div><ol class="svl">' +
      list.map(function (x, i) { return '<li class="svl__i" data-reveal><a href="/services#' + esc(x.slug) + '" class="svl__a" data-cta="service:' + esc(x.slug) + '"><span class="svl__n">' + ("0" + (i + 1)).slice(-2) + '</span><span class="svl__ic">' + icon(x.icon, 24) + '</span><span class="svl__t"><h3>' + esc(x.title) + "</h3><p>" + esc(x.summary) + "</p></span>" + (x.from ? '<span class="svl__p"><small>' + esc(tx(cfg, "startingFrom")) + "</small><b>" + esc(x.from) + "</b></span>" : "") + '<span class="svl__go">' + icon("arrow", 22) + "</span></a></li>"; }).join("") + "</ol></div></section>";
  };
  S2.why = function (cfg) {
    var h = cfg.home.why || {};
    return '<section class="sec sec--dark" id="why" data-sec="why"><div class="wrap why2"><div class="why2__head">' + head(h.eyebrow, h.title, h.sub) + '</div><ol class="why2__list">' +
      arr(h.items).map(function (it, i) { return '<li class="why2__i" data-reveal><span class="why2__n">' + ("0" + (i + 1)).slice(-2) + '</span><div><h3>' + esc(it.title) + "</h3><p>" + esc(it.text) + '</p></div><span class="ig__ic">' + icon(it.icon, 24) + "</span></li>"; }).join("") + "</ol></div></section>";
  };
  S2.portfolio = function (cfg) {
    var h = cfg.home.portfolio || {}, list = arr(cfg.portfolio).filter(on).slice(0, 8);
    return '<section class="sec" id="work" data-sec="portfolio"><div class="wrap">' + head(h.eyebrow, h.title, h.sub) + '</div><div class="work-grid work-grid--rail">' + list.map(function (p, i) { return workCard(cfg, p, i); }).join("") + "</div>" + (h.cta ? '<div class="wrap"><p class="sec__cta">' + btn(cfg, h.cta, "btn--ghost") + "</p></div>" : "") + "</section>";
  };
  S2.testimonials = function (cfg) {
    var h = cfg.home.testimonials || {}, list = arr(cfg.testimonials).filter(on);
    return '<section class="sec" id="testimonials" data-sec="testimonials"><div class="wrap">' + head(h.eyebrow, h.title, h.sub) + (list[0] ? testiCard(list[0]).replace('class="tq"', 'class="tq tq--big"') : "") + '<div class="tq-grid tq-grid--3">' + list.slice(1).map(testiCard).join("") + "</div></div></section>";
  };
  S2.faq = function (cfg) {
    var h = cfg.home.faq || {};
    return '<section class="sec sec--tint" id="faq" data-sec="faq"><div class="wrap faq2"><div class="faq2__head">' + head(h.eyebrow, h.title, h.sub) + "</div>" + faqList(cfg) + "</div></section>";
  };
  S2.contact = function (cfg) {
    var h = cfg.home.contact || {};
    return '<section class="sec" id="contact" data-sec="contact"><div class="wrap contact2">' + head(h.eyebrow, h.title, h.sub, { center: true }) + contactInfo(cfg) + '<div class="formcard formcard--c" data-reveal>' + leadForm(cfg, "contact-form") + "</div>" + socials(cfg) + "</div></section>";
  };
  S2.cta = function (cfg) { return ctaBox(cfg, "", "", "start", "cta"); };

  /* ---------- pages ---------- */
  function pageHero(eyebrow, title, sub, crumb) {
    return '<section class="phero"><div class="wrap">' + (crumb || "") + '<p class="eyebrow">' + esc(eyebrow) + '</p><h1 class="h-xl" data-split>' + heading(title) + '</h1>' + (sub ? '<p class="lead lead--lg">' + esc(sub) + "</p>" : "") + "</div></section>";
  }
  function crumbs(cfg, items) {
    if (!ui(cfg, "breadcrumbs")) return "";
    return '<nav class="crumbs" aria-label="Breadcrumb"><ol>' + items.map(function (c, i) { return "<li>" + (c[1] ? '<a href="' + esc(c[1]) + '">' + esc(c[0]) + "</a>" : '<span aria-current="page">' + esc(c[0]) + "</span>") + "</li>"; }).join("") + "</ol></nav>";
  }
  function ctaBox(cfg, title, sub, id, sec) {
    var h = cfg.home.cta || {};
    return '<section class="cta cta--box"' + (id ? ' id="' + id + '"' : "") + (sec ? ' data-sec="' + sec + '"' : "") + '><div class="wrap"><div class="cta__card cta__in"><div><h2 class="h-lg" data-split>' + heading(title || h.title) + '</h2><p class="lead lead--lg">' + esc(sub || h.sub) + '</p></div><div class="hero__btns">' + btn(cfg, h.primary, "btn--dark btn--lg") + btn(cfg, h.secondary, "btn--ghost btn--lg") + "</div></div></div></section>";
  }
  function ctaBlock(cfg, title, sub) {
    if (layoutOf(cfg) === "t2") return ctaBox(cfg, title, sub);
    var h = cfg.home.cta || {};
    return '<section class="cta"><div class="wrap cta__in"><h2 class="h-lg" data-split>' + heading(title || h.title) + '</h2><p class="lead lead--lg">' + esc(sub || h.sub) + '</p><div class="hero__btns hero__btns--c">' + btn(cfg, h.primary, "btn--primary btn--lg magnet") + btn(cfg, h.secondary, "btn--light btn--lg") + "</div></div></section>";
  }
  var P = {};
  P.home = function (cfg) {
    var h = cfg.home;
    var t2 = layoutOf(cfg) === "t2";
    return arr(h.order).filter(function (k) { return S[k] && (h.show || {})[k] !== false; }).map(function (k) { return ((t2 && S2[k]) || S[k])(cfg); }).join("");
  };
  P.services = function (cfg) {
    var p = cfg.servicesPage || {}, list = arr(cfg.services).filter(on);
    return pageHero(p.eyebrow, p.title, p.sub, crumbs(cfg, [["Home", "/"], ["Services"]])) +
      '<section class="sec sec--flush"><div class="wrap">' + list.map(function (s, i) {
        return '<article class="sv" id="' + esc(s.slug) + '" data-reveal><div class="sv__img">' + img(s.image, s.title + " illustration", 800, 600) + '</div><div class="sv__txt"><span class="svc__ic">' + icon(s.icon, 26) + "</span><h2 class=\"h-md\">" + esc(s.title) + '</h2><p class="lead">' + esc(s.details) + '</p><ul class="ticks">' + arr(s.features).map(function (f) { return "<li>" + icon("check", 18) + "<span>" + esc(f) + "</span></li>"; }).join("") + '</ul><p class="sv__from">' + (s.from ? esc(tx(cfg, "startingFrom")) + " <strong>" + esc(s.from) + "</strong>" : "") + '</p><a class="btn btn--primary" href="/contact?service=' + encodeURIComponent(s.title) + '#contact-form" data-cta="service-quote:' + esc(s.slug) + '"><span>' + esc(tx(cfg, "getQuote")) + '</span>' + icon("arrow", 18) + "</a></div></article>";
      }).join("") + "</div></section>" +
      (ps(cfg, "services", "process") ? S.process(cfg) : "") + (ps(cfg, "services", "cta") ? ctaBlock(cfg, p.ctaTitle, p.ctaSub) : "");
  };
  P.portfolio = function (cfg) {
    var p = cfg.portfolioPage || {}, list = arr(cfg.portfolio).filter(on), cats = [];
    list.forEach(function (x) { String(x.category || "").split("·").forEach(function (c) { c = c.trim(); if (c && cats.indexOf(c) < 0) cats.push(c); }); });
    return pageHero(p.eyebrow, p.title, p.sub, crumbs(cfg, [["Home", "/"], ["Work"]])) +
      '<section class="sec sec--flush"><div class="wrap"><div class="filters" role="group" aria-label="Filter projects"><button type="button" class="chip is-on" data-filter="*">All</button>' + cats.map(function (c) { return '<button type="button" class="chip" data-filter="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + '</div><h2 class="sr">All projects</h2><div class="work-grid work-grid--all">' + list.map(function (x, i) { return workCard(cfg, x, i); }).join("") + "</div></div></section>" + (ps(cfg, "portfolio", "cta") ? ctaBlock(cfg, p.ctaTitle, p.ctaSub) : "");
  };
  P.case = function (cfg, slug) {
    var list = arr(cfg.portfolio).filter(on), idx = -1;
    list.forEach(function (x, i) { if (x.slug === slug) idx = i; });
    if (idx < 0) return P.notfound(cfg);
    var c = list[idx], next = list[(idx + 1) % list.length];
    return '<section class="phero phero--case"><div class="wrap">' + crumbs(cfg, [["Home", "/"], ["Work", "/portfolio"], [c.title]]) + '<p class="eyebrow">' + esc(c.category) + " · " + esc(c.year) + '</p><h1 class="h-xl" data-split>' + heading(c.title) + '</h1><p class="lead lead--lg">' + esc(c.summary) + "</p>" +
      '<ul class="tags">' + arr(c.tags).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div></section>" +
      '<section class="sec sec--flush"><div class="wrap"><div class="case__cover" data-reveal>' + img(c.cover, c.title + " main preview", 1600, 1000, { eager: true }) + '</div>' +
      '<dl class="case__meta"><div><dt>Client</dt><dd>' + esc(c.client) + "</dd></div><div><dt>Category</dt><dd>" + esc(c.category) + "</dd></div><div><dt>Year</dt><dd>" + esc(c.year) + "</dd></div>" + (c.link ? '<div><dt>Live site</dt><dd><a href="' + esc(safeUrl(c.link)) + '" target="_blank" rel="noopener">Visit project</a></dd></div>' : "") + "</dl>" +
      '<div class="case__cols"><div data-reveal><h2 class="h-md">' + esc(tx(cfg, "challenge")) + '</h2>' + paras(c.challenge) + '</div><div data-reveal><h2 class="h-md">' + esc(tx(cfg, "solution")) + '</h2>' + paras(c.solution) + "</div></div>" +
      '<ul class="stats stats--case">' + arr(c.results).map(function (r) { return '<li class="stat"><strong>' + counter(r.value, "") + "</strong><span>" + esc(r.label) + "</span></li>"; }).join("") + "</ul>" +
      '<div class="case__gal">' + arr(c.gallery).map(function (g, i) { return '<div data-reveal>' + img(g, c.title + " design " + (i + 1), 1600, 1000) + "</div>"; }).join("") + "</div>" +
      '<a class="next" href="/work/' + esc(next.slug) + '" data-cta="next-case"><span><small>' + esc(tx(cfg, "nextProject")) + '</small><strong>' + esc(next.title) + "</strong></span>" + icon("arrow", 28) + "</a></div></section>" + ctaBlock(cfg);
  };
  P.about = function (cfg) {
    var a = cfg.aboutPage || {};
    return pageHero(a.eyebrow, a.title, a.sub, crumbs(cfg, [["Home", "/"], ["About"]])) +
      (ps(cfg, "about", "story") ? ('<section class="sec sec--flush"><div class="wrap split"><div class="split__img" data-reveal>' + img(cfg.home.about.image, "ASCII Solutions studio illustration", 900, 700) + '</div><div class="split__txt"><h2 class="h-md">' + esc(a.storyTitle) + '</h2><div class="prose">' + paras(a.story) + '</div><h2 class="h-md">' + esc(a.missionTitle) + '</h2><div class="prose">' + paras(a.mission) + "</div></div></div></section>") : "") +
      (ps(cfg, "about", "values") ? ('<section class="sec sec--dark"><div class="wrap">' + head("Values", a.valuesTitle, "") + iconGrid(a.values, "igrid igrid--dark igrid--4") + "</div></section>") : "") +
      (ps(cfg, "about", "team") ? ('<section class="sec"><div class="wrap">' + head("Team", a.teamTitle, a.teamSub) + '<div class="team">' + arr(cfg.team).filter(on).map(function (m) { return '<article class="member" data-reveal>' + img(m.photo, m.name, 400, 400) + "<h3>" + esc(m.name) + "</h3><p class=\"member__role\">" + esc(m.role) + "</p><p>" + esc(m.bio) + "</p></article>"; }).join("") + "</div></div></section>") : "") + (ps(cfg, "about", "cta") ? ctaBlock(cfg) : "");
  };
  P.pricing = function (cfg) {
    var p = cfg.pricingPage || {};
    return pageHero(p.eyebrow, p.title, p.sub, crumbs(cfg, [["Home", "/"], ["Pricing"]])) +
      '<section class="sec sec--flush"><div class="wrap"><h2 class="sr">Packages</h2><div class="pkg-grid">' + arr(cfg.packages).filter(on).map(function (k) { return pkgCard(cfg, k); }).join("") + '</div>' + (ps(cfg, "pricing", "note") ? '<p class="note">' + esc(p.note) + "</p>" : "") + "</div></section>" +
      (ps(cfg, "pricing", "faq") ? ('<section class="sec sec--tint"><div class="wrap wrap--narrow">' + head("FAQ", p.faqTitle || "Questions", "", { center: true }) + faqList(cfg) + "</div></section>") : "") + (ps(cfg, "pricing", "cta") ? ctaBlock(cfg) : "");
  };
  P.contact = function (cfg) {
    var p = cfg.contactPage || {};
    return pageHero(p.eyebrow, p.title, p.sub, crumbs(cfg, [["Home", "/"], ["Contact"]])) +
      '<section class="sec sec--flush" id="contact"><div class="wrap contact-grid"><div><h2 class="h-md">' + esc(p.infoTitle) + "</h2>" + contactInfo(cfg) + socials(cfg) + '</div><div class="formcard" data-reveal><h2 class="h-md">' + esc(p.formTitle) + "</h2>" + leadForm(cfg, "contact-form") + "</div></div></section>";
  };
  function legal(key) {
    return function (cfg) {
      var l = (cfg.legal || {})[key] || {};
      return pageHero("Legal", l.title || key, "Last updated: " + (l.updated || ""), crumbs(cfg, [["Home", "/"], [l.title || key]])) + '<section class="sec sec--flush"><div class="wrap wrap--narrow prose prose--legal">' + md(l.body) + "</div></section>";
    };
  }
  P.privacy = legal("privacy"); P.terms = legal("terms");
  P.notfound = function (cfg) {
    var n = cfg.notFound || {};
    return '<section class="nf"><div class="wrap"><p class="nf__code" aria-hidden="true">404</p><h1 class="h-xl">' + esc(n.title) + '</h1><p class="lead lead--lg">' + esc(n.text) + '</p><p><a class="btn btn--primary btn--lg" href="/"><span>' + esc(n.btn) + "</span>" + icon("arrow", 18) + "</a></p></div></section>";
  };

  /* ---------- header / footer / floaters ---------- */
  var PATHS = { home: "/", services: "/services", portfolio: "/portfolio", about: "/about", pricing: "/pricing", contact: "/contact", privacy: "/privacy", terms: "/terms", notfound: "/404", case: "/portfolio" };
  function header(cfg, page) {
    var b = cfg.brand || {}, cur = PATHS[page], hc = cfg.headerCta;
    var nav = arr(cfg.nav).filter(on).map(function (n) { return '<a href="' + esc(safeUrl(n.href)) + '"' + (cur && (n.href === cur || (page === "case" && n.href === "/portfolio")) ? ' aria-current="page"' : "") + ">" + esc(n.label) + "</a>"; }).join("");
    var showCta = ui(cfg, "headerCta") && hc && hc.label;
    var cta = showCta ? '<a class="btn btn--primary btn--sm hdr__cta magnet" href="' + esc(href(cfg, hc.href)) + '" data-cta="header-cta"><span>' + esc(hc.label) + "</span></a>" : "";
    return (ui(cfg, "progress") ? '<div class="progress" id="progress" aria-hidden="true"></div>' : "") + '<div class="wrap hdr__in"><a class="logo" href="/" aria-label="' + esc(b.name) + ' home">' + img(b.logo, b.name, 220, 48, { eager: true }) + '</a><nav class="nav" aria-label="Main">' + nav + "</nav>" + cta +
      '<button class="burger" type="button" aria-expanded="false" aria-controls="mnav" aria-label="Open menu">' + icon("menu", 26) + "</button></div>" +
      '<div class="mnav" id="mnav" hidden><nav aria-label="Mobile">' + nav + "</nav>" + (showCta ? '<a class="btn btn--primary btn--lg" href="' + esc(href(cfg, hc.href)) + '" data-cta="mobile-cta"><span>' + esc(hc.label) + "</span></a>" : "") + "</div>";
  }
  function footer(cfg) {
    var b = cfg.brand || {}, f = cfg.footer || {}, year = new Date().getFullYear(), soc = ui(cfg, "footerSocial") ? socials(cfg) : "";
    var bar = '<div class="wrap ftr__bar"><p>' + esc(String(f.copyright || "").replace("{year}", year)) + '</p><p><a href="mailto:' + esc((cfg.contact || {}).email) + '">' + esc((cfg.contact || {}).email) + "</a></p></div>";
    if (layoutOf(cfg) === "t2") {
      var links = []; arr(f.columns).forEach(function (c) { arr(c.links).forEach(function (l) { links.push('<a href="' + esc(safeUrl(l.href)) + '">' + esc(l.label) + "</a>"); }); });
      return '<div class="wrap ftr2"><a class="logo" href="/">' + img(b.logoLight || b.logo, b.name, 220, 48) + "</a><p>" + esc(f.about) + '</p><nav class="ftr2__links" aria-label="Footer">' + links.join("") + "</nav>" + soc + "</div>" + bar;
    }
    return '<div class="wrap ftr__grid"><div class="ftr__about"><a class="logo" href="/">' + img(b.logoLight || b.logo, b.name, 220, 48) + "</a><p>" + esc(f.about) + "</p>" + soc + "</div>" +
      arr(f.columns).map(function (c) { return '<nav class="ftr__col" aria-label="' + esc(c.title) + '"><h3>' + esc(c.title) + "</h3><ul>" + arr(c.links).map(function (l) { return '<li><a href="' + esc(safeUrl(l.href)) + '">' + esc(l.label) + "</a></li>"; }).join("") + "</ul></nav>"; }).join("") + "</div>" + bar;
  }
  function floaters(cfg) {
    var c = cfg.contact || {}, o = "";
    if (!ui(cfg, "floaters")) return "";
    if (c.messenger) o += '<a class="fl fl--ms" href="' + esc(safeUrl(c.messenger)) + '" target="_blank" rel="noopener" aria-label="Chat on Messenger" data-cta="float-messenger">' + icon("chat", 24) + "<span>Messenger</span></a>";
    if (c.whatsapp) o += '<a class="fl fl--wa" href="' + esc(href(cfg, "whatsapp")) + '" target="_blank" rel="noopener" aria-label="Chat on WhatsApp" data-cta="float-whatsapp">' + icon("chat", 24) + "<span>WhatsApp</span></a>";
    if (c.phone) o += '<a class="fl fl--call" href="' + esc(href(cfg, "call")) + '" aria-label="Call us" data-cta="float-call">' + icon("phone", 24) + "<span>Call</span></a>";
    return o;
  }

  /* ---------- opening the files straight from a folder (file://) ---------- */
  // Root-relative URLs ("/css/…") only work on a server. When a page is opened by double-click this tiny
  // boot script loads CSS/JS from the real project folder; site.js then fixes images and links. No effect on a server.
  function fileBoot(depth) {
    if (location.protocol !== "file:") return;
    var u = location.href.split(/[?#]/)[0].split("/"); u.length -= 1 + depth;
    var r = u.join("/") + "/"; window.__FILE_ROOT = r;
    document.write('<link rel="stylesheet" href="' + r + 'css/site.min.css">');
    ["config", "render", "site"].forEach(function (n) { document.write('<script defer src="' + r + "js/" + n + '.js"><' + "/script>"); });
    document.addEventListener("DOMContentLoaded", function () { var f = document.getElementById("fonts-css"); if (f) f.textContent = f.textContent.replace(/url\(\//g, "url(" + r); });
  }

  /* ---------- SEO ---------- */
  function abs(cfg, p) { var base = String((cfg.seo || {}).siteUrl || "").replace(/\/+$/, ""); p = U(p); return /^https?:/.test(p) ? p : base + p; }
  function seoFor(cfg, page, slug) {
    var s = ((cfg.seo || {}).pages || {})[page] || {}, t = s.title, d = s.description, im = s.image;
    if (page === "case") {
      var c = arr(cfg.portfolio).filter(function (x) { return x.slug === slug; })[0];
      if (c) { t = c.title + " – Case Study | " + ((cfg.seo || {}).siteName || ""); d = c.summary; im = im || c.cover; }
      else { var nf = ((cfg.seo || {}).pages || {}).notfound || {}; t = nf.title; d = nf.description; }
    }
    return { title: t || (cfg.seo || {}).siteName || "", description: d || "", image: im || (cfg.seo || {}).ogImage || "" };
  }
  function pathFor(page, slug) { return page === "case" ? "/work/" + slug : (PATHS[page] || "/"); }
  function jsonLd(cfg, page, slug) {
    var c = cfg.contact || {}, b = cfg.brand || {}, soc = c.social || {}, ld = [];
    ld.push({ "@context": "https://schema.org", "@type": "ProfessionalService", name: b.name, url: abs(cfg, "/"), logo: abs(cfg, b.favicon || b.logo), image: abs(cfg, (cfg.seo || {}).ogImage), description: ((cfg.seo || {}).pages || {}).home ? cfg.seo.pages.home.description : "", telephone: c.phone, email: c.email, priceRange: "৳৳", areaServed: { "@type": "Country", name: "Bangladesh" }, address: { "@type": "PostalAddress", streetAddress: c.address, addressLocality: "Dhaka", addressCountry: "BD" }, sameAs: Object.keys(soc).map(function (k) { return soc[k]; }).filter(Boolean) });
    if (page !== "home" && page !== "notfound") {
      var items = [["Home", "/"]]; if (page === "case") items.push(["Work", "/portfolio"]);
      var seo = seoFor(cfg, page, slug); items.push([seo.title.split(" | ")[0].split(" – ")[0], pathFor(page, slug)]);
      ld.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map(function (x, i) { return { "@type": "ListItem", position: i + 1, name: x[0], item: abs(cfg, x[1]) }; }) });
    }
    return ld.map(function (o) { return '<script type="application/ld+json">' + JSON.stringify(o).replace(/</g, "\\u003c") + "</script>"; }).join("");
  }
  function headTags(cfg, page, slug) {
    var s = seoFor(cfg, page, slug), seo = cfg.seo || {}, url = abs(cfg, pathFor(page, slug)), gf = googleFontsHref(cfg), b = cfg.brand || {};
    return '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(s.title) + '</title><meta name="description" content="' + esc(s.description) + '">' +
      (page === "notfound" ? '<meta name="robots" content="noindex">' : '<link rel="canonical" href="' + esc(url) + '">') +
      '<meta name="theme-color" content="' + esc((cfg.theme || {}).bg || "#F5F2EA") + '">' +
      '<meta property="og:type" content="website"><meta property="og:site_name" content="' + esc(seo.siteName) + '"><meta property="og:title" content="' + esc(s.title) + '"><meta property="og:description" content="' + esc(s.description) + '"><meta property="og:url" content="' + esc(url) + '"><meta property="og:image" content="' + esc(abs(cfg, s.image)) + '"><meta property="og:locale" content="' + esc(seo.locale || "en_BD") + '">' +
      '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + esc(s.title) + '"><meta name="twitter:description" content="' + esc(s.description) + '"><meta name="twitter:image" content="' + esc(abs(cfg, s.image)) + '">' +
      '<link rel="icon" href="' + esc(U(b.favicon || "favicon.svg")) + '" type="image/svg+xml">' +
      '<link rel="preload" href="/assets/fonts/space-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>' +
      (gf ? '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" id="gfonts" href="' + esc(gf) + '">' : "") +
      '<style id="fonts-css">' + fontFaces() + '</style><script>(' + fileBoot.toString() + ")(" + (page === "case" && slug ? 2 : 0) + ')</script><link rel="stylesheet" href="/css/site.min.css"><style id="theme-css">' + themeCss(cfg) + '</style>' + jsonLd(cfg, page, slug);
  }

  /* ---------- full document (used by build.js) ---------- */
  function pageHtml(cfg, page, slug) {
    return '<!DOCTYPE html><html lang="en" class="no-js" data-layout="' + layoutOf(cfg) + '"><head>' + headTags(cfg, page, slug) + "<script>document.documentElement.className='js'</script></head>" +
      '<body data-page="' + page + '"' + (slug ? ' data-slug="' + esc(slug) + '"' : "") + ' data-rev="' + hash(cfg) + '"><a class="skip" href="#main">Skip to content</a><header class="hdr" id="hdr">' + header(cfg, page) + '</header><main id="main">' + (P[page] || P.notfound)(cfg, slug) + '</main><footer class="ftr" id="ftr">' + footer(cfg) + '</footer><div class="floaters" id="floaters">' + floaters(cfg) + '</div>' +
      '<script src="/js/config.js" defer></script><script src="/js/render.js" defer></script><script src="/js/site.js" defer></script></body></html>';
  }

  return { layout: layoutOf, esc: esc, hash: hash, icon: icon, header: header, footer: footer, floaters: floaters, main: function (cfg, page, slug) { return (P[page] || P.notfound)(cfg, slug); }, seoFor: seoFor, themeCss: themeCss, googleFontsHref: googleFontsHref, pathFor: pathFor, pageHtml: pageHtml, PATHS: PATHS };
});
