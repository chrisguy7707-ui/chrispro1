/* 빈 엑셀 양식(assets/templates/techpack-<품목>-<m|w>.xlsx, 영문은 -en.xlsx) 만들기: 도구(app.html)의 엑셀 내보내기를 그대로 써서 품목 9종 × 남·여.
   머리 정보·수량·컬러는 비우고, 도식화 그림·표준 참고 치수·기본 부자재·봉제 사양·주의사항만 채움 → form.html '양식 다운로드'가 링크.
   실행: npm run serve 상태에서 npm run templates (도구의 치수·봉제 사양·도식화가 바뀌면 다시 만들 것) */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.APP_URL || "http://localhost:8766/app.html";
const LIST = { "top-short": "top_short", "top-long": "top_long", shirt: "shirt", hoodie: "hoodie", jacket: "jacket", pants: "pants", shorts: "shorts", skirt: "skirt", dress: "dress" };
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: process.env.CI ? ["--no-sandbox"] : [] });
const dir = path.join(root, "assets/templates"); fs.mkdirSync(dir, { recursive: true });
let total = 0, count = 0;
for (const sheetLang of ["ko", "en"]) {   // 작업지시서 언어: 한국어 양식 18개 + 영문 양식 18개(-en)
  const page = await browser.newPage(); await page.setViewport({ width: 1400, height: 1000 });
  await page.evaluateOnNewDocument((sl) => { try { localStorage.clear(); localStorage.setItem("jakji_lang", "ko"); localStorage.setItem("jakji_sheetlang", sl); } catch (e) {} }, sheetLang);
  await page.goto(APP + "?lang=ko", { waitUntil: "networkidle0" });
  if (sheetLang === "en") await page.waitForFunction(() => window.SHEET_LANG === "en" && window.I18N, { timeout: 20000 });
  for (const [slug, tpl] of Object.entries(LIST)) for (const g of ["m", "w"]) {
    const b64 = await page.evaluate(async (tpl, g) => {
      document.getElementById(g === "m" ? "gM" : "gF").click();
      const s = document.getElementById("oTemplate"); s.value = tpl; s.dispatchEvent(new Event("change", { bubbles: true })); applyTemplateDefaults(); renderAll();
      for (const id of ["fBrand", "fStyle", "fSeason", "fDate", "fQty", "fDue", "fDesigner", "fFactory", "fColor", "fRound"]) document.getElementById(id).textContent = "";
      state.swatches = []; state.photo = null; state.prod.colors = ""; state.prod.qty = {}; renderSwatches(); renderSheetPhoto();
      await new Promise((r) => setTimeout(r, 300));
      const bytes = await buildXlsx(); let str = ""; for (let i = 0; i < bytes.length; i += 0x8000) str += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(str);
    }, tpl, g);
    const f = path.join(dir, `techpack-${slug}-${g}${sheetLang === "en" ? "-en" : ""}.xlsx`); fs.writeFileSync(f, Buffer.from(b64, "base64")); total += fs.statSync(f).size; count++;
  }
  await page.close();
}
console.log(`양식 ${count}개 · ${Math.round(total / 1024)}KB → assets/templates/`);
await browser.close();
