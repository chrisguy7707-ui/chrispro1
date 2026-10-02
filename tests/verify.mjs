/* 작업지시서 메이커 검증: 9품목×남/여×3핏 렌더링, 인쇄 A4 가로 1장, 인치 표기, 원단 프리셋, 저장 파일.
   실행: npm run serve → npm test
   CHROME 환경변수로 Chrome 경로, APP_URL로 주소를 바꿀 수 있음. 결과물은 tests/out/ */
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const URL = process.env.APP_URL || "http://localhost:8766/app.html";
const OUT = new URL_("./out/", import.meta.url);
function URL_(p, b) { return new globalThis.URL(p, b); }
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const pages = (buf) => (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
await page.setViewport({ width: 1500, height: 1000 });
await page.goto(URL, { waitUntil: "networkidle0" });

/* 1. 시작 상태 */
ok("AI 없을 때 직접 선택 안내 표시", await page.$eval("#manualHint", (n) => !n.hidden));
ok("상의 기본: 하의 표기 버튼 숨김", await page.$eval("#labelBox", (n) => n.hidden));

/* 2. 사진 업로드 (참고 사진 칸) */
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
fs.writeFileSync(new URL_("photo.png", OUT), png);
const input = await page.$("#file");
await input.uploadFile(new URL_("photo.png", OUT).pathname);
await page.waitForFunction(() => document.querySelector("#sheetPhoto img"), { timeout: 5000 }).catch(() => {});
ok("사진 업로드 → 참고 사진 칸", !!(await page.$("#sheetPhoto img")));
ok("사진 업로드 안내가 4단계 직접 선택으로 안내", (await page.$eval("#status", (n) => n.textContent)).includes("4단계"));

/* 2-1. 세로로 긴 사진도 레이아웃이 늘어나지 않는지 */
const tall = await page.evaluate(async () => { const c = document.createElement("canvas"); c.width = 400; c.height = 1600;
  const g = c.getContext("2d"); g.fillStyle = "#468"; g.fillRect(0, 0, 400, 1600); return c.toDataURL("image/png").split(",")[1]; });
fs.writeFileSync(new URL_("tall.png", OUT), Buffer.from(tall, "base64"));
await input.uploadFile(new URL_("tall.png", OUT).pathname);
await new Promise((r) => setTimeout(r, 800));
const tallPdf = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
ok("세로로 긴 사진(400×1600) 넣어도 인쇄 1장", pages(tallPdf) === 1, `${pages(tallPdf)}장`);

/* 3. 9개 품목 × 남/여 × 3핏, 전 사이즈 선택, 렌더 + 인쇄 1장 */
const templates = await page.evaluate(() => Object.keys(T));
const selectAll = () => page.evaluate(() => { for (const c of document.querySelectorAll("#sizeChips .chip")) if (c.getAttribute("aria-pressed") === "false") c.click(); });
const setSel = (id, v) => page.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event("change")); }, id, v);
let maxPages = 0, combos = 0, renderFails = [];
for (const g of ["m", "f"]) for (const t of templates) for (const fit of ["regular", "oversize", "slim"]) {
  await page.click(g === "m" ? "#gM" : "#gF");
  await setSel("oTemplate", t); await setSel("oFit", fit); await selectAll();
  const r = await page.evaluate(() => {
    const rows = [...document.querySelectorAll("#specTable tr")].slice(1);
    const nums = rows.flatMap((tr) => [...tr.querySelectorAll("td[contenteditable]")].map((td) => Number(td.textContent)));
    return {
      want: T[state.opt.template].rows.length, got: rows.length,
      cols: document.querySelectorAll("#specTable tr:first-child th").length,
      bad: nums.filter((n) => !Number.isFinite(n) || n <= 0).length,
      svg: ["#svgFront svg", "#svgBack svg"].every((s) => document.querySelector(s)?.querySelectorAll("path").length > 3),
      nan: document.getElementById("svgFront").innerHTML.includes("NaN") || document.getElementById("svgBack").innerHTML.includes("NaN"),
      label: document.getElementById("labelBox").hidden === !isBottom(),
    };
  });
  const sizes = g === "m" ? 7 : 5;
  if (r.want !== r.got || r.cols !== sizes + 4 || r.bad || !r.svg || r.nan || !r.label) renderFails.push(`${g}/${t}/${fit} ${JSON.stringify(r)}`);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const n = pages(Buffer.from(pdf)); maxPages = Math.max(maxPages, n); combos++;
  if (n !== 1) fs.writeFileSync(new URL_(`fail_${g}_${t}_${fit}.pdf`, OUT), pdf);
}
ok(`${combos}개 조합(품목9×성별2×핏3) 도식화·치수표 정상`, renderFails.length === 0, renderFails.slice(0, 3).join(" | "));
ok(`인쇄 A4 가로 1장 (${combos}개 조합 최대 ${maxPages}장)`, maxPages === 1);

