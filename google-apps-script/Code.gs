/**
 * =========================================================================
 * ASCII Solutions – ব্যাকএন্ড (Google Apps Script)
 * কাজ: Contact-form Leads, ভিজিটর অ্যাক্টিভিটি, Pixel ইভেন্ট, Report, Dashboard,
 *       অ্যাডমিন লগইন (সার্ভারে যাচাই), কনটেন্ট প্রকাশ, ছবি আপলোড (Google Drive), Analytics
 * পুরোনো Orders সংরক্ষণের কোড অক্ষত রাখা আছে (আগের শিট/ফরম্যাট ভাঙেনি)।
 * =========================================================================
 *
 * 🚀 সেটআপ: admin.html ➔ "Google Sheet ও API" পেজে শিটের লিংক ও অ্যাডমিন পাসওয়ার্ড দিয়ে
 *    "Code.gs তৈরি করুন" চাপুন, কপি করা কোড এখানে পেস্ট করুন, তারপর:
 *    ১. Save 💾   ২. setupAll ▶ Run (Permission দিন)   ৩. Deploy ➔ New deployment ➔ Web app
 *       (Execute as: Me, Access: Anyone)   ৪. /exec লিংক admin এর API ঘরে বসান
 *    কোড বদলালে: Deploy ➔ Manage deployments ➔ ✏️ ➔ New version ➔ Deploy (লিংক একই থাকে)
 * =========================================================================
 */


/* =========================================================================
   ১. সেটিংস (শুধু এই অংশ এডিট করুন)
   ========================================================================= */

// আপনার গুগল শিটের লিংক অথবা আইডি (admin.html এর "Google Sheet ও API" পেজ থেকে Code.gs তৈরি করলে এটি নিজেই বসে যায়)
// খালি রাখলে: যে শিট থেকে Extensions → Apps Script খুলেছেন সেটিই ব্যবহার হবে
var SPREADSHEET_ID = "";

// 🌐 আপনার Vercel ওয়েবসাইটের লিংক (যেমন: https://my-honey.vercel.app)
//    এটি দিলে অর্ডারের দাম সবসময় ওয়েবসাইটের js/config.js থেকে যাচাই হয়, তাই
//    admin.html এ দাম বদলালে এখানে আলাদা করে কিছু বদলাতে হয় না।
//    খালি রাখলে নিচের ডিফল্ট দাম (PRODUCTS_CONFIG) ব্যবহার হবে।
var SITE_URL = "";

// 🔐 অ্যাডমিন পাসওয়ার্ড (সার্ভারে যাচাই হয়)। এখানে পাসওয়ার্ড লেখা থাকে না, শুধু SHA-256 হ্যাশ থাকে।
//    admin.html এর Setup পেজ এই দুটি লাইন নিজেই পূরণ করে দেয়।
var ADMIN_SALT = "";
var ADMIN_HASH = "";

// ছবি আপলোডের জন্য Google Drive ফোল্ডারের নাম
var DRIVE_FOLDER_NAME = "ASCII Solutions Assets";

// অর্ডার জমা হওয়ার ট্যাবের নাম
var SHEET_NAME = "Orders";

// টাকার প্রতীক ও টাইমজোন
var CURRENCY = "৳";
var TIMEZONE = "Asia/Dhaka";

// ফ্রড/স্প্যাম প্রটেকশন: একই নাম্বার থেকে কত মিনিট পর আবার অর্ডার করা যাবে
var FRAUD_PROTECTION = { enabled: true, cooldownMinutes: 2 };   // একই নাম্বারে ২ মিনিটের মধ্যে আবার অর্ডার করলে ফ্রড এলার্ট

// ভিজিটর ট্র্যাকিং: প্রতি মিনিটে সর্বোচ্চ কতটি ট্র্যাকিং রিকোয়েস্ট নেওয়া হবে (অর্ডারকে অগ্রাধিকার দিতে)
var TRACK_LIMIT_PER_MIN = 90;


/* =========================================================================
   ২. ডিফল্ট পণ্য ও ডেলিভারি (SITE_URL খালি থাকলে এগুলোই ব্যবহার হবে)
   ========================================================================= */
var PRODUCTS_CONFIG = {
  "m500":   { name: "খাঁটি মধু – ৫০০ গ্রাম",                         price: 550 },
  "m1000":  { name: "খাঁটি মধু – ১ কেজি",                            price: 1050 },
  "hn500":  { name: "প্রিমিয়াম হানি নাট – ৫০০ গ্রাম",                 price: 650 },
  "hn1000": { name: "প্রিমিয়াম হানি নাট – ১ কেজি",                    price: 1250 },
  "combo":  { name: "মেগা কম্বো (১ কেজি মধু + ১ কেজি হানি নাট)",      price: 2200 }
};
var SHIPPING_CONFIG = {
  "dhaka":   { label: "ঢাকার ভিতরে",  charge: 60 },
  "outside": { label: "ঢাকার বাইরে", charge: 120 }
};
var FREE_SHIPPING_MIN_TOTAL = 0;
var MAX_QTY_PER_ITEM = 20;


/* =========================================================================
   ৩. শিটের কলাম ও স্ট্যাটাস
   ========================================================================= */
var HEADERS = [
  "Order ID", "Date & Time", "Customer Name", "Phone Number", "District / Area",
  "Full Address", "Ordered Products", "Total Items (Qty)", "Products Subtotal",
  "Delivery Method", "Delivery Charge", "Grand Total Bill", "Customer Note", "Order Status", "Traffic Source"
];
var COL_WIDTHS = [140, 165, 170, 130, 125, 250, 280, 100, 130, 125, 120, 140, 190, 120, 160];
var STATUS_COL = 14;                  // Order Status কলামের নম্বর (N)
var STATUSES = ["New", "Processing", "Delivered", "Cancelled"];
var FORMAT_ROWS = 3000;               // কতগুলো সারি আগে থেকেই সুন্দর ফরম্যাটে রাখা হবে
var DASH_SHEET = "Dashboard";
var LEADS_SHEET = "Leads";
var SETTINGS_SHEET = "Settings";
var CFG_CHUNK = 40000;
var LEAD_HEADERS = ["Lead ID", "Date & Time", "Name", "Phone", "Email", "Company", "Service Interest", "Budget", "Message", "Package", "Source Page", "Traffic Source", "Status", "Notes"];
var LEAD_WIDTHS = [150, 165, 170, 130, 190, 150, 180, 140, 340, 110, 130, 150, 120, 240];
var LEAD_STATUSES = ["New", "Contacted", "Won", "Lost"];
var LEAD_STATUS_COL = 13;
var ACT_SHEET = "User Activity";
var PIX_SHEET = "Pixel Events";
var REPORT_SHEET = "Report";


/* =========================================================================
   ৪. একবার চালানোর সেটআপ ("setupAll" সিলেক্ট করে ▶ Run)
   ========================================================================= */
function setupAll() {
  var ss = getSS_();
  try { ss.setSpreadsheetTimeZone(TIMEZONE); } catch (e) {}
  if (ss.getSheetByName(SHEET_NAME)) formatOrderSheet_(ss.getSheetByName(SHEET_NAME));   // আগের Orders শিট থাকলে ঠিকঠাক রাখা
  getLeadsSheet_(ss, true);
  getActivitySheet_(ss, true);
  getPixelSheet_(ss, true);
  getSettingsSheet_(ss);
  buildReport_(ss);
  buildDashboard_(ss);
  try {
    [LEADS_SHEET, ACT_SHEET, PIX_SHEET, REPORT_SHEET, DASH_SHEET, SETTINGS_SHEET].forEach(function (n, i) {
      var sh = ss.getSheetByName(n); if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); }
    });
  } catch (e2) {}
  SpreadsheetApp.flush();
  Logger.log("✅ সেটআপ সম্পন্ন! Leads, User Activity, Pixel Events, Report, Dashboard ও Settings ট্যাব প্রস্তুত। এবার Deploy করুন।");
}
function runFormatDesign() { setupAll(); }   // পুরোনো নামও কাজ করবে


