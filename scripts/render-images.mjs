/* 대문 미리보기(assets/preview.png)와 공유 이미지(assets/og.png, 1200×630) 생성
   영어판: assets/preview-en.png·webp, assets/og-en.png (도구를 ?lang=en으로 열어 찍음, en/index.html이 씀)
   실행: npm run serve 상태에서 npm run images (설치된 Chrome 사용) */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.APP_URL || "http://localhost:8766/app.html";
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });

async function render(en) {
  const sfx = en ? "-en" : "";
/* 1. 예시 작업지시서: 오버핏 후드티, 남 90~110 */
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1100, deviceScaleFactor: 1.4 });
await page.goto(APP + (en ? "?lang=en" : "?lang=ko"), { waitUntil: "networkidle0" });
await page.evaluate((en) => {
  const set = (id, v, ev = "change") => { const n = document.getElementById(id); n.value = v; n.dispatchEvent(new Event(ev)); };
  set("oTemplate", "hoodie"); set("oFit", "oversize"); set("oFabric", "기모 쭈리");
  set("oColor", en ? "Melange grey" : "멜란지 그레이", "input"); set("oItem", en ? "Oversized brushed hoodie" : "오버핏 기모 후드티", "input");
  document.getElementById("fBrand").textContent = "MY BRAND";
  document.getElementById("fQty").textContent = en ? "50 per size" : "사이즈별 50";
  document.getElementById("sheetPhoto").innerHTML = '<svg viewBox="0 0 100 100" width="90" height="90" aria-hidden="true"><rect width="100" height="100" fill="#eef1ee"/><path d="M35 22 L20 30 L12 50 L22 54 L26 44 L26 86 L74 86 L74 44 L78 54 L88 50 L80 30 L65 22 Q50 34 35 22 Z" fill="#9aa39d"/></svg>';
  window.I18N?.flush();
}, en);
const sheet = await page.$("#sheet");
const box = await sheet.boundingBox();
await sheet.screenshot({ path: path.join(root, `assets/preview${sfx}.png`) });
await sheet.screenshot({ path: path.join(root, `assets/preview${sfx}.webp`), type: "webp", quality: 82 });   // 대문용 (가벼움), png는 대체용
const preview = { w: Math.round(box.width * 1.4), h: Math.round(box.height * 1.4) };

/* 2. 공유 이미지 */
const img = fs.readFileSync(path.join(root, `assets/preview${sfx}.png`)).toString("base64");
const og = await browser.newPage();
await og.setViewport({ width: 1200, height: 630 });
await og.setContent(`<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; position: relative; font-family: "Pretendard Variable", "Apple SD Gothic Neo", sans-serif; color: #17171c; background: #fbf8f2; }
  .blob { position: absolute; border-radius: 50%; filter: blur(70px); }
  .b1 { width: 520px; height: 520px; right: -120px; top: -180px; background: #ffe14d; opacity: .7; }
  .b2 { width: 420px; height: 420px; left: -160px; bottom: -220px; background: #b8a6ff; opacity: .55; }
  .t { position: absolute; left: 70px; top: 96px; width: 560px; }
  .eye { display: inline-block; background: #fff; border: 1px solid #ebe5d9; border-radius: 999px; padding: 6px 18px; font-weight: 700; font-size: 22px; }
  .sub { font-size: 40px; font-weight: 800; letter-spacing: -0.04em; margin-top: 4px; }
  h1 { font-size: 150px; line-height: 1.05; margin: 22px 0 0; letter-spacing: -0.05em; font-weight: 800; }
  .tape { height: 20px; width: 340px; margin-top: 22px; border-radius: 999px; transform: rotate(-2deg); background: #ffe14d repeating-linear-gradient(90deg, rgba(23,23,28,.55) 0 2px, transparent 2px 12px) bottom / 100% 8px no-repeat; }
  p { font-size: 28px; line-height: 1.5; margin: 26px 0 0; font-weight: 600; }
  .tag { display: inline-block; margin-top: 24px; background: #17171c; color: #fff; font-weight: 700; font-size: 24px; padding: 12px 26px; border-radius: 999px; }
  .doc { position: absolute; left: 650px; top: 80px; width: 620px; background: #fff; padding: 12px; border-radius: 22px; transform: rotate(3deg); box-shadow: 0 30px 60px -20px rgba(23,23,28,.45); }
  .doc img { width: 100%; display: block; border-radius: 12px; }
  .stk { position: absolute; left: 618px; top: 52px; z-index: 2; width: 110px; height: 110px; border-radius: 50%; background: #ff6b4a; color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 22px; transform: rotate(-12deg); }
</style></head><body>
<div class="blob b1"></div><div class="blob b2"></div>
<div class="t">${en ? `<span class="eye">✂ Indie brands · fashion students</span><h1>Jakji</h1><div class="sub">Apparel tech pack maker</div><div class="tape"></div>
<p>Flat sketches, size spec and sewing spec on one page</p><span class="tag">Make a tech pack — free</span></div>
<div class="stk">One A4</div>` : `<span class="eye">✂ 1인 브랜드 · 패션 전공 학생</span><h1>작지</h1><div class="sub">옷 작업지시서 메이커</div><div class="tape"></div>
<p>사진 한 장으로 도식화·치수표·봉제 사양까지</p><span class="tag">무료 작업지시서 만들기</span></div>
<div class="stk">A4 한 장</div>`}<div class="doc"><img src="data:image/png;base64,${img}"></div>
</body></html>`, { waitUntil: "networkidle0" });
await og.screenshot({ path: path.join(root, `assets/og${sfx}.png`) });

  return preview;
}
const preview = await render(false), previewEn = await render(true);
await browser.close();

/* 대문 <img>의 width/height를 실제 크기로 맞춤 (레이아웃 밀림 방지) */
const idx = path.join(root, "index.html");
fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace(/(<img fetchpriority="high" src="assets\/preview\.png" )width="\d+" height="\d+"/, `$1width="${preview.w}" height="${preview.h}"`));
const idxEn = path.join(root, "en/index.html");
if (fs.existsSync(idxEn)) fs.writeFileSync(idxEn, fs.readFileSync(idxEn, "utf8").replace(/(<img fetchpriority="high" src="\.\.\/assets\/preview-en\.png" )width="\d+" height="\d+"/, `$1width="${previewEn.w}" height="${previewEn.h}"`));
console.log(`preview.png ${preview.w}×${preview.h}, og.png 1200×630`);
