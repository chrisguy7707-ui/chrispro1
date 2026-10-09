/* site.config.json → 모든 페이지의 <head> 블록, 문의 이메일, sitemap.xml, robots.txt, ads.txt 생성
   실행: npm run configure
   - url: 사이트 주소 (끝에 / 포함). 도메인을 바꾸면 여기만 고치고 다시 실행
   - adsenseClient: 애드센스 게시자 ID (ca-pub-로 시작). 넣으면 승인용 코드·ads.txt가 들어감
   - adSlots: 승인 후 만든 광고 단위 ID. 비어 있는 자리는 화면에 나타나지 않음 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
const base = cfg.url.endsWith("/") ? cfg.url : cfg.url + "/";
const client = (cfg.adsenseClient || "").trim();
if (client && !/^ca-pub-\d{10,20}$/.test(client)) throw new Error(`adsenseClient 형식이 이상합니다: ${client} (예: ca-pub-1234567890123456)`);

/* 공개 페이지 (sitemap 순서) */
const PAGES = [
  { file: "index.html", loc: "", priority: "1.0" },
  { file: "app.html", loc: "app.html", priority: "0.9" },
  { file: "guide.html", loc: "guide.html", priority: "0.8" },
  { file: "factory.html", loc: "factory.html", priority: "0.6" },
  { file: "learn.html", loc: "learn.html", priority: "0.7" },
  { file: "learn-sample.html", loc: "learn-sample.html", priority: "0.6" },
  { file: "learn-fabric.html", loc: "learn-fabric.html", priority: "0.6" },
  { file: "learn-yield.html", loc: "learn-yield.html", priority: "0.6" },
  { file: "learn-size.html", loc: "learn-size.html", priority: "0.6" },
  { file: "learn-label.html", loc: "learn-label.html", priority: "0.6" },
  { file: "learn-inspect.html", loc: "learn-inspect.html", priority: "0.6" },
  { file: "learn-flat.html", loc: "learn-flat.html", priority: "0.6" },
  { file: "learn-terms.html", loc: "learn-terms.html", priority: "0.6" },
  { file: "learn-wash.html", loc: "learn-wash.html", priority: "0.6" },
  { file: "about.html", loc: "about.html", priority: "0.5" },
  { file: "contact.html", loc: "contact.html", priority: "0.3" },
  { file: "privacy.html", loc: "privacy.html", priority: "0.2" },
  { file: "terms.html", loc: "terms.html", priority: "0.2" },
  /* 영어판 (en/). ko = 같은 내용의 한국어 페이지 → 양쪽에 hreflang 링크 */
  { file: "en/index.html", loc: "en/", priority: "0.8", lang: "en", ko: "index.html" },
  { file: "en/guide.html", loc: "en/guide.html", priority: "0.6", lang: "en", ko: "guide.html" },
  { file: "en/about.html", loc: "en/about.html", priority: "0.4", lang: "en", ko: "about.html" },
  { file: "en/contact.html", loc: "en/contact.html", priority: "0.3", lang: "en", ko: "contact.html" },
  { file: "en/privacy.html", loc: "en/privacy.html", priority: "0.2", lang: "en", ko: "privacy.html" },
  { file: "en/terms.html", loc: "en/terms.html", priority: "0.2", lang: "en", ko: "terms.html" },
];
const enOf = (koFile) => PAGES.find((p) => p.ko === koFile);
/* 사이트맵에 넣지 않는 페이지: 404와, 도구 버튼 클릭을 방문 통계로 세는 빈 페이지(e/*.html, 검색 제외·robots 차단) */
const EVENTS = ["print", "save", "export", "share", "mystyle", "pattern"];
const OTHER = ["404.html", ...EVENTS.map((n) => `e/${n}.html`)];

const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const pick = (html, re) => (html.match(re) || [])[1] || "";