/* =========================================================================
   ৫. GET (শুধু স্ট্যাটাস) ও POST (অর্ডার গ্রহণ)
   ========================================================================= */
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === "config") {
      var pub = getPublicConfig_();
      return json_({ success: true, rev: pub.rev, settings: pub.settings });
    }
  } catch (err) { return json_({ success: false, error: "config: " + err.message }); }
  return json_({ success: true, message: "API চালু আছে ✅", time: new Date().toISOString() });
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
  } catch (err) {
    return json_({ success: false, error: "রিকোয়েস্ট সঠিক নয়।" });
  }
  var a = data && data.action;
  if (a === "track") return handleTrack_(data);
  if (a === "lead") return handleLead_(data);
  if (a) return handleAdmin_(data);
  return handleOrder_(data);          // পুরোনো Orders প্রবাহ – অপরিবর্তিত
}

/* ---------- অর্ডার ---------- */
function bnNum_(n) { return String(n).replace(/\d/g, function (d) { return "০১২৩৪৫৬৭৮৯"[d]; }); }

function fraudResponse_(phone, existing, minutes) {
  return json_({
    success: false, fraudAlert: true,
    error: "⚠️ ফ্রড এলার্ট (Fraud Alert): এই মোবাইল নাম্বার (" + phone + ") দিয়ে কিছুক্ষণ আগেই একটি অর্ডার (" + existing + ") গ্রহণ করা হয়েছে। আপনার অর্ডারটি প্রক্রিয়াধীন রয়েছে, বারবার অর্ডার পাঠানোর প্রয়োজন নেই। প্রয়োজনে সরাসরি আমাদের নাম্বারে কল করুন। (" + bnNum_(minutes) + " মিনিট পর আবার অর্ডার করা যাবে)"
  });
}

function handleOrder_(data) {
  var cache = CacheService.getScriptCache();
  try {
    // ১) লক ছাড়াই যাচাই (যাতে লকের ভেতরের কাজ খুব ছোট থাকে)
    var cfg = getLiveConfig_();
    var validationError = validateOrder_(data, cfg);
    if (validationError) return json_({ success: false, error: validationError });

    var reqId = String(data.reqId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
    if (reqId) {                                       // একই অর্ডার রিট্রাই হলে আবার সেভ হবে না
      var done = cache.get("req_" + reqId);
      if (done) return ContentService.createTextOutput(done).setMimeType(ContentService.MimeType.JSON);
    }

    var cleanPhone = normPhone_(data.phone);
    var minutes = Math.max(1, Number(cfg.fraudMinutes) || FRAUD_PROTECTION.cooldownMinutes);
    var fraudKey = "honey_guard_" + cleanPhone;
    if (FRAUD_PROTECTION && FRAUD_PROTECTION.enabled) {
      var existing = cache.get(fraudKey);
      if (existing) return fraudResponse_(cleanPhone, existing, minutes);
    }

    var items = parseOrderedItems_(data, cfg);
    if (!items.length) return json_({ success: false, error: "অনুগ্রহ করে কমপক্ষে একটি পণ্য সিলেক্ট করুন।" });

    // দাম সবসময় সার্ভারের কনফিগ থেকে (কাস্টমার ব্রাউজার থেকে নয়)
    var subtotal = 0, totalQty = 0, lines = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i], prod = cfg.products[it.id];
      var lineTotal = prod.price * it.qty;
      subtotal += lineTotal; totalQty += it.qty;
      lines.push(prod.name + " (" + it.qty + "টি - " + CURRENCY + lineTotal + ")");
    }
    var shipInfo = cfg.shipping[data.shippingId];
    var shipCharge = shipInfo.charge;
    if (cfg.freeShippingMin > 0 && subtotal >= cfg.freeShippingMin) shipCharge = 0;
    var grand = subtotal + shipCharge;

    // ২) একসাথে অনেকে অর্ডার করলে লাইনে দাঁড়িয়ে একটি একটি করে সেভ হবে
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(25000)) {
      return json_({ success: false, busy: true, error: "এই মুহূর্তে অনেকে অর্ডার করছেন। কয়েক সেকেন্ড অপেক্ষা করুন, নিজে থেকেই আবার চেষ্টা হবে।" });
    }
    try {
      if (reqId) {
        var done2 = cache.get("req_" + reqId);
        if (done2) return ContentService.createTextOutput(done2).setMimeType(ContentService.MimeType.JSON);
      }
      if (FRAUD_PROTECTION && FRAUD_PROTECTION.enabled) {
        var existing2 = cache.get(fraudKey);
        if (existing2) return fraudResponse_(cleanPhone, existing2, minutes);
      }

      var sheet = getSheet_();
      var orderId = nextOrderId_();
      var row = sheet.getLastRow() + 1;
      ensureCapacity_(sheet, row);

      var rowValues = [
        orderId, new Date(), clean_(data.name, 100), cleanPhone, clean_(data.district, 80), clean_(data.address, 350),
        lines.join(",\n"), totalQty, subtotal, shipInfo.label, shipCharge, grand,
        clean_(data.note || "কোনো নোট নেই", 300), "New", clean_(data.source || "direct", 80)
      ];
      sheet.getRange(row, 4).setNumberFormat("@");                     // ফোনের শুরুর ০ যেন না কাটে
      sheet.getRange(row, 1, 1, HEADERS.length).setValues([rowValues]);

      var result = { success: true, orderId: orderId, subtotal: subtotal, deliveryCharge: shipCharge, total: grand, itemsCount: totalQty, message: "আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে!" };
      try { cache.put(fraudKey, orderId, Math.max(60, minutes * 60)); } catch (c1) {}
      if (reqId) { try { cache.put("req_" + reqId, JSON.stringify(result), 600); } catch (c2) {} }
      return json_(result);
    } finally {
      try { lock.releaseLock(); } catch (x) {}
    }
  } catch (err) {
    return json_({ success: false, error: "সার্ভারে সাময়িক সমস্যা হয়েছে: " + err.message });
  }
}


/* =========================================================================
   ভিজিটর অ্যাক্টিভিটি ও Pixel ইভেন্ট সংরক্ষণ (অর্ডারের লকের সাথে সম্পর্কহীন – অর্ডার ধীর হয় না)
   ========================================================================= */
var PIXEL_EVENTS = { PageView: 1, ViewContent: 1, AddToCart: 1, InitiateCheckout: 1, Purchase: 1, Lead: 1, Contact: 1, CTAClick: 1, FormStart: 1, FormSubmit: 1, FormSuccess: 1, FormError: 1 };

function yn_(v) { return v ? "Yes" : "No"; }
function num_(v, max) { var n = Number(v); return isNaN(n) ? 0 : Math.max(0, Math.min(max || 1e9, Math.round(n))); }

