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
/* 공개 사이트(github.io) 검사: GitHub CDN이 자동화 브라우저에만 봇 탐지 스크립트(사이트 루트의 무작위 경로)를 끼워 넣음.
   일반 브라우저에서는 없으므로, 우리 경로(/chrispro1/) 밖의 같은 도메인 요청은 막고 일반 방문자 기준으로 확인 */
if (/github\.io/.test(process.env.APP_URL || process.env.SITE_URL || "")) {
  await page.setRequestInterception(true);
  page.on("request", (r) => { const u = new globalThis.URL(r.url()); if (u.hostname.endsWith("github.io") && !u.pathname.startsWith("/chrispro1/")) r.abort(); else r.continue(); });
}
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
const LIVE = /github\.io/.test(process.env.APP_URL || "");
page.on("console", (m) => { if (m.type() === "error" && !(LIVE && m.text().includes("ERR_FAILED"))) errors.push("console: " + m.text()); });  // 막은 봇 탐지 스크립트 오류는 제외
await page.setViewport({ width: 1500, height: 1000 });
/* 사진이 밖으로 나가지 않는지: 모든 요청 기록 (기기 안 인식은 GET으로 모델만 받음) */
const sent = [];
page.on("request", (r) => { if (r.method() !== "GET" || r.url().includes("generativelanguage")) sent.push(`${r.method()} ${r.url()}`); });
await page.goto(URL, { waitUntil: "networkidle0" });

/* 1. 시작 상태 */
ok("키 없을 때 기기 안 인식 안내 표시", await page.$eval("#manualHint", (n) => !n.hidden && n.textContent.includes("기기 안")));
ok("상의 기본: 하의 표기 버튼 숨김", await page.$eval("#labelBox", (n) => n.hidden));

/* 2. 사진 업로드 (참고 사진 칸) */
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
fs.writeFileSync(new URL_("photo.png", OUT), png);
const input = await page.$("#file");
await input.uploadFile(new URL_("photo.png", OUT).pathname);
await page.waitForFunction(() => document.querySelector("#sheetPhoto img"), { timeout: 5000 }).catch(() => {});
ok("사진 업로드 → 참고 사진 칸", !!(await page.$("#sheetPhoto img")));
const waitDone = () => page.waitForFunction(() => /인식했습니다|실패/.test(document.getElementById("status").textContent), { timeout: 240000 });
const hfBefore = sent.length;
ok("첫 사진: 모델(23MB)을 받기 전에 묻고 자동으로 받지 않음",
  (await page.$eval("#status", (n) => n.textContent.includes("23MB"))) && !(await page.evaluate(() => /인식했습니다/.test(document.getElementById("status").textContent))));
await page.click("#analyzeBtn");
await waitDone();
ok("버튼을 누르면 기기 안 인식, 확신도는 높음·보통·낮음으로 표시 (퍼센트 없음)",
  await page.$eval("#status", (n) => /확신 (높음|보통|낮음)/.test(n.textContent) && !/%/.test(n.textContent)) && (await page.$$eval("#guess small", (a) => a.every((x) => /순위/.test(x.textContent)))));

/* 2-0. 기기 안 인식: 앱이 그린 도식화를 사진처럼 올려서 품목을 맞히는지 (모델 다운로드에 인터넷 필요) */
const flatPng = (t) => page.evaluate(async (t) => {
  const keep = { ...state.opt }; state.opt.template = t; applyTemplateDefaults();   // 품목 기본 디테일(후드 등)로 그림
  const svg = buildSVG("front").replace("<svg ", '<svg width="480" height="480" '); Object.assign(state.opt, keep); syncControls();
  const img = new Image(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); await img.decode();
  const c = document.createElement("canvas"); c.width = 512; c.height = 512; const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, 512, 512); g.drawImage(img, 16, 16, 480, 480);
  return c.toDataURL("image/png").split(",")[1];
}, t);
const recog = [];
for (const t of ["hoodie", "shirt", "pants", "shorts", "skirt", "pouch"]) {
  fs.writeFileSync(new URL_(`flat_${t}.png`, OUT), Buffer.from(await flatPng(t), "base64"));
  await page.evaluate(() => { document.getElementById("status").textContent = ""; });
  await input.uploadFile(new URL_(`flat_${t}.png`, OUT).pathname);
  await waitDone();
  const got = await page.evaluate(() => [state.opt.template, document.getElementById("status").className.includes("err"), document.querySelectorAll("#guess button").length]);
  recog.push(`${t}→${got[0]}${got[1] ? "(오류)" : ""}`);
  if (got[2] !== 3) recog.push("후보 버튼 " + got[2]);
}
ok("기기 안 인식: 도식화 6종(파우치 포함) 품목 맞힘 + 후보 3개 표시", recog.every((x) => /^(\w+)→\1$/.test(x)), recog.join(" "));
await page.evaluate(() => document.querySelector("#guess button:nth-child(2)").click());
ok("인식 후보 버튼으로 품목 바꾸기", await page.evaluate(() => state.opt.template === document.querySelector('#guess button[aria-pressed="true"]').dataset.t && document.querySelector("#guess button:nth-child(2)").getAttribute("aria-pressed") === "true"));

