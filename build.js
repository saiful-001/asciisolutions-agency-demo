/* Pre-renders every page into static HTML from js/config.js (so content works without JavaScript and is SEO-friendly).
   Run:  node build.js      (Vercel runs it automatically on every deploy – see vercel.json) */
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = __dirname;
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "js/config.js"), "utf8"), ctx);
const cfg = JSON.parse(JSON.stringify(ctx.window.SITE_CONFIG));
const R = require(path.join(root, "js/render.js"));
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), s); };

const pages = { home: "index.html", services: "services.html", portfolio: "portfolio.html", about: "about.html", pricing: "pricing.html", contact: "contact.html", privacy: "privacy.html", terms: "terms.html", notfound: "404.html" };
Object.keys(pages).forEach(k => write(pages[k], R.pageHtml(cfg, k, "")));

/* case studies: one static page per case (SEO). New cases added later from the admin are served by case.html (client rendered). */
const cases = (cfg.portfolio || []).filter(p => p.show !== false);
cases.forEach(p => write("work/" + p.slug + "/index.html", R.pageHtml(cfg, "case", p.slug)));
let shell = R.pageHtml(cfg, "case", "");
shell = shell.replace(/<main id="main">[\s\S]*?<\/main>/, '<main id="main"><section class="phero"><div class="wrap"><p class="eyebrow">Case study</p><h1 class="h-xl">Loading project…</h1><p class="lead"><a href="/portfolio">See all projects</a></p></div></section></main>');
write("case.html", shell);

/* sitemap + robots */
const base = String((cfg.seo || {}).siteUrl || "").replace(/\/+$/, "");
const urls = ["/", "/services", "/portfolio", "/about", "/pricing", "/contact", "/privacy", "/terms"].concat(cases.map(p => "/work/" + p.slug));
const today = new Date().toISOString().slice(0, 10);
write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(u => `  <url><loc>${base}${u}</loc><lastmod>${today}</lastmod><changefreq>${u === "/" ? "weekly" : "monthly"}</changefreq><priority>${u === "/" ? "1.0" : u.startsWith("/work/") ? "0.6" : "0.8"}</priority></url>`).join("\n") + "\n</urlset>\n");
write("robots.txt", `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin.html\nDisallow: /case\n\nSitemap: ${base}/sitemap.xml\n`);
console.log("Built " + (Object.keys(pages).length + cases.length + 1) + " pages + sitemap.xml + robots.txt");