function handleTrack_(d) {
  var sid = String(d.sid || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  var a = d.a;
  if (!sid || !a || typeof a !== "object") return json_({ success: true, skipped: true });

  var cache = CacheService.getScriptCache();
  var mk = "trk_" + Utilities.formatDate(new Date(), TIMEZONE, "yyMMddHHmm");
  var n = parseInt(cache.get(mk) || "0", 10);
  if (n >= TRACK_LIMIT_PER_MIN) return json_({ success: true, skipped: true });
  try { cache.put(mk, String(n + 1), 90); } catch (e0) {}

  var lock = LockService.getDocumentLock();            // অর্ডারের (Script) লক থেকে আলাদা
  if (!lock.tryLock(4000)) return json_({ success: true, skipped: true });
  try {
    var ss = getSS_(), now = new Date();
    var act = getActivitySheet_(ss, false);
    var evNames = [];
    var evs = Array.isArray(d.ev) ? d.ev.slice(0, 20) : [];
    for (var k = 0; k < evs.length; k++) if (evs[k] && PIXEL_EVENTS[evs[k].n]) evNames.push(evs[k].n);

    var cached = cache.get("act_" + sid);
    var vals = [
      now, sid, clean_(a.src || "direct", 80), clean_(a.med, 60), clean_(a.camp, 80), clean_(a.ref, 80), clean_(a.dev, 20), clean_(a.scr, 20),
      clean_(a.land || "/", 80), num_(a.scroll, 100), num_(a.secs, 86400), num_(a.cta, 999), yn_(a.vs), yn_(a.chk), yn_(a.form), yn_(a.ord), clean_(a.oid, 40),
      "", now, clean_(a.lang, 20), num_(a.pv, 999), clean_(a.sv, 200), clean_(a.fe, 120)
    ];
    var row = cached ? parseInt(cached.split("|")[0], 10) : 0;
    var seen = cached ? cached.split("|").slice(1).join("|") : "";
    if (row > 1 && String(act.getRange(row, 2).getValue()) === sid) {
      var merged = (seen ? seen.split(",") : []).concat(evNames);
      vals[17] = merged.join(",");
      act.getRange(row, 2, 1, vals.length - 1).setValues([vals.slice(1)]);
      try { cache.put("act_" + sid, row + "|" + vals[17], 21600); } catch (e1) {}
    } else {
      row = act.getLastRow() + 1;
      ensureRows_(act, row, function (start, cnt) { fmtActivity_(act, start, cnt); });
      vals[17] = evNames.join(",");
      act.getRange(row, 1, 1, vals.length).setValues([vals]);
      try { cache.put("act_" + sid, row + "|" + vals[17], 21600); } catch (e2) {}
    }

    var out = [];
    for (var m = 0; m < evs.length; m++) {
      var ev = evs[m];
      if (!ev || !PIXEL_EVENTS[ev.n]) continue;
      out.push([now, sid, ev.n, num_(ev.v, 1e8), "BDT", clean_(ev.c, 80), clean_(ev.o, 40), clean_(a.src || "direct", 80), clean_(a.dev, 20)]);
    }
    if (out.length) {
      var pix = getPixelSheet_(ss, false), pr = pix.getLastRow() + 1;
      ensureRows_(pix, pr + out.length, function (start, cnt) { fmtPixel_(pix, start, cnt); });
      pix.getRange(pr, 1, out.length, 9).setValues(out);
    }
    return json_({ success: true });
  } catch (err) {
    return json_({ success: false, error: "tracking: " + err.message });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}


/* =========================================================================
   ৬. দাম ও ডেলিভারি যাচাই (ওয়েবসাইটের js/config.js থেকে – এক জায়গা থেকেই সব)
   ========================================================================= */
function defaultLiveConfig_() {
  var products = {}, shipping = {}, k;
  for (k in PRODUCTS_CONFIG) products[k] = { name: PRODUCTS_CONFIG[k].name, price: PRODUCTS_CONFIG[k].price, active: true };
  for (k in SHIPPING_CONFIG) shipping[k] = { label: SHIPPING_CONFIG[k].label, charge: SHIPPING_CONFIG[k].charge };
  return { products: products, shipping: shipping, freeShippingMin: FREE_SHIPPING_MIN_TOTAL, maxQty: MAX_QTY_PER_ITEM, fraudMinutes: FRAUD_PROTECTION.cooldownMinutes };
}

function getLiveConfig_() {
  var url = String(SITE_URL || "").replace(/\/+$/, "");
  if (!url) return defaultLiveConfig_();

  var cache = CacheService.getScriptCache();
  var hit = cache.get("live_cfg");
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }

  try {
    var res = UrlFetchApp.fetch(url + "/js/config.js?t=" + new Date().getTime(), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error("config.js পাওয়া যায়নি (" + res.getResponseCode() + ")");
    var txt = res.getContentText();
    var c = JSON.parse(txt.substring(txt.indexOf("{"), txt.lastIndexOf("}") + 1));

    var out = defaultLiveConfig_();
    if (c.products && c.products.length) {
      out.products = {};
      for (var i = 0; i < c.products.length; i++) {
        var p = c.products[i];
        if (!p || !p.id) continue;
        out.products[p.id] = { name: String(p.name || p.id), price: Number(p.price) || 0, active: p.active !== false };
      }
    }
    if (c.shipping && c.shipping.length) {
      out.shipping = {};
      for (var j = 0; j < c.shipping.length; j++) {
        var sh = c.shipping[j];
        if (!sh || !sh.id) continue;
        out.shipping[sh.id] = { label: String(sh.label || sh.id), charge: Number(sh.charge) || 0 };
      }
    }
    if (c.freeShippingMinTotal !== undefined) out.freeShippingMin = Number(c.freeShippingMinTotal) || 0;
    if (c.maxQty !== undefined) out.maxQty = Number(c.maxQty) || MAX_QTY_PER_ITEM;
    if (c.fraudMinutes !== undefined) out.fraudMinutes = Number(c.fraudMinutes) || FRAUD_PROTECTION.cooldownMinutes;
    if (c.form && c.form.cooldownMinutes !== undefined) out.formCooldown = Number(c.form.cooldownMinutes) || 2;
    try { cache.put("live_cfg", JSON.stringify(out), 60); } catch (e2) {}
    return out;
  } catch (err) {
    return defaultLiveConfig_();       // ওয়েবসাইট না পেলে ডিফল্ট দাম
  }
}


/* =========================================================================
   ৭. অর্ডার সংক্রান্ত ফাংশন
   ========================================================================= */
function parseOrderedItems_(d, cfg) {
  var items = [];
  if (Array.isArray(d.items)) {
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i];
      if (it && it.id && cfg.products[it.id] && cfg.products[it.id].active) {
        var q = parseInt(it.qty, 10);
        if (!isNaN(q) && q > 0) items.push({ id: it.id, qty: Math.min(q, cfg.maxQty) });
      }
    }
  }
  return items;
}

function validateOrder_(d, cfg) {
  if (!d || typeof d !== "object") return "অর্ডার রিকোয়েস্ট সঠিক নয়।";
  if (!d.name || String(d.name).trim().length < 2) return "অনুগ্রহ করে আপনার সঠিক নাম লিখুন।";
  if (!/^01[3-9]\d{8}$/.test(normPhone_(d.phone))) return "১১ ডিজিটের সঠিক মোবাইল নাম্বার দিন (যেমন: 01712345678)।";
  if (!d.district || String(d.district).trim().length < 2) return "আপনার জেলা বা এলাকার নাম দিন।";
  if (!d.address || String(d.address).trim().length < 6) return "সম্পূর্ণ বিস্তারিত ঠিকানা লিখুন।";
  if (!cfg.shipping[d.shippingId]) return "ডেলিভারি এলাকা নির্বাচন সঠিক নয়।";
  return null;
}

function normPhone_(v) {
  var s = String(v || "").replace(/[\s\-()]/g, "");
  s = s.replace(/[০-৯]/g, function (c) { return "০১২৩৪৫৬৭৮৯".indexOf(c); });
  return s.replace(/^\+?88/, "");
}

function clean_(v, maxLen) {
  var s = String(v == null ? "" : v).replace(/[\u0000-\u001f]+/g, " ").trim();
  if (maxLen && s.length > maxLen) s = s.substring(0, maxLen);
  return /^[=+\-@]/.test(s) ? "'" + s : s;       // শিট ফর্মুলা ইনজেকশন প্রতিরোধ
}

function nextOrderId_() {
  var day = Utilities.formatDate(new Date(), TIMEZONE, "yyMMdd");
  var props = PropertiesService.getScriptProperties();
  var key = "seq_" + day;
  var n = parseInt(props.getProperty(key) || "0", 10) + 1;
  props.setProperty(key, String(n));
  return "HN-" + day + "-" + ("000" + n).slice(-4);
}


/* =========================================================================
   ৮. গুগল শিট কানেকশন ও সুন্দর ফরম্যাটিং
   ========================================================================= */
function getSS_() {
  var rawId = String(SPREADSHEET_ID || "").trim(), ss;
  if (rawId) {
    var m = rawId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    try { ss = SpreadsheetApp.openById(m ? m[1] : rawId); }
    catch (e) { throw new Error("SPREADSHEET_ID ভুল বা অনুমতি নেই। (" + e.message + ")"); }
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) throw new Error("গুগল শিট পাওয়া যায়নি। SPREADSHEET_ID দিন।");
  return ss;
}