/* 2-1. 세로로 긴 사진도 레이아웃이 늘어나지 않는지 */
const tall = await page.evaluate(async () => { const c = document.createElement("canvas"); c.width = 400; c.height = 1600;
  const g = c.getContext("2d"); g.fillStyle = "#468"; g.fillRect(0, 0, 400, 1600); return c.toDataURL("image/png").split(",")[1]; });
fs.writeFileSync(new URL_("tall.png", OUT), Buffer.from(tall, "base64"));
await page.evaluate(() => { document.getElementById("status").textContent = ""; });
await input.uploadFile(new URL_("tall.png", OUT).pathname);
await waitDone();
const tallPdf = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
ok("세로로 긴 사진(400×1600) 넣어도 인쇄 1장", pages(tallPdf) === 1, `${pages(tallPdf)}장`);

/* 3. 9개 품목 × 남/여 × 3핏, 전 사이즈 선택, 렌더 + 인쇄 1장 */
const templates = await page.evaluate(() => Object.keys(T));
const selectAll = () => page.evaluate(() => { for (const c of document.querySelectorAll("#sizeChips .chip")) if (c.getAttribute("aria-pressed") === "false") c.click(); });
const setSel = (id, v) => page.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event("change")); }, id, v);
let maxPages = 0, combos = 0, renderFails = [];
for (const g of ["m", "f"]) for (const t of templates) for (const fit of ["regular", "oversize", "slim"]) {
  await page.evaluate((sel) => document.querySelector(sel).click(), g === "m" ? "#gM" : "#gF");
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
  const sizes = t === "pouch" ? 3 : g === "m" ? 7 : 5;   // 잡화는 S·M·L
  if (r.want !== r.got || r.cols !== sizes + 4 || r.bad || !r.svg || r.nan || !r.label) renderFails.push(`${g}/${t}/${fit} ${JSON.stringify(r)}`);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const n = pages(Buffer.from(pdf)); maxPages = Math.max(maxPages, n); combos++;
  if (n !== 1) fs.writeFileSync(new URL_(`fail_${g}_${t}_${fit}.pdf`, OUT), pdf);
}
ok(`${combos}개 조합(품목10×성별2×핏3) 도식화·치수표 정상`, renderFails.length === 0, renderFails.slice(0, 3).join(" | "));
ok(`인쇄 A4 가로 1장 (${combos}개 조합 최대 ${maxPages}장)`, maxPages === 1);

/* 4. 최악 조건: AI 결과로 긴 봉제사양 10줄·부자재 8줄 + 남 7사이즈 */
await page.evaluate((sel) => document.querySelector(sel).click(), "#gM");
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