/* 4. 최악 조건: AI 결과로 긴 봉제사양 10줄·부자재 8줄 + 남 7사이즈 */
await page.click("#gM");
await page.evaluate(() => applyAI({
  itemName: "오버핏 기모 후드 집업 점퍼 (테스트용 긴 품명)", template: "hoodie", fit: "oversize", neck: "hood", closure: "zip", rib: "rib", shape: "a",
  pockets: ["kangaroo"], color: "멜란지 그레이", fabric: "기모 쭈리 30수 (추정)", mix: "면 80% 폴리 20% (추정)", weight: "380g/㎡ (추정)",
  trims: Array.from({ length: 8 }, (_, i) => ({ type: "부자재" + i, name: "테스트 품목 이름이 조금 긴 경우 " + i, spec: "규격 컬러 설명 " + i, qty: String(i + 1) })),
  sewing: Array.from({ length: 10 }, (_, i) => `봉제 사양 ${i + 1}: 어깨선 오버록 후 늘어남 방지 테이프, 2본침 상침 0.6cm 처리`),
  notes: ["주의사항 테스트 문장 하나", "주의사항 테스트 문장 둘", "주의사항 테스트 문장 셋"],
}));
await selectAll();
const worst = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
fs.writeFileSync(new URL_("worst_case.pdf", OUT), worst);
ok("AI 결과 최대치(봉제 10줄·부자재 8줄·7사이즈) 인쇄 1장", pages(worst) === 1, `${pages(worst)}장, 배율 ${await page.$eval("#sheet", (n) => n.style.getPropertyValue("--print-zoom"))}`);
/* 직접 입력으로 더 길어진 경우: 봉제사양에 줄 추가 */
await page.evaluate(() => { const ol = document.getElementById("sewList"); for (let i = 0; i < 4; i++) ol.insertAdjacentHTML("beforeend", "<li>직접 추가한 봉제 사양 줄 테스트</li>"); ol.dispatchEvent(new Event("input", { bubbles: true })); });
const typed = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
ok("작업지시서에서 직접 줄을 더 추가해도 인쇄 1장", pages(typed) === 1, `${pages(typed)}장`);
ok("기본 내용일 때 인쇄 배율 .93 유지", await page.evaluate(() => { const o = state.ai; state.ai = null; renderContent(); const z = document.getElementById("sheet").style.getPropertyValue("--print-zoom"); state.ai = o; renderContent(); return z === "0.930"; }));
ok("AI 결과 → 4단계 품명·컬러 입력칸 동기화", await page.evaluate(() => document.getElementById("oItem").value.startsWith("오버핏") && document.getElementById("oColor").value === "멜란지 그레이"));

/* 5. 하의 인치 표기 */
const lbl = async (mode) => { await page.click(`#labelBox [data-label="${mode}"]`); return page.$eval("#fSizes", (n) => n.textContent); };
await page.click("#gM"); await setSel("oTemplate", "pants"); await selectAll();
const m = { num: await lbl("num"), both: await lbl("both"), inch: await lbl("inch") };
ok("남 바지 호칭/병기/인치", m.num === "80 / 85 / 90 / 95 / 100 / 105 / 110" && m.both.startsWith("80(28)") && m.inch === "28 / 29 / 30 / 31 / 32 / 34 / 36", JSON.stringify(m));
await page.click("#gF"); await setSel("oTemplate", "skirt");
ok("여 스커트 인치", (await lbl("inch")) === "24 / 26 / 28 / 30 / 32");
await lbl("both");
await setSel("oTemplate", "top_short");
ok("상의로 바꾸면 인치 표기 사라짐", !(await page.$eval("#fSizes", (n) => n.textContent)).includes("("));