function getSheet_() {
  var ss = getSS_();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    var all = ss.getSheets();
    if (all.length && all[0].getLastRow() <= 1 && all[0].getName() !== DASH_SHEET) {
      all[0].setName(SHEET_NAME);
      sheet = all[0];
    }
  }
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0 || String(sheet.getRange(1, 1).getValue()) !== HEADERS[0]) {
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      formatOrderSheet_(sheet);
      try { buildDashboard_(ss); } catch (e) {}
    } else {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    }
  }
  return sheet;
}

function ensureCapacity_(sheet, row) {
  var max = sheet.getMaxRows();
  if (row > max - 5) {
    sheet.insertRowsAfter(max, 1000);
    applyColumnFormats_(sheet, max + 1, 1000);
  }
}

function applyColumnFormats_(sheet, startRow, numRows) {
  var n = HEADERS.length;
  function col(c) { return sheet.getRange(startRow, c, numRows, 1); }
  sheet.getRange(startRow, 1, numRows, n).setFontFamily("Segoe UI").setFontSize(10).setVerticalAlignment("middle");
  col(1).setHorizontalAlignment("center").setFontWeight("bold").setFontColor("#1E293B");
  col(2).setHorizontalAlignment("center").setNumberFormat("dd-mmm-yyyy hh:mm AM/PM");
  col(3).setHorizontalAlignment("left").setFontWeight("bold").setFontColor("#0F172A");
  col(4).setHorizontalAlignment("center").setNumberFormat("@");
  col(5).setHorizontalAlignment("center");
  col(6).setHorizontalAlignment("left").setWrap(true);
  col(7).setHorizontalAlignment("left").setWrap(true);
  col(8).setHorizontalAlignment("center").setFontWeight("bold");
  col(9).setHorizontalAlignment("right").setNumberFormat('"৳"#,##0');
  col(10).setHorizontalAlignment("center");
  col(11).setHorizontalAlignment("right").setNumberFormat('"৳"#,##0');
  col(12).setHorizontalAlignment("right").setFontWeight("bold").setFontColor("#0F5132").setBackground("#E6F4EA").setNumberFormat('"৳"#,##0');
  col(13).setHorizontalAlignment("left").setWrap(true);
  col(15).setHorizontalAlignment("left");
  col(14).setHorizontalAlignment("center").setFontWeight("bold")
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build());
}

function formatOrderSheet_(sheet) {
  var n = HEADERS.length;
  var maxRows = sheet.getMaxRows();
  if (maxRows < FORMAT_ROWS) sheet.insertRowsAfter(maxRows, FORMAT_ROWS - maxRows);
  var total = sheet.getMaxRows();

  for (var c = 0; c < COL_WIDTHS.length; c++) sheet.setColumnWidth(c + 1, COL_WIDTHS[c]);

  // হেডার
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
  sheet.setRowHeight(1, 42);
  sheet.getRange(1, 1, 1, n).setValues([HEADERS])
    .setFontWeight("bold").setFontSize(11).setFontFamily("Segoe UI")
    .setBackground("#0F5132").setFontColor("#FFFFFF")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);

  // ডাটা সারির কলাম ফরম্যাট (একবারেই – অর্ডার সাবমিট তাই দ্রুত হয়)
  applyColumnFormats_(sheet, 2, total - 1);
  sheet.getRange(2, 1, total - 1, n).setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);

  // জেব্রা স্ট্রাইপ (ব্যান্ডিং) – নতুন সারিতেও নিজে থেকে প্রযোজ্য
  try {
    var banded = sheet.getBandings();
    for (var b = 0; b < banded.length; b++) banded[b].remove();
    sheet.getRange(2, 1, total - 1, n).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
      .setFirstRowColor("#FFFFFF").setSecondRowColor("#F8FAFC");
  } catch (e) {}

  // ফিল্টার
  try {
    var f = sheet.getFilter();
    if (f) f.remove();
    sheet.getRange(1, 1, total, n).createFilter();
  } catch (e2) {}

  // স্ট্যাটাস কালার
  var range = sheet.getRange(2, STATUS_COL, total - 1, 1);
  var defs = [["New", "#FEF3C7", "#92400E"], ["Processing", "#DBEAFE", "#1E40AF"], ["Delivered", "#D1FAE5", "#065F46"], ["Cancelled", "#FEE2E2", "#991B1B"]];
  var rules = [];
  for (var i = 0; i < defs.length; i++) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(defs[i][0]).setBackground(defs[i][1]).setFontColor(defs[i][2]).setRanges([range]).build());
  }
  sheet.setConditionalFormatRules(rules);

  // ট্যাব রঙ
  try { sheet.setTabColor("#0F5132"); } catch (e3) {}
}


/* =========================================================================
   ৮খ. User Activity, Pixel Events ও Report ট্যাব
   ========================================================================= */
var ACT_HEADERS = ["Date & Time", "Session ID", "Source", "Medium", "Campaign", "Referrer", "Device", "Screen", "Landing Page",
  "Max Scroll %", "Time on Page (sec)", "Order Btn Clicks", "Video Sound On", "Reached Checkout", "Started Form", "Ordered", "Order ID", "Pixel Events", "Last Update",
  "Language", "Pages Viewed", "Sections Viewed", "Form Events"];
var ACT_WIDTHS = [165, 150, 120, 100, 130, 130, 90, 90, 110, 100, 120, 110, 110, 120, 105, 90, 140, 260, 165, 90, 100, 300, 200];
var PIX_HEADERS = ["Date & Time", "Session ID", "Event", "Value", "Currency", "Content IDs", "Order ID", "Source", "Device"];
var PIX_WIDTHS = [165, 150, 140, 100, 80, 160, 140, 130, 90];

function ensureRows_(sheet, row, fmt) {
  var max = sheet.getMaxRows();
  if (row > max - 5) {
    sheet.insertRowsAfter(max, 1500);
    if (fmt) fmt(max + 1, 1500);
  }
}

function styleHeader_(sh, headers, widths, color) {
  for (var c = 0; c < widths.length; c++) sh.setColumnWidth(c + 1, widths[c]);
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 40);
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight("bold").setFontSize(11).setFontFamily("Segoe UI")
    .setBackground(color).setFontColor("#FFFFFF")
    .setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
  try { sh.setTabColor(color); } catch (e) {}
}

function fmtActivity_(sh, start, count) {
  sh.getRange(start, 1, count, ACT_HEADERS.length).setFontFamily("Segoe UI").setFontSize(10).setVerticalAlignment("middle").setHorizontalAlignment("center");
  sh.getRange(start, 1, count, 1).setNumberFormat("dd-mmm-yyyy hh:mm AM/PM");
  sh.getRange(start, 19, count, 1).setNumberFormat("dd-mmm-yyyy hh:mm AM/PM");
  sh.getRange(start, 10, count, 1).setNumberFormat('0"%"');
  sh.getRange(start, 11, count, 1).setNumberFormat("0");
  sh.getRange(start, 9, count, 1).setHorizontalAlignment("left");
  sh.getRange(start, 18, count, 1).setHorizontalAlignment("left");
}
function getActivitySheet_(ss, force) {
  ss = ss || getSS_();
  var sh = ss.getSheetByName(ACT_SHEET), fresh = false;
  if (!sh) { sh = ss.insertSheet(ACT_SHEET); fresh = true; }
  if (fresh || force) {
    var total = Math.max(sh.getMaxRows(), 3000);
    if (sh.getMaxRows() < total) sh.insertRowsAfter(sh.getMaxRows(), total - sh.getMaxRows());
    styleHeader_(sh, ACT_HEADERS, ACT_WIDTHS, "#1E40AF");
    try {
      sh.getRange(1, 12).setNote("Agency site: কতবার যেকোনো CTA/Call/WhatsApp/Messenger বাটনে ক্লিক হয়েছে");
      sh.getRange(1, 13).setNote("Agency site: ব্যবহার হয় না (সবসময় No) – পুরোনো কাঠামো ঠিক রাখতে রাখা");
      sh.getRange(1, 14).setNote("Agency site: Contact সেকশন/ফর্ম দেখেছে কিনা");
      sh.getRange(1, 16).setNote("Agency site: Contact form সফলভাবে জমা দিয়েছে কিনা (Lead)");
      sh.getRange(1, 17).setNote("Agency site: Lead ID");
    } catch (en) {}
    fmtActivity_(sh, 2, sh.getMaxRows() - 1);
    try {
      var f = sh.getFilter(); if (f) f.remove();
      sh.getRange(1, 1, sh.getMaxRows(), ACT_HEADERS.length).createFilter();
      var rule = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Yes").setBackground("#D1FAE5").setFontColor("#065F46")
        .setRanges([sh.getRange(2, 13, sh.getMaxRows() - 1, 4)]).build();
      sh.setConditionalFormatRules([rule]);
    } catch (e) {}
  }
  return sh;
}

