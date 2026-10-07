/* 사이트 페이지 검증: SEO 태그, 내부 링크, 구조화 데이터, 모바일 폭, 광고 자리(설정 전·후), 애드센스 설정 스크립트
   실행: npm run serve → npm test */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.SITE_URL || "http://localhost:8766/";
const cfg = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
const PAGES = ["index.html", "app.html", "guide.html", "factory.html", "about.html", "privacy.html", "terms.html", "contact.html"];

const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const pdfPages = (buf) => (Buffer.from(buf).toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
/* 공개 사이트(github.io) 검사: GitHub CDN이 자동화 브라우저에만 봇 탐지 스크립트(사이트 루트의 무작위 경로)를 끼워 넣음.
   일반 브라우저에서는 없으므로, 우리 경로(/chrispro1/) 밖의 같은 도메인 요청은 막고 일반 방문자 기준으로 확인 */
if (/github\.io/.test(process.env.APP_URL || process.env.SITE_URL || "")) {
  await page.setRequestInterception(true);
  page.on("request", (r) => { const u = new globalThis.URL(r.url()); if (u.hostname.endsWith("github.io") && !u.pathname.startsWith("/chrispro1/")) r.abort(); else r.continue(); });
}
const errors = [];
page.on("pageerror", (e) => errors.push(`${page.url()} ${e.message}`));
const LIVE = /github\.io/.test(process.env.SITE_URL || "");
page.on("console", (m) => { if (m.type() === "error" && !(LIVE && m.text().includes("ERR_FAILED"))) errors.push(`${page.url()} ${m.text()}`); });  // 막은 봇 탐지 스크립트 오류는 제외

/* 1. 페이지별 SEO 기본 */
const links = new Set();
const titles = new Set(), descs = new Set();
for (const f of PAGES) {
  const res = await page.goto(BASE + f, { waitUntil: "networkidle0" });
  const info = await page.evaluate(() => {
    const m = (s) => document.querySelector(s)?.getAttribute("content") || "";
    let ld = true;
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) { try { JSON.parse(s.textContent); } catch (e) { ld = false; } }
    return {
      title: document.title, desc: m('meta[name="description"]'), canonical: document.querySelector('link[rel="canonical"]')?.href || "",
      ogImage: m('meta[property="og:image"]'), ogTitle: m('meta[property="og:title"]'), lang: document.documentElement.lang,
      h1: document.querySelectorAll("h1").length, ld, imgsNoAlt: [...document.images].filter((i) => !i.hasAttribute("alt")).length,
      links: [...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => h.startsWith(location.origin)),
      adsVisible: [...document.querySelectorAll(".ad-slot")].filter((n) => getComputedStyle(n).display !== "none").length,
    };
  });
  info.links.forEach((l) => links.add(l.split("#")[0]));
  titles.add(info.title); descs.add(info.desc);
  const problems = [];
  if (res.status() !== 200) problems.push("상태 " + res.status());
  if (info.title.length < 10 || info.title.length > 60) problems.push(`제목 길이 ${info.title.length}`);
  if (info.desc.length < 50 || info.desc.length > 160) problems.push(`설명 길이 ${info.desc.length}`);
  if (info.canonical !== cfg.url + (f === "index.html" ? "" : f)) problems.push("canonical " + info.canonical);
  if (!info.ogImage.endsWith("assets/og.png") || !info.ogTitle) problems.push("og 태그");
  if (info.lang !== "ko") problems.push("lang");
  if (info.h1 !== 1) problems.push(`h1 ${info.h1}개`);
  if (!info.ld) problems.push("JSON-LD 오류");
  if (info.imgsNoAlt) problems.push("alt 없는 이미지");
  if (info.adsVisible) problems.push("애드센스 설정 전인데 광고 자리 보임");
  ok(`${f} SEO 기본(제목·설명·canonical·og·h1·구조화 데이터)`, problems.length === 0, problems.join(", ") || `제목 ${info.title.length}자 · 설명 ${info.desc.length}자`);
}
ok("페이지마다 제목·설명이 서로 다름", titles.size === PAGES.length && descs.size === PAGES.length);