/* 4-1. 파우치(잡화): S·M·L, 성별 버튼 숨김, 앞면·옆면 도식화, 잡화 부자재·봉제 */
const pouch = await page.evaluate(() => {
  const s = document.getElementById("oTemplate"); s.value = "pouch"; s.dispatchEvent(new Event("change"));
  const r = { sizes: document.getElementById("fSizes").textContent, seg: getComputedStyle(document.querySelector('.seg[aria-label="성별"]')).display === "none" && getComputedStyle(document.getElementById("oNeck").closest("label")).display === "none",
    cap: document.getElementById("capBack").textContent, trims: document.getElementById("trimTable").textContent.includes("개고리"),
    sew: document.getElementById("sewList").textContent.includes("마치"), meta: document.getElementById("specMeta").textContent,
    A: [...document.querySelectorAll("#specTable tr")].find((tr) => tr.children[1]?.textContent === "가로")?.textContent };
  s.value = "top_short"; s.dispatchEvent(new Event("change"));
  r.back = document.getElementById("fSizes").textContent; r.segBack = getComputedStyle(document.querySelector('.seg[aria-label="성별"]')).display === "none";
  return r;
});
ok("파우치: S·M·L 사이즈, 성별 버튼 숨김, 옆면(마치) 도식화, 개고리·마치 사양 → 옷으로 돌아오면 원래 사이즈",
  pouch.sizes === "S / M / L" && pouch.seg && pouch.cap.includes("옆면") && pouch.trims && pouch.sew && pouch.meta.includes("잡화") && pouch.A.includes("15.5") && pouch.A.includes("24.5")
  && !pouch.segBack && /\d/.test(pouch.back), JSON.stringify(pouch).slice(0, 200));

/* 5. 하의 인치 표기 */
const lbl = async (mode) => { await page.click(`#labelBox [data-label="${mode}"]`); return page.$eval("#fSizes", (n) => n.textContent); };
await page.evaluate((sel) => document.querySelector(sel).click(), "#gM"); await setSel("oTemplate", "pants"); await selectAll();
const m = { num: await lbl("num"), both: await lbl("both"), inch: await lbl("inch") };
ok("남 바지 호칭/병기/인치", m.num === "80 / 85 / 90 / 95 / 100 / 105 / 110" && m.both.startsWith("80(28)") && m.inch === "28 / 29 / 30 / 31 / 32 / 34 / 36", JSON.stringify(m));
await page.evaluate((sel) => document.querySelector(sel).click(), "#gF"); await setSel("oTemplate", "skirt");
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

/* 7. 키 없이 분석 버튼 → 기기 안 인식, 사진을 밖으로 보내는 요청 없음 */
await page.evaluate(() => { document.getElementById("gKey").value = ""; document.getElementById("status").textContent = ""; });
await page.click("#analyzeBtn"); await waitDone();
ok("키 없이 분석 → 기기 안 인식, 사진 외부 전송 0건 (POST·Gemini 요청 없음)",
  sent.length === 0 && (await page.$eval("#status", (n) => !n.className.includes("err") && n.textContent.includes("기기 안에서 인식"))), sent.slice(0, 2).join(" | "));

/* 8. 저장 파일 */
const html = await page.evaluate(() => sheetHTML());
fs.writeFileSync(new URL_("saved.html", OUT), html);
ok("작업지시서 HTML 저장 (편집 속성 제거)", html.includes("작업지시서") && !/<[^>]*\scontenteditable[\s=>]/.test(html));
/* 모든 품목 × 핏 × 넥라인 × 여밈 × 시보리 조합의 앞·뒤 SVG가 올바른 XML인지 (저장 파일이 열리는지) */
const svgBad = await page.evaluate(() => {
  const keep = { ...state.opt }, bad = [];
  for (const template of Object.keys(T)) for (const fit of ["regular", "oversize", "slim"]) for (const neck of ["crew", "v", "collar", "hood", "mock"])
    for (const closure of ["none", "buttons", "zip", "half_zip"]) for (const rib of ["plain", "rib"]) for (const shape of ["a", "h", "pleat"]) {
      Object.assign(state.opt, { template, fit, neck, closure, rib, shape, chest: true, kangaroo: true, patch: true, side: true, back: true });
      for (const v of ["front", "back"]) if (new DOMParser().parseFromString(buildSVG(v), "image/svg+xml").querySelector("parsererror")) bad.push(`${template}/${neck}/${closure}/${rib}/${v}`);
    }
  Object.assign(state.opt, keep); return bad;
});
ok("도식화 SVG 형식 정상 (전 조합 앞·뒤 6,480개)", svgBad.length === 0, `${svgBad.length}개 오류 ${svgBad.slice(0, 3).join(", ")}`);
const page2 = await browser.newPage(); await page2.goto(new URL_("saved.html", OUT).href);
const p2 = Buffer.from(await page2.pdf({ preferCSSPageSize: true, printBackground: true })); await page2.close();
ok("저장한 HTML 파일 인쇄도 1장", pages(p2) === 1, `${pages(p2)}장`);