function fmtPixel_(sh, start, count) {
  sh.getRange(start, 1, count, PIX_HEADERS.length).setFontFamily("Segoe UI").setFontSize(10).setVerticalAlignment("middle").setHorizontalAlignment("center");
  sh.getRange(start, 1, count, 1).setNumberFormat("dd-mmm-yyyy hh:mm AM/PM");
  sh.getRange(start, 4, count, 1).setNumberFormat('"৳"#,##0');
}
function getPixelSheet_(ss, force) {
  ss = ss || getSS_();
  var sh = ss.getSheetByName(PIX_SHEET), fresh = false;
  if (!sh) { sh = ss.insertSheet(PIX_SHEET); fresh = true; }
  if (fresh || force) {
    var total = Math.max(sh.getMaxRows(), 5000);
    if (sh.getMaxRows() < total) sh.insertRowsAfter(sh.getMaxRows(), total - sh.getMaxRows());
    styleHeader_(sh, PIX_HEADERS, PIX_WIDTHS, "#7C3AED");
    fmtPixel_(sh, 2, sh.getMaxRows() - 1);
    try {
      var f = sh.getFilter(); if (f) f.remove();
      sh.getRange(1, 1, sh.getMaxRows(), PIX_HEADERS.length).createFilter();
      var defs = [["Purchase", "#D1FAE5", "#065F46"], ["InitiateCheckout", "#FEF3C7", "#92400E"], ["AddToCart", "#DBEAFE", "#1E40AF"]];
      var rules = [];
      for (var i = 0; i < defs.length; i++) rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(defs[i][0]).setBackground(defs[i][1]).setFontColor(defs[i][2]).setRanges([sh.getRange(2, 3, sh.getMaxRows() - 1, 1)]).build());
      sh.setConditionalFormatRules(rules);
    } catch (e) {}
  }
  return sh;
}

/** Report ট্যাব: গত ১৪ দিনের ভিজিটর, অর্ডার, বিক্রি, কনভার্সন – সব ফর্মুলায় নিজে নিজে আপডেট হয় */
function buildReport_(ss) {
  var sh = ss.getSheetByName(REPORT_SHEET);
  if (!sh) sh = ss.insertSheet(REPORT_SHEET);
  sh.clear();
  sh.setHiddenGridlines(true);
  sh.setColumnWidths(1, 1, 24);
  sh.setColumnWidths(2, 8, 125);
  var L = "'" + LEADS_SHEET + "'!", A = "'" + ACT_SHEET + "'!", P = "'" + PIX_SHEET + "'!";

  sh.getRange("B2").setValue("📈 রিপোর্ট (গত ১৪ দিন)").setFontSize(20).setFontWeight("bold").setFontColor("#0F5132");
  sh.getRange("B3").setValue("ভিজিটর = User Activity, Leads = Leads ট্যাব, Pixel Lead = Pixel Events ট্যাব").setFontColor("#64748B").setFontSize(10);

  var heads = ["তারিখ", "ভিজিটর", "Contact সেকশনে পৌঁছেছে", "Leads", "Won", "কনভার্সন %", "ফর্ম শুরু করেছে", "Pixel Lead"];
  sh.getRange(5, 2, 1, heads.length).setValues([heads]).setFontWeight("bold").setBackground("#0F5132").setFontColor("#FFFFFF").setHorizontalAlignment("center").setWrap(true);
  sh.setRowHeight(5, 38);
  var rows = [];
  for (var k = 0; k < 14; k++) {
    var r = 6 + k, d = "$B" + r;
    var act = A + "$A$2:$A", led = L + "$B$2:$B", pix = P + "$A$2:$A";
    rows.push([
      "=TODAY()-" + k,
      "=COUNTIFS(" + act + ",\">=\"&" + d + "," + act + ",\"<\"&" + d + "+1)",
      "=COUNTIFS(" + act + ",\">=\"&" + d + "," + act + ",\"<\"&" + d + "+1," + A + "$N$2:$N,\"Yes\")",
      "=COUNTIFS(" + led + ",\">=\"&" + d + "," + led + ",\"<\"&" + d + "+1)",
      "=COUNTIFS(" + led + ",\">=\"&" + d + "," + led + ",\"<\"&" + d + "+1," + L + "$M$2:$M,\"Won\")",
      "=IFERROR(E" + r + "/C" + r + ",0)",
      "=COUNTIFS(" + act + ",\">=\"&" + d + "," + act + ",\"<\"&" + d + "+1," + A + "$O$2:$O,\"Yes\")",
      "=COUNTIFS(" + pix + ",\">=\"&" + d + "," + pix + ",\"<\"&" + d + "+1," + P + "$C$2:$C,\"Lead\")"
    ]);
  }
  sh.getRange(6, 2, 14, 8).setFormulas(rows).setHorizontalAlignment("center");
  sh.getRange(6, 2, 14, 1).setNumberFormat("dd-mmm-yyyy (ddd)");
  sh.getRange(6, 7, 14, 1).setNumberFormat("0.0%");
  sh.getRange("B20").setValue("মোট");
  sh.getRange("C20:F20").setFormulas([["=SUM(C6:C19)", "=SUM(D6:D19)", "=SUM(E6:E19)", "=SUM(F6:F19)"]]);
  sh.getRange("G20").setFormula("=IFERROR(E20/C20,0)");
  sh.getRange("H20:I20").setFormulas([["=SUM(H6:H19)", "=SUM(I6:I19)"]]);
  sh.getRange("B20:I20").setFontWeight("bold").setBackground("#E6F4EA").setHorizontalAlignment("center");
  sh.getRange("G20").setNumberFormat("0.0%");
  sh.getRange("B5:I20").setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);

  sh.getRange("B23").setValue("🌐 ভিজিটর সোর্স").setFontWeight("bold").setFontSize(13);
  sh.getRange("B24").setFormula("=IFERROR(QUERY(" + A + "A1:W,\"select C, count(B) where C <> '' group by C order by count(B) desc limit 10 label C 'সোর্স', count(B) 'ভিজিটর'\",1),\"এখনো কোনো ডাটা নেই\")");
  sh.getRange("E23").setValue("📩 সোর্স অনুযায়ী Leads").setFontWeight("bold").setFontSize(13);
  sh.getRange("E24").setFormula("=IFERROR(QUERY(" + L + "A1:N,\"select L, count(A) where A <> '' group by L order by count(A) desc limit 10 label L 'সোর্স', count(A) 'Leads'\",1),\"এখনো কোনো Lead নেই\")");
  sh.getRange("I23").setValue("📱 ডিভাইস").setFontWeight("bold").setFontSize(13);
  sh.getRange("I24").setFormula("=IFERROR(QUERY(" + A + "A1:W,\"select G, count(B) where G <> '' group by G order by count(B) desc label G 'ডিভাইস', count(B) 'ভিজিটর'\",1),\"এখনো কোনো ডাটা নেই\")");
  sh.getRange("B24:C24").setFontWeight("bold").setBackground("#1E40AF").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  sh.getRange("E24:F24").setFontWeight("bold").setBackground("#0F5132").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  sh.getRange("I24:J24").setFontWeight("bold").setBackground("#7C3AED").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  try { sh.setTabColor("#059669"); } catch (e) {}
}


/* =========================================================================
   ৯. Dashboard ট্যাব (অটো হিসাব – অর্ডার আসার সাথে সাথে আপডেট)
   ========================================================================= */
