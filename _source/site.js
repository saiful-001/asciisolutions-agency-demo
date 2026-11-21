/* ASCII Solutions – browser behaviours.
   Pages are pre-rendered (HTML works without JS). This script adds: live content from the admin data source
   (with safe fallback to config.js), animations, forms, and privacy-friendly tracking. */
(function () {
  "use strict";
  var R = window.R, D = window.SITE_CONFIG || {}, C = D;
  if (!R) return;
  var doc = document, body = doc.body, html = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches;
  var fine = window.matchMedia && matchMedia("(hover:hover) and (pointer:fine)").matches;
  var page = body.getAttribute("data-page"), slug = body.getAttribute("data-slug") || "";
  var preview = /[?&]preview=1/.test(location.search);

  /* ---------- config merge (objects deep-merge, arrays replace) ---------- */
  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
  function merge(a, b) {
    var out = Array.isArray(a) ? a.slice() : {}, k;
    if (isObj(a)) for (k in a) out[k] = isObj(a[k]) ? merge(a[k], {}) : (Array.isArray(a[k]) ? a[k].slice() : a[k]);
    if (isObj(b)) for (k in b) { if (b[k] === undefined || b[k] === null) continue; out[k] = (isObj(b[k]) && isObj(out[k])) ? merge(out[k], b[k]) : b[k]; }
    return out;
  }

  /* ---------- tracking (anonymous; no name/phone/email ever leaves via tracking) ---------- */
  var TR = (function () {
    var KEY = "hn_ses", st = { scroll: 0, secs: 0, cta: 0, chk: 0, form: 0, ord: 0, oid: "", pv: 0, sv: [], fe: [], vs: 0, ev: [], sent: 0, flushes: 0, last: 0, pixel: false };
    try { var o = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (o) { for (var k in o) st[k] = o[k]; } } catch (e) {}
    var sid = ""; try { sid = sessionStorage.getItem("hn_sid") || ""; if (!sid) { sid = "S" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem("hn_sid", sid); } } catch (e) { sid = "S" + Date.now().toString(36); }
    var t0 = Date.now(), baseSecs = st.secs || 0;
    var q = {}; (location.search || "").replace(/^\?/, "").split("&").forEach(function (kv) { var a = kv.split("="); if (a[0]) { try { q[a[0]] = decodeURIComponent((a[1] || "").replace(/\+/g, " ")); } catch (e) {} } });
    var ref = ""; try { ref = doc.referrer ? new URL(doc.referrer).hostname.replace(/^www\./, "") : ""; } catch (e) {}
    if (ref === location.hostname) ref = "";
    var first = null; try { first = JSON.parse(sessionStorage.getItem("hn_src") || "null"); } catch (e) {}
    if (!first) { first = { src: q.utm_source || q.src || (q.fbclid ? "facebook" : "") || ref || "direct", med: q.utm_medium || "", camp: q.utm_campaign || "", ref: ref, land: location.pathname }; try { sessionStorage.setItem("hn_src", JSON.stringify(first)); } catch (e) {} }
    var ua = navigator.userAgent || "", w = window.innerWidth;
    var dev = /Mobi|Android|iPhone/i.test(ua) ? "Mobile" : (/iPad|Tablet/i.test(ua) || (w >= 600 && w < 1000) ? "Tablet" : "Desktop");
    function cfg() { return C.tracking || {}; }
    var sampled = true;
    try { var sm = sessionStorage.getItem("hn_smp"); if (sm === null) { var pc = cfg().sample == null ? 100 : cfg().sample; sm = Math.random() * 100 < pc ? "1" : "0"; sessionStorage.setItem("hn_smp", sm); } sampled = sm === "1"; } catch (e) {}
    var dnt = navigator.doNotTrack === "1" || window.doNotTrack === "1";
    function on() { return sampled && !dnt && !preview && cfg().activity !== false && !!C.apiEndpoint; }
    function loadPixel() {
      var id = String(cfg().fbPixelId || "").trim();
      if (st.pixel || dnt || preview || !/^\d{5,20}$/.test(id)) return;
      st.pixel = true;
      (function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; if (s && s.parentNode) s.parentNode.insertBefore(t, s); else b.head.appendChild(t); })(window, doc, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", id); window.fbq("track", "PageView");
    }
    var STD = { PageView: 1, ViewContent: 1, Lead: 1, Contact: 1 };
    function event(name, d) {
      d = d || {};
      st.ev.push({ n: name, v: d.value || 0, c: d.content || "", o: d.oid || "" });
      loadPixel();
      if (st.pixel && window.fbq && name !== "PageView") { if (STD[name]) window.fbq("track", name, d.fb || {}); else window.fbq("trackCustom", name, d.fb || {}); }
    }
    function save() { try { st.sent = st.sent || 0; sessionStorage.setItem(KEY, JSON.stringify({ scroll: st.scroll, secs: st.secs, cta: st.cta, chk: st.chk, form: st.form, ord: st.ord, oid: st.oid, pv: st.pv, sv: st.sv, fe: st.fe, vs: st.vs })); } catch (e) {} }
    function summary() {
      st.secs = baseSecs + Math.round((Date.now() - t0) / 1000);
      return { src: first.src, med: first.med, camp: first.camp, ref: first.ref, dev: dev, scr: screen.width + "x" + screen.height, land: first.land, scroll: Math.round(st.scroll), secs: st.secs, cta: st.cta,
        vs: st.vs ? 1 : 0, chk: st.chk ? 1 : 0, form: st.form ? 1 : 0, ord: st.ord ? 1 : 0, oid: st.oid, lang: navigator.language || "", pv: st.pv, sv: st.sv.join(","), fe: st.fe.join(",") };
    }
    function flush(force) {
      save();
      if (!on() || st.flushes >= 6) return;
      var now = Date.now(); if (!force && now - st.last < 6000) return;
      var evs = st.ev.slice(st.sent); st.last = now; st.flushes++; st.sent = st.ev.length;
      var bodyTxt = JSON.stringify({ action: "track", sid: sid, a: summary(), ev: evs });
      try { if (navigator.sendBeacon && navigator.sendBeacon(C.apiEndpoint, new Blob([bodyTxt], { type: "text/plain;charset=UTF-8" }))) return; } catch (e) {}
      try { fetch(C.apiEndpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: bodyTxt, keepalive: true, mode: "no-cors" }); } catch (e) {}
    }
    var tk = false;
    window.addEventListener("scroll", function () { if (tk) return; tk = true; requestAnimationFrame(function () { tk = false; var de = html, p = (window.pageYOffset + window.innerHeight) / Math.max(1, de.scrollHeight) * 100; if (p > st.scroll) st.scroll = Math.min(100, p); }); }, { passive: true });
    doc.addEventListener("visibilitychange", function () { if (doc.visibilityState === "hidden") flush(false); });
    window.addEventListener("pagehide", function () { flush(false); });
    setTimeout(function () { flush(true); }, 30000 + Math.floor(Math.random() * 6000));
    st.pv++; event("PageView", { content: page + (slug ? ":" + slug : "") });
    if (page === "case" || page === "services") event("ViewContent", { content: slug || "services" });
    return {
      sid: sid, source: function () { return first.src + (first.camp ? " / " + first.camp : ""); },
      event: event, flush: flush, pixel: loadPixel,
      cta: function (label) { st.cta++; event("CTAClick", { content: String(label).slice(0, 60) }); if (/^(whatsapp|messenger|call|float-)/.test(label)) event("Contact", { content: label }); },
      section: function (id) { if (st.sv.indexOf(id) < 0) { st.sv.push(id); if (id === "contact") st.chk = 1; } },
      formEvent: function (n) { if (st.fe.indexOf(n) < 0 || n === "error") st.fe.push(n); if (n === "start") st.form = 1; },
      lead: function (id) { st.ord = 1; st.oid = id; event("Lead", { oid: id }); flush(true); }
    };
  })();
  loadPixelEarly();
  function loadPixelEarly() { if (!preview) TR.pixel(); }

  /* ---------- (re)render from config ---------- */
  function applyConfig(cfg) {
    C = cfg;
    var rev = R.hash(cfg);
    if (body.getAttribute("data-rev") === rev && !(page === "case" && !slug)) return false;
    body.setAttribute("data-rev", rev);
    $("#theme-css").textContent = R.themeCss(cfg);
    doc.documentElement.setAttribute("data-layout", R.layout(cfg));
    var gf = R.googleFontsHref(cfg), link = $("#gfonts");
    if (gf) { if (!link) { link = doc.createElement("link"); link.rel = "stylesheet"; link.id = "gfonts"; doc.head.appendChild(link); } if (link.getAttribute("href") !== gf) link.href = gf; } else if (link) link.remove();
    var seo = R.seoFor(cfg, page, slug);
    doc.title = seo.title;
    var md = $('meta[name="description"]'); if (md) md.setAttribute("content", seo.description);
    $("#hdr").innerHTML = R.header(cfg, page);
    $("#main").innerHTML = R.main(cfg, page, slug);
    $("#ftr").innerHTML = R.footer(cfg);
    $("#floaters").innerHTML = R.floaters(cfg);
    bind();
    return true;
  }

  /* ---------- behaviours ---------- */
  var cleanup = [];
  /* ---------- file:// support: point "/…" images, links and assets at the real folder ---------- */
  function fileFix() {
    var root = window.__FILE_ROOT; if (location.protocol !== "file:" || !root) return;
    $$('[src^="/"],[href^="/"]').forEach(function (el) {
      ["src", "href"].forEach(function (a) {
        var v = el.getAttribute(a); if (!v || v.charAt(0) !== "/" || v.charAt(1) === "/") return;
        var p = v.split(/[?#]/)[0], rest = v.slice(p.length), seg = p.split("/").pop(), out;
        if (seg.indexOf(".") > -1) out = p.slice(1);
        else if (p === "/") out = "index.html";
        else if (p.indexOf("/work/") === 0) out = p.slice(1).replace(/\/$/, "") + "/index.html";
        else out = p.slice(1) + ".html";
        el.setAttribute(a, root + out + rest);
      });
    });
  }
  function bind() {
    fileFix();
    cleanup.forEach(function (f) { try { f(); } catch (e) {} }); cleanup = [];
    html.classList.add("anim");
    var hdr = $("#hdr"), prog = $("#progress");

    /* header + progress */
    var tick = false;
    function onScroll() { if (tick) return; tick = true; requestAnimationFrame(function () { tick = false; var y = window.pageYOffset, h = html.scrollHeight - window.innerHeight; if (hdr) hdr.classList.toggle("is-stuck", y > 8); if (prog) prog.style.transform = "scaleX(" + (h > 0 ? Math.min(1, y / h) : 0) + ")"; }); }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    cleanup.push(function () { window.removeEventListener("scroll", onScroll); });

    /* mobile menu */
    var burger = $(".burger"), mnav = $("#mnav");
    function setMenu(open) {
      if (!burger || !mnav) return;
      burger.setAttribute("aria-expanded", open ? "true" : "false"); burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      burger.innerHTML = R.icon(open ? "close" : "menu", 26);
      if (open) { mnav.hidden = false; requestAnimationFrame(function () { mnav.classList.add("open"); }); body.style.overflow = "hidden"; }
      else { mnav.classList.remove("open"); body.style.overflow = ""; setTimeout(function () { if (!mnav.classList.contains("open")) mnav.hidden = true; }, 260); }
    }
    if (burger) burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
    if (mnav) mnav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    var esc = function (e) { if (e.key === "Escape") setMenu(false); }; doc.addEventListener("keydown", esc);
    cleanup.push(function () { doc.removeEventListener("keydown", esc); body.style.overflow = ""; });

    /* scroll reveal + word reveal (scroll sweep: nothing stays hidden after a fast scroll or an anchor jump) */
    var pend = $$("[data-reveal],[data-split]"), sweepTick = false;
    function sweep() {
      var vh = window.innerHeight || 800;
      pend = pend.filter(function (el) { if (el.getBoundingClientRect().top < vh * .94) { el.classList.add("in"); return false; } return true; });
      if (!pend.length) { window.removeEventListener("scroll", onSweep); window.removeEventListener("resize", onSweep); }
    }
    function onSweep() { if (sweepTick) return; sweepTick = true; requestAnimationFrame(function () { sweepTick = false; sweep(); }); }
    window.addEventListener("scroll", onSweep, { passive: true }); window.addEventListener("resize", onSweep); sweep();
    cleanup.push(function () { window.removeEventListener("scroll", onSweep); window.removeEventListener("resize", onSweep); });
    if ("IntersectionObserver" in window) {
      var so = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) TR.section(e.target.getAttribute("data-sec") || e.target.id); }); }, { threshold: .35 });
      $$("[data-sec],#contact,#contact-form").forEach(function (el) { so.observe(el); });
      cleanup.push(function () { so.disconnect(); });
      var co = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); co.unobserve(e.target); } }); }, { threshold: .6 });
      $$(".count").forEach(function (el) { co.observe(el); });
      cleanup.push(function () { co.disconnect(); });
    }

    /* tilt + magnetic (desktop pointers only) */
    if (fine && !reduce) {
      $$(".tilt").forEach(function (el) {
        el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = "perspective(900px) rotateX(" + (-y * 6).toFixed(2) + "deg) rotateY(" + (x * 8).toFixed(2) + "deg) translateY(-4px)"; });
        el.addEventListener("pointerleave", function () { el.style.transform = ""; });
      });
      $$(".magnet").forEach(function (el) {
        el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); el.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + "px)"; });
        el.addEventListener("pointerleave", function () { el.style.transform = ""; });
      });
    }

    /* portfolio filter */
    $$(".chip[data-filter]").forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.getAttribute("data-filter");
        $$(".chip[data-filter]").forEach(function (x) { x.classList.toggle("is-on", x === c); });
        $$(".work").forEach(function (w) { var cat = w.getAttribute("data-cat") || ""; w.classList.toggle("is-hidden", f !== "*" && cat.indexOf(f) < 0); });
      });
    });

    /* CTA clicks */
    $$("[data-cta]").forEach(function (a) { a.addEventListener("click", function () { TR.cta(a.getAttribute("data-cta")); }); });

    /* forms */
    $$("form[data-lead]").forEach(initForm);
    $$("[data-sheetview]").forEach(function (b) { b.addEventListener("click", function () { openSheetView(b, b.closest("form")); }); });
  }

  function countUp(el) {
    var to = parseFloat(el.getAttribute("data-count")), dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    if (isNaN(to) || reduce) return;
    var t0 = performance.now(), dur = 1300;
    (function step(t) { var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); else el.textContent = to.toFixed(dec); })(t0);
  }

  /* ---------- "how is my data saved" live preview (nothing is sent) ---------- */
  var SHEET_COLS = ["Lead ID", "Date & Time", "Name", "Phone", "Email", "Company", "Service Interest", "Budget", "Message", "Package", "Source Page", "Traffic Source", "Status", "Notes"];
  function sheetLink(u) { u = String(u || "").trim(); return /^https:\/\/docs\.google\.com\/[^\s"'<>]+$/.test(u) ? u : ""; }
  function openSheetView(opener, form) {
    var sv = C.sheetView || {}, old = $(".shm"); if (old) old.remove();
    var el = function (t, c, x) { var e = doc.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    var v = function (n) { var f = form && form.elements[n]; return f ? String(f.value || "").trim() : ""; };
    var pad = function (n) { return ("0" + n).slice(-2); }, d = new Date();
    var vals = ["L-AUTO", d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()), v("name"), v("phone"), v("email"), v("company"), v("interest"), v("budget"), v("message"), v("package"), location.pathname, TR.source(), "New", ""];
    var ov = el("div", "shm"), box = el("div", "shm__box"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-labelledby", "shm-t");
    var x = el("button", "shm__x", "×"); x.type = "button"; x.setAttribute("aria-label", "Close");
    var t = el("h2", "shm__t", sv.title || "How your details are saved"); t.id = "shm-t";
    box.appendChild(x); box.appendChild(t);
    box.appendChild(el("p", "shm__note", sv.note || "This is a live preview of the row that is added to our private Google Sheet when you send the form. Nothing has been sent yet."));
    var wrap = el("div", "shm__sheet"), tab = el("div", "shm__tab"); tab.appendChild(el("span", "", "Leads")); wrap.appendChild(tab);
    var sc = el("div", "shm__scroll"), tb = el("table"), r1 = el("tr"), r2 = el("tr");
    r1.appendChild(el("th", "rn", "1")); r2.appendChild(el("th", "rn", "2"));
    SHEET_COLS.forEach(function (c, i) { r1.appendChild(el("th", "", c)); var val = vals[i], td = el("td", val ? "" : "empty", val || (i === 13 ? "(added by our team)" : "—")); if (/^[=+\-@]/.test(val)) td.textContent = "'" + val; r2.appendChild(td); });
    tb.appendChild(r1); tb.appendChild(r2); sc.appendChild(tb); wrap.appendChild(sc); box.appendChild(wrap);
    var ul = el("ul", "shm__list");
    ["One new row per message, added the moment you press send.", "The sheet is private: only our team can open it.", "Cells starting with = + - @ are neutralised and < > are removed for safety."].forEach(function (m) { ul.appendChild(el("li", "", m)); });
    box.appendChild(ul);
    var acts = el("div", "shm__acts"), link = sheetLink(sv.demoUrl);
    if (link) { var a = el("a", "btn btn--ghost btn--sm", sv.linkText || "Open a sample sheet"); a.href = link; a.target = "_blank"; a.rel = "noopener"; acts.appendChild(a); }
    var ok = el("button", "btn btn--primary btn--sm", "Close"); ok.type = "button"; acts.appendChild(ok); box.appendChild(acts);
    ov.appendChild(box); doc.body.appendChild(ov); body.style.overflow = "hidden";
    function close() { ov.remove(); body.style.overflow = ""; doc.removeEventListener("keydown", key); if (opener && opener.focus) opener.focus(); }
    function key(e) { if (e.key === "Escape") close(); }
    x.onclick = close; ok.onclick = close; ov.addEventListener("click", function (e) { if (e.target === ov) close(); }); doc.addEventListener("keydown", key); ok.focus();
  }

  /* ---------- lead form ---------- */
  var BD = /^(\+?88)?01[3-9]\d{8}$/, INTL = /^\+\d{8,15}$/;
  function initForm(form) {
    var msg = $(".lead__msg", form), lbl = $(".lead__lbl", form), btn = $("button[type=submit]", form), started = false, busy = false, reqId = null;
    var qs = {}; (location.search || "").replace(/^\?/, "").split("&").forEach(function (kv) { var a = kv.split("="); if (a[0]) { try { qs[a[0]] = decodeURIComponent((a[1] || "").replace(/\+/g, " ")); } catch (e) {} } });
    form.elements.page.value = location.pathname;
    if (qs.package) form.elements["package"].value = qs.package;
    if (qs.service) { var opt = $$("option", form.elements.interest).filter(function (o) { return qs.service.toLowerCase().indexOf(o.value.toLowerCase().split(" ")[0]) === 0 && o.value; })[0]; if (opt) form.elements.interest.value = opt.value; }
    if (qs.package && !form.elements.message.value) form.elements.message.placeholder = "I'm interested in the " + qs.package + " package. Tell us a bit about your project…";
    form.addEventListener("focusin", function () { if (!started) { started = true; TR.formEvent("start"); TR.event("FormStart", { content: location.pathname }); } });

    function show(type, title, text) {
      msg.hidden = false; msg.className = "lead__msg " + type; msg.textContent = "";
      if (title) { var s = doc.createElement("strong"); s.textContent = title; msg.appendChild(s); }
      msg.appendChild(doc.createTextNode(text)); msg.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }
    function bad(name, text) {
      var f = form.elements[name], wrap = f && f.closest(".fld"); if (!wrap) return;
      wrap.classList.add("is-bad"); var p = doc.createElement("p"); p.className = "err"; p.textContent = text; wrap.appendChild(p);
    }
    function clear() { $$(".fld.is-bad", form).forEach(function (w) { w.classList.remove("is-bad"); var p = $(".err", w); if (p) p.remove(); }); msg.hidden = true; }
    function setBusy(b) { busy = b; form.classList.toggle("is-busy", b); if (btn) btn.disabled = b; if (lbl) lbl.textContent = b ? "Sending…" : (((C.form || {}).labels || {}).submit || "Send message"); }

    form.addEventListener("submit", function (e) {
      e.preventDefault(); if (busy) return; clear();
      var v = { name: form.elements.name.value.trim(), phone: form.elements.phone.value.replace(/[\s\-()]/g, ""), email: form.elements.email.value.trim(), company: form.elements.company.value.trim(), interest: form.elements.interest.value, budget: form.elements.budget.value, message: form.elements.message.value.trim() };
      v.phone = v.phone.replace(/[০-৯]/g, function (d) { return "০১২৩৪৫৬৭৮৯".indexOf(d); });
      var ok = true;
      if (v.name.length < 2) { bad("name", "Please enter your name."); ok = false; }
      if (!(BD.test(v.phone) || INTL.test(v.phone))) { bad("phone", "Enter a valid phone (e.g. 01712345678 or +8801712345678)."); ok = false; }
      if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) { bad("email", "Enter a valid email or leave it empty."); ok = false; }
      if (v.message.length < 10) { bad("message", "Please write at least 10 characters."); ok = false; }
      if (!ok) { TR.formEvent("error"); TR.event("FormError", { content: "validation" }); var f = $(".is-bad input,.is-bad textarea", form); if (f) f.focus(); return; }
      if (form.elements.website.value) { show("bad", "", "We could not send your message. Please call or WhatsApp us."); TR.formEvent("error"); return; }
      var cd = Math.max(1, Number((C.form || {}).cooldownMinutes) || 2) * 60000;
      try { var last = JSON.parse(localStorage.getItem("hn_last_lead") || "null"); if (last && last.phone === v.phone && Date.now() - last.t < cd) { var s = Math.ceil((cd - (Date.now() - last.t)) / 1000); show("bad", "Already received", "We already have your request (ID " + last.id + "). Please wait " + (s > 60 ? Math.ceil(s / 60) + " minutes" : s + " seconds") + " before sending another, or call us for urgent changes."); return; } } catch (x) {}
      if (!C.apiEndpoint) { show("bad", "Form not connected yet", "The contact form is not connected to the server yet. Please call " + (C.contact || {}).phone + " or email " + (C.contact || {}).email + "."); TR.formEvent("error"); return; }
      var payload = { action: "lead", name: v.name, phone: v.phone, email: v.email, company: v.company, interest: v.interest, budget: v.budget, message: v.message, "package": form.elements["package"].value, page: form.elements.page.value, sid: TR.sid, source: TR.source(), website: "", reqId: reqId || (reqId = "L" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9)) };
      setBusy(true); TR.event("FormSubmit", { content: location.pathname });
      var attempts = 0;
      (function send() {
        attempts++;
        var ctl = new AbortController(), to = setTimeout(function () { ctl.abort(); }, 25000);
        fetch(C.apiEndpoint, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), signal: ctl.signal })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            clearTimeout(to);
            if (d && d.success && d.leadId) {                         // success ONLY after a real confirmed response
              setBusy(false); reqId = null; form.reset(); form.elements.page.value = location.pathname;
              try { localStorage.setItem("hn_last_lead", JSON.stringify({ phone: v.phone, id: d.leadId, t: Date.now() })); } catch (x) {}
              var f = C.form || {}; show("ok", f.successTitle || "Thank you!", (f.successText || "We received your request.") + " (Reference: " + d.leadId + ")");
              var sv = C.sheetView || {}; if (sv.successLink && sheetLink(sv.demoUrl)) { var al = doc.createElement("a"); al.href = sheetLink(sv.demoUrl); al.target = "_blank"; al.rel = "noopener"; al.textContent = sv.linkText || "See how this is saved"; msg.appendChild(doc.createTextNode(" ")); msg.appendChild(al); }
              TR.formEvent("success"); TR.event("FormSuccess", { content: d.leadId, oid: d.leadId }); TR.lead(d.leadId); return;
            }
            if (d && d.busy && attempts < 3) return setTimeout(send, 1500 * attempts);
            setBusy(false); if (!(d && d.busy)) reqId = null;
            show("bad", "Could not send", (d && d.error) || "Something went wrong. Please try again or call us.");
            TR.formEvent("error"); TR.event("FormError", { content: (d && d.error ? "server" : "unknown") });
          })
          .catch(function () {
            clearTimeout(to);
            if (attempts < 2) return setTimeout(send, 1800);
            setBusy(false); show("bad", "Connection problem", "We could not reach the server, so your message was NOT sent. Please try again or call " + ((C.contact || {}).phone || "us") + ".");
            TR.formEvent("error"); TR.event("FormError", { content: "network" });
          });
      })();
    });
  }

  /* ---------- live content: cached copy first, then refresh (always falls back to config.js) ---------- */
  var CK = "hn_live_v1";
  function readCache() { try { var j = JSON.parse(localStorage.getItem(CK) || "null"); return j && j.data ? j : null; } catch (e) { return null; } }
  function writeCache(o) { try { localStorage.setItem(CK, JSON.stringify(o)); } catch (e) {} }
  var draftMode = preview;
  (function boot() {
    var changedNow = false;
    if (preview) {
      try { var d = JSON.parse(localStorage.getItem("hn_site_draft") || "null"); if (d && d.data) changedNow = applyConfig(merge(D, d.data)); } catch (e) {}
      window.addEventListener("storage", function (e) { if (e.key === "hn_site_draft" && e.newValue) { try { applyConfig(merge(D, JSON.parse(e.newValue).data)); } catch (x) {} } });
    } else {
      var c = readCache();
      if (c) changedNow = applyConfig(merge(D, c.data));
    }
    if (page === "case" && !slug) { slug = (location.pathname.match(/\/work\/([^\/?#]+)/) || [])[1] || ""; body.setAttribute("data-slug", slug); changedNow = applyConfig(C) || changedNow; }
    if (!changedNow) bind();
    if (!preview && D.apiEndpoint) {
      var u = D.apiEndpoint + (D.apiEndpoint.indexOf("?") > -1 ? "&" : "?") + "action=config";
      fetch(u, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.success || !d.settings) return;
        var cc = readCache(); if (cc && String(cc.rev) === String(d.rev)) return;
        writeCache({ rev: d.rev, data: d.settings });
        applyConfig(merge(D, d.settings));
      }).catch(function () { /* keep baked defaults */ });
    }
  })();
})();