/* 8-1. 패턴 제도 탭 */
const mediaBoxes = (buf) => Buffer.from(buf).toString("latin1").match(/\/MediaBox \[[^\]]+\]/g) || [];
const isPortrait = (mb) => { const n = mb.match(/[\d.]+/g).map(Number); return n[3] > n[2]; };
/* 작업지시서 품목과 패턴 탭 연결: 바지 → 준비 중 안내, 스커트 → H라인 스커트 자동 (탭을 이미 열었어도) */
await page.evaluate(() => { const s = document.getElementById("oTemplate"); s.value = "pants"; s.dispatchEvent(new Event("change")); });
await page.click("#tabPatBtn");
const pantsNote = await page.evaluate(() => document.getElementById("patType").value === "ws_pants" && !document.getElementById("patNote").hidden);
await page.click("#tabSheetBtn");
await page.evaluate(() => { const s = document.getElementById("oTemplate"); s.value = "skirt"; s.dispatchEvent(new Event("change")); });
await page.click("#tabPatBtn");
ok("패턴 탭이 작업지시서 품목을 따라감 (바지 → 바지 제도, 스커트 → 스커트 제도, 기준 사이즈 안내)", pantsNote
  && (await page.evaluate(() => document.getElementById("patType").value === "ws_skirt" && document.getElementById("patNote").textContent.includes("기준 사이즈"))));

/* 9개 품목 × 남/여 × 3핏: 작업지시서 치수로 채워지고, 도면·시접·소매산이 맞는지 */
const allPat = await page.evaluate(() => {
  const bad = [], sel = (id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event("change")); };
  let n = 0;
  for (const g of ["gM", "gF"]) for (const t of Object.keys(T)) for (const fit of ["regular", "oversize", "slim"]) {
    document.getElementById("tabSheetBtn").click(); document.getElementById(g).click(); sel("oTemplate", t); sel("oFit", fit);
    document.getElementById("tabPatBtn").click(); n++;
    const d = patDraft, svg = Pattern.svg(d, d.lay, "real"), tag = `${g}/${t}/${fit}`;
    if (d.type !== "ws_" + t) bad.push(tag + " 품목 " + d.type);
    const ws = worksheetBaseValues().values, TT = Pattern.TYPES[d.type];
    for (const [k, part] of Object.entries(TT.fromSpec)) if (ws[part] != null && TT.fields.some((f) => f[0] === k) && +d.v[k] !== ws[part]) bad.push(`${tag} ${part} ${d.v[k]}≠${ws[part]}`);
    if (/NaN|undefined/.test(svg)) bad.push(tag + " NaN");
    if (new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("parsererror")) bad.push(tag + " SVG");
    for (const p of d.pieces) if (p.edges.some((e) => e > 0) && Math.abs(Pattern._area(p.cut)) <= Math.abs(Pattern._area(p.pts))) bad.push(`${tag} ${p.name} 시접`);
    if (d.warn.length) bad.push(`${tag} ${d.warn[0]}`);
    if (d.tiles.length > 30) bad.push(`${tag} 분할 ${d.tiles.length}장`);
  }
  return { n, bad };
});
ok(`10개 품목 × 남/여 × 3핏 = ${allPat.n}개 패턴: 치수표 값 반영·도면·시접·소매산 정상, 경고 없음`, allPat.bad.length === 0, allPat.bad.slice(0, 4).join(" | "));
/* 치수표에서 고친 값이 패턴에 반영 */
const edited = await page.evaluate(() => {
  document.getElementById("tabSheetBtn").click(); document.getElementById("gM").click();
  const s = document.getElementById("oTemplate"); s.value = "top_short"; s.dispatchEvent(new Event("change"));
  const tr = [...document.querySelectorAll("#specTable tr")].find((r) => r.children[1]?.textContent === "가슴단면");
  tr.querySelector("td.base").textContent = "58";
  document.getElementById("tabPatBtn").click();
  return patDraft.v.C;
});
ok("작업지시서 치수표에서 고친 값(가슴단면 58)이 패턴에 반영", edited === 58, String(edited));
ok("패턴 탭: 베타 안내·실물 검증 순서 표시, 인쇄 표지·분할 장에도 '베타'",
  await page.evaluate(() => { const b = document.querySelector("#pat .pat-beta"); preparePrint(); const cover = document.querySelector("#patPrint .pat-cover")?.textContent || "", tile = document.querySelector("#patPrint .pat-page:nth-child(2) .beta");
    return b && getComputedStyle(b).display !== "none" && b.querySelectorAll("li").length >= 5 && cover.includes("베타") && !!tile; }));