function buildDashboard_(ss) {
  var sh = ss.getSheetByName(DASH_SHEET);
  if (!sh) sh = ss.insertSheet(DASH_SHEET);
  sh.clear();
  sh.setHiddenGridlines(true);
  sh.setColumnWidths(1, 1, 24);
  sh.setColumnWidths(2, 5, 170);
  var L = "'" + LEADS_SHEET + "'!";

  sh.getRange("B2").setValue("📊 Leads ড্যাশবোর্ড").setFontSize(20).setFontWeight("bold").setFontColor("#0F5132");
  sh.getRange("B3").setValue("এই পাতা নিজে থেকে আপডেট হয় – কিছু এডিট করার দরকার নেই").setFontColor("#64748B").setFontSize(10);
  var cards = [
    ["মোট Leads", "=COUNTA(" + L + "A2:A)", "#EFF6FF", "#1E40AF"],
    ["আজকের Leads", "=COUNTIFS(" + L + "B2:B,\">=\"&TODAY())", "#FEF3C7", "#92400E"],
    ["নতুন (উত্তর বাকি)", "=COUNTIF(" + L + "M2:M,\"New\")", "#FEE2E2", "#991B1B"],
    ["Won (কাজ পেয়েছি)", "=COUNTIF(" + L + "M2:M,\"Won\")", "#D1FAE5", "#065F46"]
  ];
  for (var i = 0; i < cards.length; i++) {
    sh.getRange(5, 2 + i).setValue(cards[i][0]).setFontSize(10).setFontColor(cards[i][3]).setBackground(cards[i][2]).setHorizontalAlignment("center").setWrap(true);
    sh.getRange(6, 2 + i).setFormula(cards[i][1]).setFontSize(22).setFontWeight("bold").setFontColor(cards[i][3]).setBackground(cards[i][2]).setHorizontalAlignment("center").setNumberFormat("0");
  }
  sh.setRowHeight(5, 34); sh.setRowHeight(6, 56);
  sh.getRange("B9").setValue("📦 Lead স্ট্যাটাস").setFontWeight("bold").setFontSize(13);
  sh.getRange("B10:C10").setValues([["স্ট্যাটাস", "সংখ্যা"]]).setFontWeight("bold").setBackground("#0F5132").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  for (var s = 0; s < LEAD_STATUSES.length; s++) {
    sh.getRange(11 + s, 2).setValue(LEAD_STATUSES[s]);
    sh.getRange(11 + s, 3).setFormula("=COUNTIF(" + L + "M2:M,\"" + LEAD_STATUSES[s] + "\")").setHorizontalAlignment("center").setFontWeight("bold");
  }
  sh.getRange("B11:C14").setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange("E9").setValue("🎯 শীর্ষ সার্ভিস আগ্রহ").setFontWeight("bold").setFontSize(13);
  sh.getRange("E10").setFormula("=IFERROR(QUERY(" + L + "G1:G,\"select G, count(G) where G <> '' group by G order by count(G) desc limit 8 label G 'সার্ভিস', count(G) 'Leads'\",1),\"এখনো কোনো Lead নেই\")");
  sh.getRange("E10:F10").setFontWeight("bold").setBackground("#0F5132").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  sh.getRange("B23").setValue("🕒 সর্বশেষ ৫টি Lead").setFontWeight("bold").setFontSize(13);
  sh.getRange("B24").setFormula("=IFERROR(QUERY(" + L + "A1:N,\"select A, C, G, H, M where A <> '' order by B desc limit 5 label A 'Lead ID', C 'নাম', G 'সার্ভিস', H 'বাজেট', M 'স্ট্যাটাস'\",1),\"এখনো কোনো Lead নেই\")");
  sh.getRange("B24:F24").setFontWeight("bold").setBackground("#0F5132").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  try { sh.setTabColor("#E3A62A"); } catch (e) {}
}


/* =========================================================================
   ১০. সাহায্যকারী
   ========================================================================= */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================================
   Leads (Contact form) – সেভ করা, ভ্যালিডেশন, স্প্যাম প্রটেকশন
   ========================================================================= */
function stripTags_(v) { return String(v == null ? "" : v).replace(/[<>]/g, ""); }
function cl_(v, n) { return clean_(stripTags_(v), n); }

function getLeadsSheet_(ss, force) {
  ss = ss || getSS_();
  var sh = ss.getSheetByName(LEADS_SHEET), fresh = false;
  if (!sh) { sh = ss.insertSheet(LEADS_SHEET); fresh = true; }
  if (fresh || force) {
    var total = Math.max(sh.getMaxRows(), 3000);
    if (sh.getMaxRows() < total) sh.insertRowsAfter(sh.getMaxRows(), total - sh.getMaxRows());
    styleHeader_(sh, LEAD_HEADERS, LEAD_WIDTHS, "#0F5132");
    fmtLeads_(sh, 2, sh.getMaxRows() - 1);
    try {
      var f = sh.getFilter(); if (f) f.remove();
      sh.getRange(1, 1, sh.getMaxRows(), LEAD_HEADERS.length).createFilter();
      var defs = [["New", "#FEF3C7", "#92400E"], ["Contacted", "#DBEAFE", "#1E40AF"], ["Won", "#D1FAE5", "#065F46"], ["Lost", "#FEE2E2", "#991B1B"]], rules = [];
      for (var i = 0; i < defs.length; i++) rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(defs[i][0]).setBackground(defs[i][1]).setFontColor(defs[i][2]).setRanges([sh.getRange(2, LEAD_STATUS_COL, sh.getMaxRows() - 1, 1)]).build());
      sh.setConditionalFormatRules(rules);
    } catch (e) {}
  }
  return sh;
}
function fmtLeads_(sh, start, count) {
  sh.getRange(start, 1, count, LEAD_HEADERS.length).setFontFamily("Segoe UI").setFontSize(10).setVerticalAlignment("middle");
  sh.getRange(start, 1, count, 1).setFontWeight("bold").setHorizontalAlignment("center");
  sh.getRange(start, 2, count, 1).setNumberFormat("dd-mmm-yyyy hh:mm AM/PM").setHorizontalAlignment("center");
  sh.getRange(start, 4, count, 1).setNumberFormat("@").setHorizontalAlignment("center");
  sh.getRange(start, 9, count, 1).setWrap(true);
  sh.getRange(start, 14, count, 1).setWrap(true);
  sh.getRange(start, LEAD_STATUS_COL, count, 1).setHorizontalAlignment("center").setFontWeight("bold")
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(LEAD_STATUSES, true).setAllowInvalid(false).build());
}
function nextLeadId_() {
  var day = Utilities.formatDate(new Date(), TIMEZONE, "yyMMdd"), props = PropertiesService.getScriptProperties(), key = "lseq_" + day;
  var n = parseInt(props.getProperty(key) || "0", 10) + 1; props.setProperty(key, String(n));
  return "LD-" + day + "-" + ("000" + n).slice(-4);
}
function validPhone_(p) { return /^01[3-9]\d{8}$/.test(p) || /^\+\d{8,15}$/.test(p); }