function headBlock(html, page) {
  const title = pick(html, /<title>([^<]*)<\/title>/);
  const desc = pick(html, /<meta name="description" content="([^"]*)"/);
  const lines = [];
  if (page) {
    const url = base + page.loc, en = page.lang === "en";
    const pair = en ? [PAGES.find((p) => p.file === page.ko), page] : [page, enOf(page.file)];
    lines.push(`<link rel="canonical" href="${url}" />`);
    if (pair[1]) lines.push(`<link rel="alternate" hreflang="ko" href="${base + pair[0].loc}" />`, `<link rel="alternate" hreflang="en" href="${base + pair[1].loc}" />`,
      `<link rel="alternate" hreflang="x-default" href="${base + pair[1].loc}" />`);   // 한국어도 영어도 아닌 방문자에게는 영어판
    lines.push(
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${en ? "Jakji" : attr(cfg.siteName)}" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${desc}" />`,
      `<meta property="og:url" content="${url}" />`,
      `<meta property="og:image" content="${base}assets/og${en ? "-en" : ""}.png" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:locale" content="${en ? "en_US" : "ko_KR"}" />`, ...(pair[1] ? [`<meta property="og:locale:alternate" content="${en ? "ko_KR" : "en_US"}" />`] : []),
      `<meta name="twitter:card" content="summary_large_image" />`);
  } else {
    // 404는 없는 하위 경로에서도 열리므로 상대 경로 기준을 사이트 루트로 고정
    lines.push(`<base href="${new URL(base).pathname}" />`, `<meta name="robots" content="noindex" />`);
  }
  if (cfg.googleSiteVerification) lines.push(`<meta name="google-site-verification" content="${attr(cfg.googleSiteVerification)}" />`);
  if (cfg.naverSiteVerification) lines.push(`<meta name="naver-site-verification" content="${attr(cfg.naverSiteVerification)}" />`);
  const site = { contactEmail: (cfg.contactEmail || "").trim(), feedbackEndpoint: /^https:\/\//.test(cfg.feedbackEndpoint || "") ? cfg.feedbackEndpoint.trim() : "" };
  if (/^[a-f0-9]{32}$/i.test(cfg.analyticsToken || "")) site.analytics = true;   // 도구가 버튼 클릭을 세도 되는지 (e/*.html 이 통계를 불러올 때만 의미 있음)
  if (client) {
    lines.push(`<meta name="google-adsense-account" content="${client}" />`,
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`);
    site.adClient = client;
    site.adSlots = Object.fromEntries(Object.entries(cfg.adSlots || {}).filter(([, v]) => String(v).trim()));
  }
  // 방문 통계: Cloudflare Web Analytics (쿠키 없음, 개인 식별 안 함). site.config.json analyticsToken 이 있을 때만
  // 공유 링크(#v1=…)에는 작업 내용이 주소에 들어 있으므로, 그때는 통계 스크립트를 불러오지 않음
  if (/^[a-f0-9]{32}$/i.test(cfg.analyticsToken || "")) lines.push(`<script>if(!/^#v[01]=/.test(location.hash)){var s=document.createElement("script");s.type="module";s.src="https://static.cloudflareinsights.com/beacon.min.js";s.setAttribute("data-cf-beacon",'{"token": "${cfg.analyticsToken}"}');document.head.appendChild(s)}</script>`);
  // 광고·문의 메일·비밀 의견 주소 (assets/site.js, assets/feedback.js 가 읽음)
  lines.push(`<script>window.SITE = ${JSON.stringify(site).replace(/</g, "\\u003c")};</script>`);
  return lines.join("\n");
}

function contactBlock(en) {
  const mail = (cfg.contactEmail || "").trim();
  if (en) return mail ? `<p>Email: <a href="mailto:${attr(mail)}">${attr(mail)}</a></p>` : `<p class="note">Email contact is not ready yet. Please use the GitHub issue board below.</p>`;
  return mail
    ? `<p>이메일: <a href="mailto:${attr(mail)}">${attr(mail)}</a></p>`
    : `<p class="note">이메일 문의 창구는 준비 중입니다. 아래 GitHub 문의 게시판을 이용해 주세요.</p>`;
}

const swap = (html, name, body) => {
  const re = new RegExp(`(<!-- SITE:${name}-START -->)[\\s\\S]*?(<!-- SITE:${name}-END -->)`);
  if (!re.test(html)) return html;
  return html.replace(re, `$1\n${body}\n$2`);
};

let changed = 0;
for (const f of [...PAGES.map((p) => p.file), ...OTHER]) {
  const fp = path.join(root, f);
  if (!fs.existsSync(fp)) throw new Error(`없는 페이지: ${f}`);
  const html = fs.readFileSync(fp, "utf8");
  if (!html.includes("<!-- SITE:HEAD-START -->")) throw new Error(`${f}에 SITE:HEAD 표시가 없습니다`);
  let out = swap(html, "HEAD", headBlock(html, PAGES.find((p) => p.file === f)));
  out = swap(out, "CONTACT", contactBlock(f.startsWith("en/")));
  if (out !== html) { fs.writeFileSync(fp, out); changed++; }
}

// 내 도메인(예: jakji.com)을 쓰면 GitHub Pages용 CNAME 파일을 만듦. url 도 https://도메인/ 으로 바꿀 것
const domain = (cfg.customDomain || "").trim().toLowerCase();
if (/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) fs.writeFileSync(path.join(root, "CNAME"), domain + "\n");
else if (fs.existsSync(path.join(root, "CNAME"))) fs.unlinkSync(path.join(root, "CNAME"));
const today = new Date().toISOString().slice(0, 10);
/* sitemap lastmod: 파일을 실제로 고친 날 (git 기록이 있고 바뀐 곳이 없으면 마지막 커밋일, 고치는 중이면 오늘, git이 없으면 파일 수정일).
   모든 페이지가 매번 '오늘'로 나오면 검색엔진이 날짜 신호를 믿지 않음 */
const git = (args) => { try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch (e) { return null; } };
const lastmod = (file) => {
  if (git(["status", "--porcelain", "--", file])) return today;
  const d = git(["log", "-1", "--format=%cs", "--", file]);
  return d || new Date(fs.statSync(path.join(root, file)).mtimeMs).toISOString().slice(0, 10);
};
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `  <url><loc>${base}${p.loc}</loc><lastmod>${lastmod(p.file)}</lastmod><priority>${p.priority}</priority></url>`).join("\n")}
</urlset>
`);
fs.writeFileSync(path.join(root, "robots.txt"), `User-agent: *
Allow: /
Disallow: /e/

Sitemap: ${base}sitemap.xml
`);
const adsTxt = path.join(root, "ads.txt");
if (client) fs.writeFileSync(adsTxt, `google.com, ${client.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n`);
else if (fs.existsSync(adsTxt)) fs.unlinkSync(adsTxt);

console.log(`페이지 ${changed}개 갱신 · sitemap.xml · robots.txt${client ? " · ads.txt" : ""} (주소 ${base}, 애드센스 ${client || "미설정"})`);