ok("패턴 탭: 작업지시서 숨기고 패턴 화면·버튼 표시", await page.evaluate(() => document.getElementById("sheet").hidden && !document.getElementById("pat").hidden
  && !document.getElementById("savePatBtn").hidden && document.getElementById("saveHtmlBtn").hidden && document.querySelector("#patView svg") !== null));
ok("시접 계산: 10×10 정사각형 시접 1 → 12×12", await page.evaluate(() => {
  const c = Pattern._offset([[0, 0], [10, 0], [10, 10], [0, 10]], [1, 1, 1, 1]);
  const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
  return Math.max(...xs) - Math.min(...xs) === 12 && Math.max(...ys) - Math.min(...ys) === 12;
}));
const skirtS = await page.evaluate(() => { const d = Pattern.draft("skirt_h", { waist: 66, hip: 90, hipLen: 19, len: 60 }); return Object.fromEntries(d.calc.map(([k, , v]) => [k, String(v)])); });
ok("H라인 스커트 S: 칠판 제도와 같은 값 (옆선 2.6 · 다트 2 · 다트 길이 12.5·11.5/10.5·9.5)",
  skirtS["옆선 들임 (뒤 / 앞)"] === "2.6 / 2.6" && skirtS["다트량 (뒤 / 앞, 각 2개)"] === "2 / 2" && skirtS["다트 길이 (뒤 / 앞)"] === "12.5·11.5 / 10.5·9.5" && skirtS["뒤판 폭 / 앞판 폭"] === "22.5 / 23.5", JSON.stringify(skirtS).slice(0, 160));