function handleLead_(d) {
  var cache = CacheService.getScriptCache();
  try {
    if (!d || typeof d !== "object") return json_({ success: false, error: "Invalid request." });
    if (d.website) return json_({ success: false, error: "We could not accept this submission." });        // honeypot (no fake success)
    var name = cl_(d.name, 80), phone = normPhone_(d.phone), email = cl_(d.email, 120), msg = cl_(d.message, 1500);
    if (name.length < 2) return json_({ success: false, error: "Please enter your name." });
    if (!validPhone_(phone) && !/^\+\d{8,15}$/.test(String(d.phone || "").replace(/[\s\-()]/g, ""))) return json_({ success: false, error: "Please enter a valid phone number (e.g. 01712345678)." });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json_({ success: false, error: "Please enter a valid email or leave it empty." });
    if (msg.length < 10) return json_({ success: false, error: "Please write at least 10 characters about your project." });

    var reqId = String(d.reqId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
    if (reqId) { var done = cache.get("lreq_" + reqId); if (done) return ContentService.createTextOutput(done).setMimeType(ContentService.MimeType.JSON); }

    var minutes = Math.max(1, Number(getLiveConfig_().formCooldown) || 2);
    var keyP = "lead_guard_" + phone, keyE = email ? "lead_guard_" + email.toLowerCase() : "";
    var hit = cache.get(keyP) || (keyE && cache.get(keyE));
    if (hit) return json_({ success: false, cooldown: true, error: "We already received a request from you a moment ago (ID " + hit + "). Please wait about " + minutes + " minutes before sending another, or call us for urgent changes." });

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(25000)) return json_({ success: false, busy: true, error: "Server is busy, please retry in a few seconds." });
    try {
      if (reqId) { var done2 = cache.get("lreq_" + reqId); if (done2) return ContentService.createTextOutput(done2).setMimeType(ContentService.MimeType.JSON); }
      var hit2 = cache.get(keyP) || (keyE && cache.get(keyE));
      if (hit2) return json_({ success: false, cooldown: true, error: "We already received a request from you a moment ago (ID " + hit2 + ")." });
      var ss = getSS_(), sh = getLeadsSheet_(ss, false);
      var leadId = nextLeadId_(), row = sh.getLastRow() + 1;
      ensureRows_(sh, row, function (start, cnt) { fmtLeads_(sh, start, cnt); });
      var vals = [leadId, new Date(), name, phone, email, cl_(d.company, 100), cl_(d.interest, 80), cl_(d.budget, 60), msg, cl_(d["package"], 60), cl_(d.page, 80), cl_(d.source || "direct", 80), "New", ""];
      sh.getRange(row, 4).setNumberFormat("@");
      sh.getRange(row, 1, 1, LEAD_HEADERS.length).setValues([vals]);
      var result = { success: true, leadId: leadId };
      try { cache.put(keyP, leadId, minutes * 60); if (keyE) cache.put(keyE, leadId, minutes * 60); if (reqId) cache.put("lreq_" + reqId, JSON.stringify(result), 600); } catch (c) {}
      return json_(result);
    } finally { try { lock.releaseLock(); } catch (x) {} }
  } catch (err) {
    return json_({ success: false, error: "Server error, please try again or call us." });
  }
}


/* =========================================================================
   অ্যাডমিন: লগইন (সার্ভারে যাচাই), কনটেন্ট প্রকাশ, ছবি আপলোড, Leads, Analytics
   ========================================================================= */
function sha256Hex_(str) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8), out = "";
  for (var i = 0; i < bytes.length; i++) { var b = (bytes[i] + 256) % 256; out += ("0" + b.toString(16)).slice(-2); }
  return out;
}
function safeEq_(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

function adminLogin_(password) {
  if (!ADMIN_HASH || !ADMIN_SALT) return json_({ success: false, error: "Admin password is not set in Code.gs. Generate Code.gs from admin.html ➔ Setup." });
  var cache = CacheService.getScriptCache();
  var fails = parseInt(cache.get("adm_fail") || "0", 10);
  if (fails >= 6) return json_({ success: false, locked: true, error: "Too many wrong attempts. Try again in 15 minutes." });
  if (!safeEq_(sha256Hex_(ADMIN_SALT + ":" + String(password || "")), ADMIN_HASH)) {
    cache.put("adm_fail", String(fails + 1), 900);
    return json_({ success: false, error: "Wrong password." });
  }
  cache.remove("adm_fail");
  var token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  cache.put("adm_" + token, "1", 21600);
  return json_({ success: true, token: token });
}
function checkToken_(t) { return !!t && String(t).length >= 40 && CacheService.getScriptCache().get("adm_" + t) === "1"; }

function handleAdmin_(d) {
  try {
    if (d.action === "login") return adminLogin_(d.password);
    if (!checkToken_(d.token)) return json_({ success: false, auth: false, error: "Session expired. Please log in again." });
    switch (d.action) {
      case "ping": return json_({ success: true });
      case "logout": CacheService.getScriptCache().remove("adm_" + d.token); return json_({ success: true });
      case "getConfig": var pub = getPublicConfig_(); return json_({ success: true, rev: pub.rev, settings: pub.settings, sheetUrl: getSS_().getUrl() });
      case "saveConfig":
        if (!d.settings || typeof d.settings !== "object" || Array.isArray(d.settings)) return json_({ success: false, error: "Invalid settings." });
        if (JSON.stringify(d.settings).length > 380000) return json_({ success: false, error: "Settings too large." });
        return json_({ success: true, rev: saveSettings_(d.settings) });
      case "uploadImage": return uploadImage_(d);
      case "listLeads": return json_({ success: true, leads: listLeads_(parseInt(d.limit, 10) || 300) });
      case "setLeadStatus": return setLeadField_(d.leadId, "status", d.status);
      case "setLeadNote": return setLeadField_(d.leadId, "note", d.note);
      case "analytics": return json_({ success: true, data: analytics_(parseInt(d.days, 10) || 30) });
      default: return json_({ success: false, error: "Unknown action." });
    }
  } catch (err) { return json_({ success: false, error: "Server error: " + err.message }); }
}

/* ---------- Settings (প্রকাশিত কনটেন্ট) ---------- */
function getSettingsSheet_(ss) {
  ss = ss || getSS_();
  var sh = ss.getSheetByName(SETTINGS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SETTINGS_SHEET);
    sh.getRange(1, 1, 1, 3).setValues([["Key", "Value", "Note"]]).setFontWeight("bold").setBackground("#0F5132").setFontColor("#FFFFFF").setHorizontalAlignment("center");
    sh.setColumnWidth(1, 180); sh.setColumnWidth(2, 420); sh.setColumnWidth(3, 320); sh.setFrozenRows(1);
    sh.getRange(2, 1, 4, 3).setValues([["site_rev", "0", "প্রতিবার Publish করলে নম্বর বদলায়"], ["site_updated", "", "সর্বশেষ প্রকাশের সময়"], ["site_chunks", "1", "কনফিগ কয়টি অংশে সংরক্ষিত"], ["site_config_0", "{}", "⚠️ হাতে এডিট করবেন না – Admin Panel ব্যবহার করুন"]]);
    try { sh.setTabColor("#64748B"); } catch (e) {}
  }
  return sh;
}
function readSettingsRaw_() {
  var sh = getSettingsSheet_(), last = Math.max(2, sh.getLastRow()), vals = sh.getRange(1, 1, last, 2).getValues(), map = {};
  for (var i = 1; i < vals.length; i++) if (vals[i][0]) map[String(vals[i][0])] = String(vals[i][1]);
  var chunks = parseInt(map["site_chunks"] || "1", 10) || 1, json = "";
  for (var c = 0; c < chunks; c++) json += (map["site_config_" + c] || "");
  var obj = {}; try { obj = json ? JSON.parse(json) : {}; } catch (e) { obj = {}; }
  return { settings: obj, rev: map["site_rev"] || "0" };
}
function getPublicConfig_() {
  var cache = CacheService.getScriptCache(), hit = cache.get("pub_cfg");
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var raw = readSettingsRaw_(), out = { settings: raw.settings, rev: raw.rev };
  try { var t = JSON.stringify(out); if (t.length < 95000) cache.put("pub_cfg", t, 300); } catch (e2) {}
  return out;
}
function saveSettings_(settings) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var sh = getSettingsSheet_(), json = JSON.stringify(settings), parts = [];
    for (var p = 0; p < json.length; p += CFG_CHUNK) parts.push(json.substring(p, p + CFG_CHUNK));
    if (!parts.length) parts.push("{}");
    var rev = String(new Date().getTime());
    var rows = [["site_rev", rev, "প্রতিবার Publish করলে নম্বর বদলায়"], ["site_updated", Utilities.formatDate(new Date(), TIMEZONE, "dd-MMM-yyyy hh:mm a"), "সর্বশেষ প্রকাশের সময়"], ["site_chunks", String(parts.length), "কনফিগ কয়টি অংশে সংরক্ষিত"]];
    for (var i = 0; i < parts.length; i++) rows.push(["site_config_" + i, parts[i], "⚠️ হাতে এডিট করবেন না – Admin Panel ব্যবহার করুন"]);
    sh.getRange(2, 1, Math.max(rows.length, sh.getLastRow() - 1), 3).clearContent();
    sh.getRange(2, 1, rows.length, 3).setValues(rows);
    CacheService.getScriptCache().remove("pub_cfg");
    return rev;
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

