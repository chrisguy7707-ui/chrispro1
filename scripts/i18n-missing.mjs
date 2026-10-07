/* 영어 화면에서 번역이 빠진 한국어 문장 찾기 (assets/i18n-en.js 사전 보충용)
   실행: npm run serve → node scripts/i18n-missing.mjs  (결과: tests/out/i18n-missing.txt)
   도구 화면을 ?lang=en으로 열고 소분류 34종 × 남녀 × 모든 탭·생산 준비·패턴·대화 상자를 한 번씩 그린 뒤, 사전에 없던 문장을 모음 */
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const URL = (process.env.APP_URL || "http://localhost:8766/app.html") + "?lang=en";
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });
page.on("dialog", (d) => d.dismiss());
await page.evaluateOnNewDocument(() => { window.JAKJI_NO_MAILTO = true; try { localStorage.clear(); } catch (e) {} });
await page.goto(URL, { waitUntil: "networkidle0" });
const exercise = async (page) => page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const click = (id) => document.getElementById(id)?.click();
  const tick = async () => { I18N.flush(); await sleep(0); I18N.flush(); };
  for (const g of ["gM", "gF"]) for (const id of Object.keys(STYLES)) {
    click("tabSheetBtn"); click(g); chooseStyle(id); await tick();
    if (isBottom()) for (const l of ["num", "inch", "both"]) { document.querySelector(`[data-label="${l}"]`)?.click(); await tick(); }
    click("tabEditBtn"); await tick();
    click("tabProdBtn"); for (const p of ["check", "cost", "order", "care", "sample"]) { document.querySelector(`.prod-nav [data-p="${p}"]`).click(); await tick(); }
    click("tabPatBtn"); await tick();
    preparePrint(); await tick();
    click("tabOlzBtn"); await tick();
  }
  click("tabSheetBtn");
  for (const fit of ["regular", "oversize", "slim"]) { const s = document.getElementById("oFit"); s.value = fit; s.dispatchEvent(new Event("change")); await tick(); }
  // 패턴 탭: 품목 목록 전체 + 프리셋
  click("tabPatBtn"); const pt = document.getElementById("patType");
  for (const o of [...pt.options]) { pt.value = o.value; pt.dispatchEvent(new Event("change")); await tick();
    const pp = document.getElementById("patPreset"); for (const q of [...pp.options]) { pp.value = q.value; pp.dispatchEvent(new Event("change")); await tick(); } preparePrint(); await tick(); }
  click("tabSheetBtn");
  // 생산 준비: 원가·발주·케어·샘플 채우기
  click("tabProdBtn");
  document.querySelector('.prod-nav [data-p="cost"]').click();
  for (const [k, v] of Object.entries({ fab: 6000, yield: 1.5, trim: 800, labor: 5000, etc: 500, fixed: 100000, qty: 100, price: 39000, fee: 10 })) { const n = document.querySelector(`[data-c="${k}"]`); n.value = v; n.dispatchEvent(new Event("input", { bubbles: true })); }
  await tick();
  document.querySelector('.prod-nav [data-p="order"]').click();
  const oc = document.getElementById("ordColors"); oc.value = "블랙, 아이보리"; oc.dispatchEvent(new Event("input", { bubbles: true })); await tick();
  document.querySelectorAll("#ordTable input").forEach((n, i) => { n.value = i + 1; n.dispatchEvent(new Event("input", { bubbles: true })); });
  click("ordApply"); await tick();
  document.querySelector('.prod-nav [data-p="care"]').click(); await tick();
  click("careToTrim"); await tick();
  document.querySelector('.prod-nav [data-p="sample"]').click();
  document.querySelectorAll("#smpTable input").forEach((n, i) => { n.value = 50 + i * 3; n.dispatchEvent(new Event("input", { bubbles: true })); }); await tick();
  click("smpSave"); await tick();
  document.querySelectorAll("#smpTable input").forEach((n, i) => { n.value = 51 + i * 3; n.dispatchEvent(new Event("input", { bubbles: true })); }); await tick();
  click("smpSave"); await tick();
  document.querySelector('.prod-nav [data-p="check"]').click(); await tick();
  // 대화 상자
  click("jobsBtn"); await sleep(300); await tick();
  click("jobSaveCur"); await sleep(400); await tick();
  document.getElementById("jobsDlg").close();
  click("shareBtn"); await sleep(400); await tick(); document.getElementById("shareDlg").close();
  click("fbBtn"); await sleep(100); await tick(); document.getElementById("fbDlg").close();
  // 편집 탭 도구
  click("tabEditBtn"); for (const b of document.querySelectorAll(".ed-bar [data-tool]")) { b.click(); await tick(); }
  click("tabSheetBtn"); await tick();
  return [...I18N.miss];
});
const miss = await exercise(page);
// 소스의 한국어 문자열 조각도 확인 (위 시나리오에서 안 나오는 상태 메시지 등)
const src = fs.readFileSync(new globalThis.URL("../app.html", import.meta.url), "utf8") + ["pattern.js", "pattern-garments.js", "outline.js", "feedback.js"].map((f) => fs.readFileSync(new globalThis.URL("../assets/" + f, import.meta.url), "utf8")).join("\n");
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1").replace(/<!--[\s\S]*?-->/g, "");
const lits = [...new Set([...code.matchAll(/"([^"\n]*[가-힣][^"\n]*)"|`([^`]*[가-힣][^`]*)`|'([^'\n]*[가-힣][^'\n]*)'/g)].map((m) => m[1] || m[2] || m[3]))];
const pieces = [...new Set(lits.flatMap((x) => x.split(/\$\{[^}]*\}|<[^>]+>/)).map((x) => x.trim()).filter((x) => /[가-힣]/.test(x)))];
const srcMiss = await page.evaluate((a) => { const before = new Set(I18N.miss); a.forEach((x) => I18N.t(x)); return [...I18N.miss].filter((x) => !before.has(x)); }, pieces);
fs.mkdirSync(new globalThis.URL("../tests/out/", import.meta.url), { recursive: true });
fs.writeFileSync(new globalThis.URL("../tests/out/i18n-missing.txt", import.meta.url), "# 화면에서\n" + miss.join("\n") + "\n\n# 소스 조각에서 (참고)\n" + srcMiss.join("\n") + "\n");
console.log(`화면에서 빠진 문장 ${miss.length}개 · 소스 조각 ${srcMiss.length}개 → tests/out/i18n-missing.txt`);
await browser.close();