const patAll = await page.evaluate(() => {
  const bad = [];
  for (const [type, T] of Object.entries(Pattern.TYPES)) for (const [name, pr] of Object.entries(T.presets)) {
    const vals = Object.fromEntries(T.fields.map(([k, , d]) => [k, pr[k] ?? d]));
    const d = Pattern.draft(type, vals), svg = Pattern.svg(d, d.lay, "real");
    if (svg.includes("NaN")) bad.push(name + " NaN");
    if (new DOMParser().parseFromString(svg, "image/svg+xml").querySelector("parsererror")) bad.push(name + " SVG 오류");
    if (d.warn.length) bad.push(name + " 경고 " + d.warn[0]);
    for (const p of d.pieces) if (Math.abs(Pattern._area(p.cut)) <= Math.abs(Pattern._area(p.pts)) && p.edges.some((e) => e > 0)) bad.push(`${name} ${p.name} 시접`);
    if (!d.tiles.length || d.tiles.length > 12) bad.push(`${name} 분할 ${d.tiles.length}장`);
  }
  return bad;
});
ok("따로 제도 2종(H라인 스커트·파우치) × 프리셋 3개: 도면·시접·실물 SVG 정상, 분할 1~12장", patAll.length === 0, patAll.join(", "));
await page.evaluate(() => { const s = document.getElementById("patType"); s.value = "skirt_h"; s.dispatchEvent(new Event("change")); });
const before = await page.evaluate(() => patDraft.calc[1][2]);
await page.evaluate(() => { const n = document.querySelector('#patFields [data-k="hip"]'); n.value = 100; n.dispatchEvent(new Event("input")); });
ok("치수 입력 → 바로 다시 제도 (엉덩이 100 → 판 폭 25 / 26)", before === "22.5 / 23.5" && (await page.evaluate(() => patDraft.calc[1][2])) === "25 / 26" && (await page.$eval("#patPreset", (n) => n.value === "")));
await page.evaluate(() => { const s = document.getElementById("patPreset"); s.value = s.options[1].value; s.dispatchEvent(new Event("change")); });
for (const type of ["skirt_h", "pouch"]) {
  await page.evaluate((t) => { const s = document.getElementById("patType"); s.value = t; s.dispatchEvent(new Event("change")); }, type);
  await page.evaluate(() => preparePrint());
  const info = await page.evaluate(() => ({ tiles: patDraft.tiles.length, land: patDraft.tiles[0].landscape, w: document.querySelector("#patPrint .pat-page:nth-child(2) svg").getAttribute("width"), chk: !!document.querySelector("#patPrint .pat-cover .chk"),
  }));
  await page.emulateMediaType("print");
  const cover = await page.evaluate(() => { const c = document.querySelector("#patPrint .pat-cover"); return [c.scrollHeight, c.clientHeight, Math.round(c.querySelector(".chk").getBoundingClientRect().width)]; });
  await page.emulateMediaType(null);
  ok(`${type} 인쇄 첫 장: 내용이 한 장에 들어가고 확인 네모 50mm(189px)`, cover[0] <= cover[1] + 1 && Math.abs(cover[2] - 189) <= 1, cover.join("/"));
  const pdf = await page.pdf({ preferCSSPageSize: true });
  fs.writeFileSync(new URL_(`pattern_${type}.pdf`, OUT), pdf);
  const mb = mediaBoxes(pdf);
  ok(`${type} 인쇄: 축소도 1장 + 실물 ${info.tiles}장 (A4 ${info.land ? "가로" : "세로"}, 폭 ${info.w}, 50mm 확인 네모)`,
    mb.length === 1 + info.tiles && isPortrait(mb[0]) && mb.slice(1).every((m) => isPortrait(m) === !info.land) && info.w === (info.land ? "283mm" : "196mm") && info.chk, `${mb.length}장`);
}
/* 한 장(대형 출력): 축소도 + 패턴 크기 그대로 한 장 */
await page.evaluate(() => { const s = document.getElementById("patType"); s.value = "ws_pants"; s.dispatchEvent(new Event("change")); document.getElementById("patPrintMode").value = "one"; preparePrint(); });
const big = mediaBoxes(await page.pdf({ preferCSSPageSize: true }));
const bigWant = await page.evaluate(() => [patDraft.lay.w, patDraft.lay.h + 7]);
const bigPt = big[0] ? big[0].match(/[\d.]+/g).map(Number).slice(2) : [];
ok(`한 장 대형 출력: 패턴 크기 그대로 1장 (${bigWant[0]}×${bigWant[1]}cm, 안내·50mm 네모 포함)`, big.length === 1 && Math.abs(bigPt[0] - bigWant[0] / 2.54 * 72) < 2 && Math.abs(bigPt[1] - bigWant[1] / 2.54 * 72) < 2
  && (await page.evaluate(() => !!document.querySelector("#patPrint .big .chk"))), big.join(" "));
await page.evaluate(() => { document.getElementById("patPrintMode").value = "tiles"; });
await page.click("#tabSheetBtn");
await page.evaluate(() => preparePrint());
const back = await page.pdf({ preferCSSPageSize: true });
ok("작업지시서 탭으로 돌아오면 인쇄는 다시 A4 가로 1장", mediaBoxes(back).length === 1 && !isPortrait(mediaBoxes(back)[0]));