/* ---------- ছবি আপলোড → Google Drive (সবার জন্য দেখার লিংক) ---------- */
function uploadImage_(d) {
  var mime = String(d.mime || ""), okTypes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  if (!okTypes[mime]) return json_({ success: false, error: "Only JPG, PNG or WebP images are allowed." });
  var b64 = String(d.data || "");
  if (!b64 || b64.length > 2300000) return json_({ success: false, error: "Image is too large (max about 1.6 MB after compression)." });
  var base = String(d.name || "image").toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  var fname = base + "-" + new Date().getTime().toString(36) + "." + okTypes[mime];
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, fname);
  var props = PropertiesService.getScriptProperties(), folder = null, fid = props.getProperty("drive_folder");
  if (fid) { try { folder = DriveApp.getFolderById(fid); } catch (e) { folder = null; } }
  if (!folder) { var it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME); folder = it.hasNext() ? it.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME); props.setProperty("drive_folder", folder.getId()); }
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return json_({ success: true, url: "https://lh3.googleusercontent.com/d/" + file.getId(), id: file.getId() });
}

/* ---------- Leads তালিকা ও আপডেট ---------- */
function listLeads_(limit) {
  var sh = getLeadsSheet_(getSS_(), false), last = sh.getLastRow();
  if (last < 2) return [];
  limit = Math.min(Math.max(limit, 1), 1000);
  var start = Math.max(2, last - limit + 1), vals = sh.getRange(start, 1, last - start + 1, LEAD_HEADERS.length).getValues(), out = [];
  for (var i = vals.length - 1; i >= 0; i--) {
    var r = vals[i]; if (!r[0]) continue;
    out.push({ id: r[0], date: r[1] instanceof Date ? Utilities.formatDate(r[1], TIMEZONE, "dd-MMM-yyyy hh:mm a") : String(r[1]), name: r[2], phone: String(r[3]), email: r[4], company: r[5], interest: r[6], budget: r[7], message: r[8], pkg: r[9], page: r[10], source: r[11], status: r[12] || "New", note: r[13] || "" });
  }
  return out;
}
function setLeadField_(leadId, field, value) {
  var sh = getLeadsSheet_(getSS_(), false), last = sh.getLastRow();
  if (field === "status" && LEAD_STATUSES.indexOf(value) < 0) return json_({ success: false, error: "Invalid status." });
  if (last < 2) return json_({ success: false, error: "Lead not found." });
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(leadId)) {
        sh.getRange(i + 2, field === "status" ? LEAD_STATUS_COL : 14).setValue(field === "status" ? value : cl_(value, 500));
        return json_({ success: true });
      }
    }
  } finally { try { lock.releaseLock(); } catch (x) {} }
  return json_({ success: false, error: "Lead not found." });
}

/* ---------- Analytics (User Activity + Leads থেকে) ---------- */
function analytics_(days) {
  days = Math.min(Math.max(days, 1), 90);
  var ss = getSS_(), tz = TIMEZONE, now = new Date().getTime(), cutoff = now - days * 86400000;
  var act = getActivitySheet_(ss, false), n = act.getLastRow();
  var rows = n > 1 ? act.getRange(2, 1, n - 1, ACT_HEADERS.length).getValues() : [];
  var daily = {}, src = {}, dev = {}, inter = {};
  var t = { visits: 0, secs: 0, scroll: 0, cta: 0, contact: 0, form: 0, leads: 0 }, buckets = [0, 0, 0, 0];
  for (var d0 = days - 1; d0 >= 0; d0--) { var key = Utilities.formatDate(new Date(now - d0 * 86400000), tz, "yyyy-MM-dd"); daily[key] = { visits: 0, leads: 0 }; }
  rows.forEach(function (r) {
    if (!(r[0] instanceof Date) || r[0].getTime() < cutoff) return;
    t.visits++; t.secs += Number(r[10]) || 0; var sc = Number(r[9]) || 0; t.scroll += sc; t.cta += Number(r[11]) || 0;
    if (r[13] === "Yes") t.contact++; if (r[14] === "Yes") t.form++; if (r[15] === "Yes") t.leads++;
    buckets[sc < 25 ? 0 : sc < 50 ? 1 : sc < 75 ? 2 : 3]++;
    var k = Utilities.formatDate(r[0], tz, "yyyy-MM-dd"); if (daily[k]) daily[k].visits++;
    var s = String(r[2] || "direct"); src[s] = (src[s] || 0) + 1;
    var dv = String(r[6] || "Unknown"); dev[dv] = (dev[dv] || 0) + 1;
  });
  var ls = getLeadsSheet_(ss, false), ln = ls.getLastRow(), leads = ln > 1 ? ls.getRange(2, 1, ln - 1, LEAD_HEADERS.length).getValues() : [], status = { New: 0, Contacted: 0, Won: 0, Lost: 0 }, leadCount = 0;
  leads.forEach(function (r) {
    if (!r[0] || !(r[1] instanceof Date) || r[1].getTime() < cutoff) return;
    leadCount++; status[r[12] || "New"] = (status[r[12] || "New"] || 0) + 1;
    var k = Utilities.formatDate(r[1], tz, "yyyy-MM-dd"); if (daily[k]) daily[k].leads++;
    var it = String(r[6] || "Not specified"); inter[it] = (inter[it] || 0) + 1;
  });
  function top(o, m) { return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, m || 8); }
  var v = t.visits;
  return {
    days: days, visits: v, avgSecs: v ? Math.round(t.secs / v) : 0, avgScroll: v ? Math.round(t.scroll / v) : 0, ctaClicks: t.cta,
    funnel: { visits: v, contact: t.contact, formStart: t.form, leads: leadCount },
    conversion: v ? Math.round(leadCount / v * 1000) / 10 : 0,
    scrollBuckets: { "0-25%": buckets[0], "25-50%": buckets[1], "50-75%": buckets[2], "75-100%": buckets[3] },
    topSources: top(src), devices: top(dev), interests: top(inter), status: status,
    daily: Object.keys(daily).map(function (k) { return { d: k, visits: daily[k].visits, leads: daily[k].leads }; })
  };
}


/** টেস্ট: Apps Script থেকে ▶ Run করে একটি টেস্ট অর্ডার দিন */
function testOrder() {
  var res = doPost({
    postData: { contents: JSON.stringify({
      name: "টেস্ট কাস্টমার", phone: "01700000000", district: "ঢাকা",
      address: "মিরপুর-১০, ঢাকা", note: "এটি একটি টেস্ট অর্ডার", shippingId: "dhaka",
      items: [{ id: "m1000", qty: 1 }, { id: "hn1000", qty: 1 }]
    }) }
  });
  Logger.log("টেস্ট রেসপন্স: " + res.getContent());
}

/** টেস্ট: ভিজিটর অ্যাক্টিভিটি ও Pixel ইভেন্ট শিটে যাচ্ছে কিনা দেখতে ▶ Run করুন */
function testTrack() {
  var res = doPost({
    postData: { contents: JSON.stringify({
      action: "track", sid: "TEST" + new Date().getTime(),
      a: { src: "facebook", med: "cpc", camp: "test", ref: "", dev: "Mobile", scr: "390x844", land: "/", scroll: 80, secs: 42, cta: 2, vs: 1, chk: 1, form: 1, ord: 0, oid: "" },
      ev: [{ n: "PageView", v: 0, c: "", o: "" }, { n: "ViewContent", v: 1050, c: "m1000", o: "" }, { n: "InitiateCheckout", v: 1050, c: "", o: "" }]
    }) }
  });
  Logger.log("ট্র্যাকিং রেসপন্স: " + res.getContent());
}

/** টেস্ট: Leads শিটে একটি টেস্ট Lead যাচ্ছে কিনা দেখতে ▶ Run করুন */
function testLead() {
  var res = doPost({ postData: { contents: JSON.stringify({ action: "lead", name: "Test Lead", phone: "01700000001", email: "test@example.com", company: "Test Co", interest: "Website / Landing page", budget: "৳25,000 – ৳60,000", message: "This is a test lead from Apps Script.", page: "/contact", source: "test", sid: "TEST", reqId: "TEST" + new Date().getTime() }) } });
  Logger.log("Lead রেসপন্স: " + res.getContent());
}