/* 2. 내부 링크 전부 열림 */
const broken = [];
// 브라우저로 확인 (Node fetch는 python http.server와 연결 종료 처리가 맞지 않아 가끔 멈춤)
const status = (u) => page.evaluate(async (u) => (await fetch(u, { cache: "no-store" })).status, u);
for (const l of links) { const st = await status(l); if (st !== 200) broken.push(`${l} ${st}`); }
for (const f of ["assets/og.png", "assets/preview.png", "assets/favicon.svg", "assets/clip-labels.json", "sitemap.xml", "robots.txt"]) { const st = await status(BASE + f); if (st !== 200) broken.push(`${f} ${st}`); }
ok(`내부 링크·파일 ${links.size + 6}개 모두 열림`, broken.length === 0, broken.join(", "));

/* 3. sitemap · robots */
const sm = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
ok("sitemap.xml에 공개 페이지 8개, 404 제외", PAGES.every((f) => sm.includes(`<loc>${cfg.url}${f === "index.html" ? "" : f}</loc>`)) && !sm.includes("404"));
ok("robots.txt가 sitemap을 가리킴", fs.readFileSync(path.join(root, "robots.txt"), "utf8").includes(`Sitemap: ${cfg.url}sitemap.xml`));
ok("404 페이지는 검색 제외(noindex)", fs.readFileSync(path.join(root, "404.html"), "utf8").includes('content="noindex"'));
ok("애드센스 미설정 시 ads.txt 없음", !fs.existsSync(path.join(root, "ads.txt")) || !!cfg.adsenseClient);

/* 4. 휴대폰 화면 */
await page.setViewport({ width: 375, height: 812, isMobile: true });
const wide = [];
const edge = [];
for (const w of [375, 1024]) {
  await page.setViewport({ width: w, height: 812, isMobile: w < 768 });
  for (const f of PAGES) {
    await page.goto(BASE + f, { waitUntil: "networkidle0" });
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth,
      // 본문 글자가 화면 가장자리에 붙지 않는지 (좌우 여백 12px 이상)
      tight: [...document.querySelectorAll("h1, h2, p, .logo")].filter((n) => n.offsetParent && n.closest(".panel, .sheet, .stage") === null)
        .filter((n) => { const b = n.getBoundingClientRect(); return b.width && (b.left < 12 || innerWidth - b.right < 12); }).map((n) => n.tagName + ":" + n.textContent.trim().slice(0, 12)) }));
    if (r.sw > w + 1) wide.push(`${w}px ${f} ${r.sw}px`);
    if (r.tight.length) edge.push(`${w}px ${f} ${r.tight.slice(0, 2).join("/")}`);
  }
}
ok("휴대폰 375px·태블릿 1024px에서 가로 스크롤 없음 (7개 페이지)", wide.length === 0, wide.join(", "));
ok("글자가 화면 가장자리에 붙지 않음 (좌우 여백 12px 이상)", edge.length === 0, edge.slice(0, 4).join(" | "));
await page.setViewport({ width: 1400, height: 900 });

/* 5. 애드센스 설정 스크립트: 임시 복사본에 가짜 ID를 넣어 확인 (실제 저장소는 건드리지 않음) */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "site-"));
for (const f of fs.readdirSync(root)) if (!["node_modules", ".git", "tests"].includes(f)) fs.cpSync(path.join(root, f), path.join(tmp, f), { recursive: true });
const fake = { ...cfg, adsenseClient: "ca-pub-1234567890123456", adSlots: { ...cfg.adSlots, "home-mid": "1111111111", "app-top": "2222222222" }, contactEmail: "test@example.com" };
fs.writeFileSync(path.join(tmp, "site.config.json"), JSON.stringify(fake));
execFileSync("node", [path.join(tmp, "scripts/configure.mjs")]);
const idx = fs.readFileSync(path.join(tmp, "index.html"), "utf8");
ok("설정 후: 승인용 애드센스 코드가 <head>에 들어감",
  PAGES.every((f) => { const h = fs.readFileSync(path.join(tmp, f), "utf8"); const head = h.slice(0, h.indexOf("</head>")); return head.includes("adsbygoogle.js?client=ca-pub-1234567890123456") && head.includes('name="google-adsense-account"'); }));
ok("설정 후: ads.txt 생성", fs.readFileSync(path.join(tmp, "ads.txt"), "utf8").trim() === "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0");
ok("설정 후: 문의 이메일 표시", fs.readFileSync(path.join(tmp, "contact.html"), "utf8").includes("mailto:test@example.com"));
ok("설정은 다시 돌려도 중복되지 않음", (() => { execFileSync("node", [path.join(tmp, "scripts/configure.mjs")]); return fs.readFileSync(path.join(tmp, "index.html"), "utf8") === idx; })());