/* 8-2. 작업 저장 → 새 페이지에서 열기, 자동 저장 → 이어서 하기, 위험한 글자는 글자로만 */
await page.evaluate(() => {
  document.getElementById("tabSheetBtn").click();
  const s = document.getElementById("oTemplate"); s.value = "pouch"; s.dispatchEvent(new Event("change"));
  document.getElementById("fBrand").textContent = "겸이네 공방";
  document.getElementById("fFactory").textContent = '<img src=x onerror="window.__xss=1">';
  const tr = [...document.querySelectorAll("#specTable tr")].find((r) => r.children[1]?.textContent === "가로"); tr.querySelector("td.base").textContent = "21.5";
  document.getElementById("sewList").innerHTML = "<li>첫째 줄 테스트</li><li>둘째 줄 테스트</li>";
  const c = document.getElementById("oColor"); c.value = "아이보리"; c.dispatchEvent(new Event("input"));
});
const job = await page.evaluate(() => JSON.stringify(snapshot()));
fs.writeFileSync(new URL_("job.json", OUT), job);
const p3 = await browser.newPage(); const p3err = [];
p3.on("pageerror", (e) => p3err.push(e.message));
await p3.evaluateOnNewDocument(() => { try { localStorage.removeItem("wo_autosave"); } catch (e) {} });
await p3.goto(URL, { waitUntil: "networkidle0" });
await (await p3.$("#jobFile")).uploadFile(new URL_("job.json", OUT).pathname);
await p3.waitForFunction(() => /작업 파일을 열었습니다|열지 못했습니다/.test(document.getElementById("status").textContent), { timeout: 10000 });
const opened = await p3.evaluate(() => ({ t: state.opt.template, brand: document.getElementById("fBrand").textContent, fac: document.getElementById("fFactory").textContent,
  xss: !!window.__xss || !!document.querySelector("#fFactory img"), A: [...document.querySelectorAll("#specTable tr")].find((r) => r.children[1]?.textContent === "가로").querySelector("td.base").textContent,
  sew: document.getElementById("sewList").children.length, color: document.getElementById("oColor").value, sizes: document.getElementById("fSizes").textContent }));
ok("작업 저장 → 새 페이지에서 작업 열기: 품목·머리 정보·치수 수정·봉제·컬러 그대로", opened.t === "pouch" && opened.brand === "겸이네 공방" && opened.A === "21.5" && opened.sew === 2 && opened.color === "아이보리" && opened.sizes === "S / M / L", JSON.stringify(opened));
ok("작업 파일 속 HTML·스크립트는 글자로만 들어감 (실행 안 됨)", !opened.xss && opened.fac.includes("<img"));
await p3.close();
await new Promise((r) => setTimeout(r, 900));   // 자동 저장(0.7초 지연) 기다림
const p4 = await browser.newPage();
await p4.goto(URL, { waitUntil: "networkidle0" });
const bar = await p4.$eval("#restoreBar", (n) => !n.hidden && n.textContent.includes("이전 작업"));
await p4.click("#restoreBtn");
await p4.waitForFunction(() => /이전 작업을 불러왔습니다/.test(document.getElementById("status").textContent), { timeout: 10000 });
const resumed = await p4.evaluate(() => [state.opt.template, document.getElementById("fBrand").textContent]);
ok("자동 저장: 다시 열면 '이어서 하기' → 이전 작업 복원", bar && resumed[0] === "pouch" && resumed[1] === "겸이네 공방", JSON.stringify(resumed));
await p4.close();
await page.evaluate(() => { const s = document.getElementById("oTemplate"); s.value = "top_short"; s.dispatchEvent(new Event("change")); });

/* 9. 모바일 화면 */
await page.setViewport({ width: 375, height: 812, isMobile: true });
ok("모바일 375px 가로 스크롤 없음", await page.evaluate(() => document.documentElement.scrollWidth <= 376), String(await page.evaluate(() => document.documentElement.scrollWidth)));
await page.evaluate(() => fitScreen());
const mob = await page.evaluate(() => { const r = document.getElementById("sheet").getBoundingClientRect(); return { w: Math.round(r.width), zoom: getComputedStyle(document.getElementById("sheet")).zoom }; });
ok("휴대폰: 작업지시서가 화면 폭에 맞게 축소되어 다 보임", mob.w <= 375 && +mob.zoom < 0.5, JSON.stringify(mob));
await page.evaluate(() => preparePrint());
const mobPdf = mediaBoxes(await page.pdf({ preferCSSPageSize: true }));
ok("휴대폰 화면에서 인쇄해도 작업지시서는 A4 가로 1장", mobPdf.length === 1 && !isPortrait(mobPdf[0]), mobPdf.join(" "));
await page.setViewport({ width: 1500, height: 1000 });
await page.screenshot({ path: new URL_("desktop.png", OUT).pathname, fullPage: true });

ok("콘솔·스크립트 오류 없음", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
const fail = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - fail}/${results.length} 통과`);
process.exit(fail ? 1 : 0);