/* 6. 원단 프리셋 */
const fab = await page.evaluate(() => FABRICS.map((f) => {
  const s = document.getElementById("oFabric"); s.value = f[0]; s.dispatchEvent(new Event("change"));
  return s.value === f[0] && document.getElementById("fFabric").textContent === f[1] && document.getElementById("fMix").textContent === f[2] && document.getElementById("fWeight").textContent === f[3];
}));
ok(`원단 프리셋 ${fab.length}종 → 원단·혼용률·중량 채움`, fab.every(Boolean));
ok("품목별 추천 원단 그룹 (후드티 → 쭈리 맨 위)", await page.evaluate(() => {
  const s = document.getElementById("oTemplate"); s.value = "hoodie"; s.dispatchEvent(new Event("change"));
  return document.querySelector("#oFabric optgroup").children[0].value.startsWith("쭈리") && document.getElementById("oFabric").value !== "";
}));
ok("컬러·품명 입력 → 작업지시서", await page.evaluate(() => {
  const c = document.getElementById("oColor"), i = document.getElementById("oItem");
  c.value = "블랙"; c.dispatchEvent(new Event("input")); i.value = "크롭 후드"; i.dispatchEvent(new Event("input"));
  const a = document.getElementById("fColor").textContent === "블랙" && document.getElementById("fItem").textContent === "크롭 후드";
  const s = document.getElementById("oTemplate"); s.value = "pants"; s.dispatchEvent(new Event("change"));
  const keep = document.getElementById("fItem").textContent === "크롭 후드";
  i.value = ""; i.dispatchEvent(new Event("input"));
  return a && keep && document.getElementById("fItem").textContent === "바지";
}));

/* 7. 키 없이 분석 버튼 → 오류 안내 + 키 칸 열림 (네트워크 호출 없음) */
let gemCalls = 0; page.on("request", (r) => { if (r.url().includes("generativelanguage")) gemCalls++; });
await page.evaluate(() => { document.getElementById("gKey").value = ""; });
await page.click("#analyzeBtn"); await new Promise((r) => setTimeout(r, 300));
ok("키 없이 분석 → 직접 선택 안내, 외부 호출 없음", gemCalls === 0 && (await page.$eval("#status", (n) => n.className.includes("err") && n.textContent.includes("4단계"))) && (await page.$eval("#keyBox", (n) => n.open)));

/* 8. 저장 파일 */
const html = await page.evaluate(() => sheetHTML());
fs.writeFileSync(new URL_("saved.html", OUT), html);
ok("작업지시서 HTML 저장 (편집 속성 제거)", html.includes("작업지시서") && !/<[^>]*\scontenteditable[\s=>]/.test(html));
const svgOk = await page.evaluate(() => ["front", "back"].every((v) => !new DOMParser().parseFromString(buildSVG(v), "image/svg+xml").querySelector("parsererror")));
ok("도식화 SVG 형식 정상", svgOk);
const page2 = await browser.newPage(); await page2.goto(new URL_("saved.html", OUT).href);
const p2 = Buffer.from(await page2.pdf({ preferCSSPageSize: true, printBackground: true })); await page2.close();
ok("저장한 HTML 파일 인쇄도 1장", pages(p2) === 1, `${pages(p2)}장`);

/* 9. 모바일 화면 */
await page.setViewport({ width: 375, height: 812, isMobile: true });
ok("모바일 375px 가로 스크롤 없음", await page.evaluate(() => document.documentElement.scrollWidth <= 376), String(await page.evaluate(() => document.documentElement.scrollWidth)));
await page.setViewport({ width: 1500, height: 1000 });
await page.screenshot({ path: new URL_("desktop.png", OUT).pathname, fullPage: true });

ok("콘솔·스크립트 오류 없음", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
const fail = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - fail}/${results.length} 통과`);
process.exit(fail ? 1 : 0);