const p2 = await browser.newPage();
await p2.setRequestInterception(true);
p2.on("request", (r) => (r.url().includes("googlesyndication") ? r.respond({ status: 200, contentType: "text/javascript", body: "" }) : r.continue()));
await p2.goto("file://" + path.join(tmp, "index.html"), { waitUntil: "networkidle0" });
const slots = await p2.evaluate(() => [...document.querySelectorAll(".ad-slot")].map((n) => `${n.dataset.adKey}:${getComputedStyle(n).display !== "none" ? "on" : "off"}:${n.querySelector("ins")?.dataset.adSlot || ""}`));
ok("설정 후: 광고 단위 ID가 있는 자리만 보임", slots.join(",") === "home-mid:on:1111111111,home-bottom:off:", slots.join(","));
await p2.goto("file://" + path.join(tmp, "app.html"), { waitUntil: "networkidle0" });
const appSlot = await p2.$eval('.ad-slot[data-ad-key="app-top"]', (n) => getComputedStyle(n).display !== "none");
const pdf = await p2.pdf({ preferCSSPageSize: true, printBackground: true });
const pdfText = Buffer.from(pdf).toString("latin1");
ok("도구 화면 광고 자리 보이고, 인쇄에는 안 나오며 1장 유지", appSlot && pdfPages(pdf) === 1, `${pdfPages(pdf)}장`);
fs.rmSync(tmp, { recursive: true, force: true });

ok("콘솔·스크립트 오류 없음", errors.length === 0, errors.slice(0, 3).join(" | "));
/* 비밀 의견 보내기: 문의 페이지 양식 · 메일 방식 · 폼 서비스 방식(가짜 주소) */
await page.setViewport({ width: 1280, height: 900 });
await page.goto(BASE + "contact.html#feedback", { waitUntil: "networkidle0" });
const fb = await page.evaluate(async () => {
  const r = {};
  const f = document.querySelector("[data-feedback] form");
  r.form = !!f && /운영자만/.test(f.textContent) && !!f.querySelector("textarea") && !!f.querySelector("input[type=email]");
  r.footer = [...document.querySelectorAll(".foot .links a")].some((a) => a.getAttribute("href") === "contact.html#feedback");
  // 짧은 내용은 막음
  f.querySelector("textarea").value = "짧"; f.querySelector(".fb-send").click();
  r.short = /5자 이상/.test(f.querySelector(".fb-msg").textContent);
  // 메일 방식: 내용이 채워진 대체 상자
  f.querySelector("select").value = "오류 제보"; f.querySelector("textarea").value = "스커트 도식화가 휴대폰에서 작게 보여요";
  f.querySelector(".fb-send").click(); await new Promise((x) => setTimeout(x, 300));
  const body = f.querySelector(".fb-fallback textarea").value;
  r.mail = !f.querySelector(".fb-fallback").hidden && body.includes("[종류] 오류 제보") && body.includes("휴대폰에서 작게") && body.includes("[기기 정보]") && f.querySelector(".fb-mail").textContent === window.SITE.contactEmail;
  // 폼 서비스 방식: 가짜 fetch 로 보내는 내용 확인
  const sent = []; const of = window.fetch; window.fetch = async (u, o) => { sent.push([u, [...o.body.entries()]]); return { ok: true }; };
  window.SITE.feedbackEndpoint = "https://forms.example.test/abc"; const box = document.createElement("div"); document.querySelector("main").append(box); window.JakjiFeedback.mount(box);
  const g = box.querySelector("form"); g.querySelector("textarea").value = "공유 링크 기능 좋아요!"; g.querySelector("input[type=email]").value = "me@example.com"; g.querySelector("input[type=checkbox]").checked = false;
  g.querySelector(".fb-send").click(); await new Promise((x) => setTimeout(x, 300)); window.fetch = of;
  const e = Object.fromEntries(sent[0]?.[1] || []);
  r.endpoint = sent.length === 1 && sent[0][0] === "https://forms.example.test/abc" && e["내용"] === "공유 링크 기능 좋아요!" && e.email === "me@example.com" && !("기기 정보" in e) && /전달했습니다/.test(g.querySelector(".fb-msg").textContent);
  return r;
});
ok("비밀 의견 보내기: 문의 페이지 양식·바닥 링크·짧은 글 막기·메일 방식·폼 서비스 방식", Object.values(fb).every(Boolean), JSON.stringify(fb));

await browser.close();
const fail = results.filter((r) => !r).length;
console.log(`\n${results.length - fail}/${results.length} 통과`);
process.exit(fail ? 1 : 0);
