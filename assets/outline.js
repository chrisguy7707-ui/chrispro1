/* 작지 — 외곽선 분석 (시험 기능, AI 없음)
   바닥에 평평하게 펼친 옷 + 단색 배경 사진에서:
   1) 사진 테두리 색 = 배경으로 보고, 테두리와 이어진 비슷한 색을 걷어 내 옷 영역(마스크)을 만듦
      (옷 안의 흰 프린트처럼 배경과 같은 색이어도 테두리와 이어지지 않으면 옷으로 남음)
   2) 가장 큰 덩어리만 남기고 외곽선을 따서 단순화
   3) 줄마다 옷이 걸친 구간(run)으로 모양을 판단하고 너비·길이를 픽셀로 잼 → 기준 길이로 cm 환산
   한계: 사람이 입은 사진, 복잡하거나 옷과 비슷한 색 배경, 접히거나 겹친 옷, 비스듬한 촬영 */
(function () {
  const MAX = 640;   // 분석 해상도 (긴 변)

  /* ---------- 마스크 ---------- */
  function otsu(hist, total) {
    let sum = 0; for (let i = 0; i < hist.length; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, th = 0;
    for (let i = 0; i < hist.length; i++) {
      wB += hist[i]; if (!wB) continue; const wF = total - wB; if (!wF) break;
      sumB += i * hist[i]; const mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) ** 2;
      if (v > best) { best = v; th = i; }
    }
    return th;
  }
  function morph(m, w, h, erode) {
    const out = new Uint8Array(m.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = erode ? 1 : 0;
      for (let dy = -1; dy <= 1 && (erode ? v : !v); dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : m[yy * w + xx];
        if (erode && !s) { v = 0; break; } if (!erode && s) { v = 1; break; }
      }
      out[y * w + x] = v;
    }
    return out;
  }
  function largest(m, w, h) {
    const lab = new Int32Array(m.length), q = new Int32Array(m.length);
    let best = 0, bestId = 0, id = 0;
    for (let i = 0; i < m.length; i++) {
      if (!m[i] || lab[i]) continue;
      id++; let head = 0, tail = 0, n = 0; q[tail++] = i; lab[i] = id;
      while (head < tail) {
        const p = q[head++]; n++; const x = p % w, y = (p / w) | 0;
        if (x > 0 && m[p - 1] && !lab[p - 1]) { lab[p - 1] = id; q[tail++] = p - 1; }
        if (x < w - 1 && m[p + 1] && !lab[p + 1]) { lab[p + 1] = id; q[tail++] = p + 1; }
        if (y > 0 && m[p - w] && !lab[p - w]) { lab[p - w] = id; q[tail++] = p - w; }
        if (y < h - 1 && m[p + w] && !lab[p + w]) { lab[p + w] = id; q[tail++] = p + w; }
      }
      if (n > best) { best = n; bestId = id; }
    }
    const out = new Uint8Array(m.length);
    for (let i = 0; i < m.length; i++) out[i] = lab[i] === bestId ? 1 : 0;
    return { mask: out, area: best };
  }
  function makeMask(img, sens = 1) {
    const { width: w, height: h, data } = img, n = w * h;
    // 테두리 3px의 색 중앙값 = 배경색
    const border = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) border.push(y * w + x);
    const med = [0, 1, 2].map((c) => { const v = border.map((p) => data[p * 4 + c]).sort((a, b) => a - b); return v[v.length >> 1]; });
    const dist = new Float32Array(n), hist = new Uint32Array(256);
    for (let i = 0; i < n; i++) {
      const d = Math.sqrt((data[i * 4] - med[0]) ** 2 + (data[i * 4 + 1] - med[1]) ** 2 + (data[i * 4 + 2] - med[2]) ** 2);
      dist[i] = d; hist[Math.min(255, d | 0)]++;
    }
    // 배경 얼룩 정도: 테두리의 70% 지점 (옷이 테두리에 일부 닿아도 그 색이 섞이지 않게)
    const bd = border.map((p) => dist[p]).sort((a, b) => a - b), noise = bd[(bd.length * 0.7) | 0], ot = otsu(hist, n);
    let th = Math.max(ot * 0.6, Math.min(noise * 1.3, ot * 0.95), 14) / sens;
    // 테두리에서 시작해 '배경색에 가까운' 픽셀을 따라 퍼짐 → 배경
    const bg = new Uint8Array(n), q = new Int32Array(n); let head = 0, tail = 0;
    for (const p of border) if (dist[p] < th && !bg[p]) { bg[p] = 1; q[tail++] = p; }
    while (head < tail) {
      const p = q[head++], x = p % w, y = (p / w) | 0;
      for (const nb of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1])
        if (nb >= 0 && !bg[nb] && dist[nb] < th) { bg[nb] = 1; q[tail++] = nb; }
    }
    let m = new Uint8Array(n); for (let i = 0; i < n; i++) m[i] = bg[i] ? 0 : 1;
    m = morph(morph(m, w, h, true), w, h, false);       // 작은 얼룩 제거 (열기)
    const { mask, area } = largest(m, w, h);
    return { mask, area, bgColor: med, noise, th };
  }

  /* ---------- 외곽선 (무어 이웃 추적) + 단순화 ---------- */
  function trace(mask, w, h) {
    let s = -1; for (let i = 0; i < mask.length; i++) if (mask[i]) { s = i; break; }
    if (s < 0) return [];
    const D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x];
    let x = s % w, y = (s / w) | 0, dir = 7; const sx = x, sy = y, pts = [[x, y]];
    for (let step = 0; step < mask.length; step++) {
      let found = false;
      for (let k = 0; k < 8; k++) {
        const d = (dir + 6 + k) % 8, nx = x + D[d][0], ny = y + D[d][1];
        if (at(nx, ny)) { x = nx; y = ny; dir = d; found = true; break; }
      }
      if (!found || (x === sx && y === sy)) break;
      pts.push([x, y]);
    }
    return pts;
  }
  function simplify(pts, eps) {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop(); let idx = -1, dm = 0;
      const [ax, ay] = pts[a], [bx, by] = pts[b], L = Math.hypot(bx - ax, by - ay) || 1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L; if (d > dm) { dm = d; idx = i; } }
      if (dm > eps) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }

  /* ---------- 줄별 구간 · 모양 판단 · 픽셀 치수 ---------- */
  function rowRuns(mask, w, h) {
    const runs = [];
    for (let y = 0; y < h; y++) {
      const r = []; let st = -1;
      for (let x = 0; x <= w; x++) { const v = x < w && mask[y * w + x]; if (v && st < 0) st = x; if (!v && st >= 0) { r.push([st, x - 1]); st = -1; } }
      runs.push(r);
    }
    return runs;
  }
  function analyzeShape(mask, w, h) {
    const runs = rowRuns(mask, w, h);
    let y0 = runs.findIndex((r) => r.length), y1 = h - 1 - [...runs].reverse().findIndex((r) => r.length);
    let x0 = w, x1 = 0; runs.forEach((r) => r.forEach(([a, b]) => { x0 = Math.min(x0, a); x1 = Math.max(x1, b); }));
    const H = y1 - y0 + 1, W = x1 - x0 + 1, cx = (x0 + x1) / 2;
    const ext = (y) => { const r = runs[Math.round(y)] || []; return r.length ? r[r.length - 1][1] - r[0][0] + 1 : 0; };   // 줄 전체 폭
    const around = (y) => { const r = runs[Math.round(y)] || []; if (!r.length) return null; return r.reduce((b, s) => (!b || Math.abs((s[0] + s[1]) / 2 - cx) < Math.abs((b[0] + b[1]) / 2 - cx) ? s : b), null); };
    const bodyW = (y) => { const r = around(y); return r ? r[1] - r[0] + 1 : 0; };     // 가운데 구간 폭 (늘어진 소매 제외)
    const med = (a) => { const v = a.filter((x) => x > 0).sort((p, q) => p - q); return v.length ? v[v.length >> 1] : 0; };
    const band = (f0, f1, fn) => med(Array.from({ length: Math.max(1, Math.round((f1 - f0) * H)) }, (_, i) => fn(y0 + f0 * H + i)));
    const fill = mask.reduce((s, v) => s + v, 0) / (W * H);
    // 다리 갈라짐: 아래쪽에서 비슷한 폭의 넓은 구간이 정확히 2개, 가운데는 비어 있음 (자켓의 늘어진 소매와 구분)
    const legRow = (y) => {
      const r = (runs[Math.round(y)] || []).filter(([a, b]) => b - a > W * 0.12);
      if (r.length !== 2 || r[1][0] - r[0][1] < W * 0.02) return false;
      const wa = r[0][1] - r[0][0], wb = r[1][1] - r[1][0];
      return Math.min(wa, wb) / Math.max(wa, wb) > 0.55 && r[0][1] < cx && r[1][0] > cx;
    };
    let legRows = 0, legN = 0; for (let y = y0 + 0.6 * H; y < y1 - 0.03 * H; y++) { legN++; legRows += legRow(y) ? 1 : 0; }
    const legs = legN && legRows / legN > 0.6;
    let crotchY = null;
    if (legs) { crotchY = y1 - 0.05 * H; while (crotchY > y0 && legRow(crotchY - 1)) crotchY--; }
    const wTop = band(0.02, 0.12, ext), wQ = band(0.2, 0.3, ext), wMid = band(0.4, 0.6, ext), wBot = band(0.85, 0.95, ext), wUp = Math.max(...Array.from({ length: Math.round(0.45 * H) }, (_, i) => ext(y0 + i)));
    const sleeves = !legs && wUp > 1.15 * Math.max(wMid, wBot);                 // 팔을 벌려 펼친 상의
    // 맨 위(목·후드·칼라)가 좁고 20% 아래(어깨)에서 확 넓어짐 → 상의. 스커트는 허리선부터 폭이 넓어 맨 위가 좁지 않음
    const shoulders = !legs && wTop < 0.8 * wQ && wQ > 0.7 * wBot;
    let guess, why;
    if (legs) { const f = (crotchY - y0) / H; guess = f > 0.5 ? "shorts" : "pants"; why = `아래가 비슷한 폭의 두 갈래(다리), 밑위가 높이의 ${Math.round(f * 100)}% 지점`; }
    else if (sleeves) { guess = "top"; why = `위쪽이 아래보다 ${Math.round((wUp / Math.max(wMid, wBot) - 1) * 100)}% 넓음(벌린 소매)`; }
    else if (fill > 0.8 && W / H > 0.9) { guess = "pouch"; why = `네모에 가까움 (채움 ${Math.round(fill * 100)}%)`; }
    else if (shoulders) { guess = "top"; why = `맨 위(목·칼라)가 어깨보다 ${Math.round((1 - wTop / wQ) * 100)}% 좁음 (팔을 내린 상의)`; }
    else if (wBot > wQ * 1.15) { guess = H / W > 1.7 ? "dress" : "skirt"; why = `아래로 갈수록 ${Math.round((wBot / wQ - 1) * 100)}% 넓어짐`; }
    else { guess = "unknown"; why = "모양만으로는 판단하기 어려움 (H라인 스커트·민소매 등)"; }
    return { runs, y0, y1, x0, x1, W, H, cx, ext, bodyW, around, band, fill, legs, crotchY, sleeves, guess, why, wTop, wMid, wBot, wUp };
  }

  /* 품목 종류별 픽셀 치수. 각 항목: { part(치수표 이름), px, line:[[x,y],[x,y]], sure(true면 기본 체크) } */
  function measure(s, kind, pxPerCm, opt = {}) {
    const out = [], L = (part, a, b, sure = true, note = "") => out.push({ part, px: Math.hypot(b[0] - a[0], b[1] - a[1]), line: [a, b], sure, note });
    const hor = (part, y, fn = s.around, sure = true, note) => { const r = fn(y); if (r) L(part, [r[0], y], [r[1], y], sure, note); };
    const allRun = (y) => { const r = s.runs[Math.round(y)] || []; return r.length ? [r[0][0], r[r.length - 1][1]] : null; };
    const { y0, y1, H, cx } = s;
    if (kind === "pants") {
      const top = y0 + 0.015 * H, cr = s.crotchY ?? y0 + 0.3 * H;
      hor("허리단면", top, allRun);
      let hy = top, hw = 0; for (let y = y0 + 0.4 * (cr - y0); y < cr - 2; y++) { const r = allRun(y); if (r && r[1] - r[0] > hw) { hw = r[1] - r[0]; hy = y; } }
      hor("엉덩이단면", hy, allRun);
      const leg = (y) => { const r = (s.runs[Math.round(y)] || []).filter(([a, b]) => b - a > s.W * 0.08); return r.length ? r[0] : null; };
      hor("허벅지단면", cr + 0.03 * H, leg);
      L("앞 밑위", [cx, y0], [cx, cr], true, "평평하게 놓은 앞판 기준 근사");
      hor("밑단단면", y1 - 0.02 * H, leg);
      L("총장", [s.x1 - 2, y0], [s.x1 - 2, y1], true, "옆선 기준 근사");
    } else if (kind === "skirt") {
      hor("허리단면", y0 + 0.015 * H, allRun);
      if (pxPerCm) hor("엉덩이단면", y0 + 18 * pxPerCm, allRun, true, "허리 아래 18cm");
      hor("밑단단면", y1 - 0.02 * H, allRun);
      L("총장", [cx, y0], [cx, y1]);
    } else if (kind === "bag") {
      // 고리·개고리가 옆에 붙어 있으므로 아래쪽에서 가운데 몸통 구간만, 여러 줄의 중앙값에 가까운 줄로 잼
      let gy = y0 + 0.8 * H, gw = s.band(0.68, 0.9, s.bodyW);
      for (let y = y0 + 0.68 * H; y < y0 + 0.9 * H; y++) if (Math.abs(s.bodyW(y) - gw) < 1) { gy = y; break; }
      hor("가로", gy, s.around, true, "고리 제외, 아래쪽 몸통");
      L("높이", [cx, y0], [cx, y1], true, "지퍼 포함 전체 높이");
    } else {   // top · dress
      const len = y1 - y0, hem = s.band(0.9, 0.97, s.bodyW);
      let arm = null; for (let y = y0 + 0.08 * len; y < y0 + 0.6 * len; y++) if (s.bodyW(y) > hem * 1.15) arm = y;
      const chestY = (arm ?? y0 + 0.3 * len) + 0.03 * len;
      // 총장: 가운데 근처에서 가장 높은 점(목옆점 근사) ~ 밑단. 후드는 후드가 어깨와 만나는 곳(폭이 어깨의 60%를 넘는 줄)부터
      let top = y1; for (let y = y0; y < y1; y++) { const r = s.around(y); if (r && r[0] < cx + 0.15 * s.W && r[1] > cx - 0.15 * s.W) { top = y; break; } }
      if (opt.hood) { const wq = s.band(0.2, 0.3, s.ext); for (let y = y0; y < y0 + 0.4 * len; y++) if (s.ext(y) >= 0.6 * wq) { top = y; break; } }
      L("총장", [cx + 0.1 * s.W, top], [cx + 0.1 * s.W, y1], true, opt.hood ? "후드 아래 목옆점 근사" : "목옆점 근사");
      // 팔을 벌려 펼친 사진에서만 믿음. 팔을 내린 사진은 소매가 폭에 섞여 기본 해제
      const spread = s.sleeves && arm != null;
      hor("가슴단면", chestY, s.around, spread, spread ? "겨드랑이 아래" : "팔을 내린 사진은 소매가 섞임 — 팔을 벌려 펼친 사진이 필요 (참고)");
      if (kind === "dress") {
        let wy = chestY, ww = 1e9; for (let y = chestY; y < y0 + 0.6 * len; y++) { const b = s.bodyW(y); if (b && b < ww) { ww = b; wy = y; } }
        hor("허리단면", wy, s.around);
      }
      hor("밑단단면", y1 - 0.02 * len, s.around);
      hor("어깨너비", top + 0.06 * len, s.around, false, "어깨점 판단이 어려워 기본 해제 (참고)");
    }
    return out.map((m) => ({ ...m, cm: pxPerCm ? Math.round((m.px / pxPerCm) * 2) / 2 : null }));
  }

  /* 사진(Blob) → 분석 해상도 이미지 */
  async function loadImage(blob) {
    const bmp = await createImageBitmap(blob), k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d"); g.drawImage(bmp, 0, 0, c.width, c.height);
    return { canvas: c, img: g.getImageData(0, 0, c.width, c.height) };
  }
  function analyze(img, sens = 1) {
    const { width: w, height: h } = img;
    const m = makeMask(img, sens);
    const s = analyzeShape(m.mask, w, h);
    const contour = simplify(trace(m.mask, w, h), 1.2);
    const warn = [];
    const frac = m.area / (w * h);
    if (frac < 0.06) warn.push("옷 영역이 너무 작게 잡혔습니다. 민감도를 올리거나 옷을 크게 찍어 주세요.");
    if (frac > 0.85) warn.push("배경과 옷을 구분하지 못했습니다. 옷과 다른 색의 단색 배경에서 찍어 주세요.");
    if (s.x0 <= 1 || s.y0 <= 1 || s.x1 >= w - 2 || s.y1 >= h - 2) warn.push("옷이 사진 가장자리에 닿아 있습니다. 옷 전체가 나오게 찍어야 정확합니다.");
    if (m.noise > 40) warn.push("배경이 고르지 않습니다 (그림자·무늬). 결과가 부정확할 수 있습니다.");
    return { w, h, mask: m.mask, area: m.area, bgColor: m.bgColor, shape: s, contour, warn };
  }
  /* 외곽선 SVG (기준 길이가 있으면 실제 cm 크기) */
  function contourSVG(res, pxPerCm) {
    const s = res.shape, k = pxPerCm ? 1 / pxPerCm : 1, u = pxPerCm ? "cm" : "px";
    const d = "M" + res.contour.map(([x, y]) => `${((x - s.x0) * k).toFixed(2)},${((y - s.y0) * k).toFixed(2)}`).join(" L") + " Z";
    const W = (s.W * k).toFixed(2), H = (s.H * k).toFixed(2);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}${u}" height="${H}${u}" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="none" stroke="#1d1d1b" stroke-width="${pxPerCm ? 0.05 : 1}"/></svg>`;
  }
  window.Outline = { loadImage, analyze, measure, contourSVG, _makeMask: makeMask };
})();
