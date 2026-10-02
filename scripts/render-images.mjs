/* 대문 미리보기(assets/preview.png)와 공유 이미지(assets/og.png, 1200×630) 생성
   실행: npm run serve 상태에서 npm run images (설치된 Chrome 사용) */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.APP_URL || "http://localhost:8766/app.html";
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });

/* 1. 예시 작업지시서: 오버핏 후드티, 남 90~110 */
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1100, deviceScaleFactor: 1.4 });
await page.goto(APP, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  const set = (id, v, ev = "change") => { const n = document.getElementById(id); n.value = v; n.dispatchEvent(new Event(ev)); };
  set("oTemplate", "hoodie"); set("oFit", "oversize"); set("oFabric", "기모 쭈리");
  set("oColor", "멜란지 그레이", "input"); set("oItem", "오버핏 기모 후드티", "input");
  document.getElementById("fBrand").textContent = "MY BRAND";
  document.getElementById("fQty").textContent = "사이즈별 50";
  document.getElementById("sheetPhoto").innerHTML = '<svg viewBox="0 0 100 100" width="90" height="90" aria-hidden="true"><rect width="100" height="100" fill="#eef1ee"/><path d="M35 22 L20 30 L12 50 L22 54 L26 44 L26 86 L74 86 L74 44 L78 54 L88 50 L80 30 L65 22 Q50 34 35 22 Z" fill="#9aa39d"/></svg>';
});
const sheet = await page.$("#sheet");
const box = await sheet.boundingBox();
await sheet.screenshot({ path: path.join(root, "assets/preview.png") });
const preview = { w: Math.round(box.width * 1.4), h: Math.round(box.height * 1.4) };

/* 2. 공유 이미지 */
const img = fs.readFileSync(path.join(root, "assets/preview.png")).toString("base64");
const og = await browser.newPage();
await og.setViewport({ width: 1200, height: 630 });
await og.setContent(`<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@500;700&display=swap" rel="stylesheet">
<style>
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; font-family: "IBM Plex Sans KR", "Apple SD Gothic Neo", sans-serif; color: #eaf3ee;
    background-color: #2f5d46; background-image: linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px); background-size: 24px 24px; }
  .t { position: absolute; left: 70px; top: 120px; width: 520px; }
  h1 { font-size: 76px; line-height: 1.12; margin: 0; letter-spacing: -0.04em; font-weight: 700; }
  .tape { height: 14px; width: 380px; margin-top: 20px; border-bottom: 3px solid #f2c230; background-image: linear-gradient(90deg, #f2c230 2px, transparent 2px); background-size: 11px 9px; background-repeat: repeat-x; background-position: bottom; }
  p { font-size: 28px; line-height: 1.5; margin: 28px 0 0; font-weight: 500; }
  .tag { display: inline-block; margin-top: 26px; background: #f2c230; color: #244a37; font-weight: 700; font-size: 24px; padding: 8px 18px; border-radius: 10px; }
  .doc { position: absolute; left: 640px; top: 70px; width: 640px; background: #fff; padding: 10px; border-radius: 6px; transform: rotate(-3deg); box-shadow: 0 20px 50px rgba(0,0,0,.4); }
  .doc img { width: 100%; display: block; }
</style></head><body>
<div class="t"><h1>옷만들기<br>도면 메이커</h1><div class="tape"></div>
<p>사진 한 장으로 도식화·치수표·봉제 사양까지</p><span class="tag">무료 작업지시서 만들기</span></div>
<div class="doc"><img src="data:image/png;base64,${img}"></div>
</body></html>`, { waitUntil: "networkidle0" });
await og.screenshot({ path: path.join(root, "assets/og.png") });

await browser.close();

/* 대문 <img>의 width/height를 실제 크기로 맞춤 (레이아웃 밀림 방지) */
const idx = path.join(root, "index.html");
fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace(/(<img src="assets\/preview\.png" )width="\d+" height="\d+"/, `$1width="${preview.w}" height="${preview.h}"`));
console.log(`preview.png ${preview.w}×${preview.h}, og.png 1200×630`);
