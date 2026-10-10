/* 앱 아이콘 만들기 (PWA·홈 화면 추가용): assets/favicon.svg → assets/icons/*.png
   icon-192·icon-512 = 둥근 모서리, maskable-512 = 가장자리까지 채운 바탕(안드로이드가 모양을 잘라도 안 잘리게 안쪽 80%에 그림),
   apple-touch-icon = 아이폰 홈 화면용(모서리는 iOS가 둥글게 함). 실행: npm run icons */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svg = fs.readFileSync(path.join(root, "assets/favicon.svg"), "utf8");
const art = svg.replace(/<svg[^>]*>/, "").replace("</svg>", "").replace(/<rect width="64" height="64" rx="18" fill="#17171c"\/>/, "");
const full = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#17171c"/><g transform="translate(${32 - 32 * scale} ${32 - 32 * scale}) scale(${scale})">${art}</g></svg>`;
const JOBS = [["icon-192.png", 192, svg], ["icon-512.png", 512, svg], ["maskable-512.png", 512, full(0.74)], ["apple-touch-icon.png", 180, full(0.86)]];
const out = path.join(root, "assets/icons"); fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: process.env.CI ? ["--no-sandbox"] : [] });
const page = await browser.newPage();
for (const [name, size, markup] of JOBS) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace("<svg ", `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
  await page.screenshot({ path: path.join(out, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
await browser.close();
console.log("아이콘 " + JOBS.length + "개 → assets/icons/");
