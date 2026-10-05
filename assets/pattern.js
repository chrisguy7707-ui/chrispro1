/* 옷만들기 도면 메이커 — 패턴 제도 엔진
   치수(cm)를 받아 패턴 조각(완성선·시접·다트·너치·식서·골선)을 계산하고 SVG로 그립니다.
   좌표 단위는 cm, y는 아래로 증가. 조각 외곽선은 시계 방향(화면 기준) 닫힌 다각형이며
   edges[i]는 점 i → i+1 변의 시접(cm). 골선은 시접 0.

   새 품목을 추가하려면 TYPES에 { name, fields, presets, draft } 를 넣으면 됩니다. */
(function () {
  const r1 = (v) => Math.round(v * 10) / 10;

  /* ---------- 기하 도구 ---------- */
  const bez = (p0, c1, c2, p3, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p3[0],
            u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p3[1]];
  });
  const area = (pts) => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;

  /* 변마다 다른 거리로 바깥쪽 평행선을 그어 교점으로 시접선(재단선)을 만듦 */
  function offset(pts, dists) {
    const n = pts.length, sgn = area(pts) > 0 ? 1 : -1;
    const lines = pts.map((p, i) => {
      const q = pts[(i + 1) % n], dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy) || 1;
      const nx = (sgn * dy) / len, ny = (-sgn * dx) / len, d = dists[i];
      return { p: [p[0] + nx * d, p[1] + ny * d], dir: [dx / len, dy / len], n: [nx, ny] };
    });
    return pts.map((v, j) => {
      const a = lines[(j - 1 + n) % n], b = lines[j];
      const cross = a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0];
      if (Math.abs(cross) < 1e-6) return [b.p[0], b.p[1]];             // 한 직선 위 (곡선 샘플 등)
      const t = ((b.p[0] - a.p[0]) * b.dir[1] - (b.p[1] - a.p[1]) * b.dir[0]) / cross;
      const x = [a.p[0] + a.dir[0] * t, a.p[1] + a.dir[1] * t];
      const lim = 3 * Math.max(dists[(j - 1 + n) % n], dists[j], 0.5);  // 뾰족한 모서리 제한
      const dx = x[0] - v[0], dy = x[1] - v[1], m = Math.hypot(dx, dy);
      return m > lim ? [v[0] + (dx / m) * lim, v[1] + (dy / m) * lim] : x;
    });
  }
  /* 점에서 가장 가까운 변 → 너치(맞춤 표시) 위치·방향 */
  function notchAt(piece, pt) {
    const P = piece.pts, n = P.length, sgn = area(P) > 0 ? 1 : -1;
    let best = null;
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2));
      const q = [a[0] + dx * t, a[1] + dy * t], dd = Math.hypot(pt[0] - q[0], pt[1] - q[1]);
      if (!best || dd < best.dd) { const len = Math.sqrt(l2); best = { dd, q, n: [(sgn * dy) / len, (-sgn * dx) / len], sa: piece.edges[i] }; }
    }
    return best;
  }
  /* 다각형을 이루는 변들을 [점들, 시접] 묶음으로 이어 붙임 */
  function chain(parts) {
    const pts = [], edges = [];
    for (const [seg, sa] of parts) for (let i = 0; i < seg.length - 1; i++) { pts.push(seg[i]); edges.push(sa); }
    return { pts, edges };
  }
  const yOnCurve = (curve, x) => {
    for (let i = 0; i < curve.length - 1; i++) {
      const a = curve[i], b = curve[i + 1];
      if ((x - a[0]) * (x - b[0]) <= 0 && a[0] !== b[0]) return a[1] + ((x - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
    }
    return curve[curve.length - 1][1];
  };

  /* ---------- H라인 스커트 ----------
     칠판 제도 방식: 엉덩이둘레/2 + 여유 를 앞·뒤로 나누고(옆선 0.5 앞쪽으로),
     허리 남는 양을 옆선 들임(약 40%)과 다트 2개로 나눔. 뒤중심 1cm 내림. */
  function draftSkirt(v) {
    const W = v.waist + v.waistEase, half = v.hip / 2 + v.ease / 2;
    const Bw = half / 2 - 0.5, Fw = half / 2 + 0.5;
    const wb = W / 4 - 0.5, wf = W / 4 + 0.5;
    const exB = Bw - wb, exF = Fw - wf;
    const sb = r1(exB * 0.4), sf = r1(exF * 0.4);
    const db = r1((exB - sb) / 2), df = r1((exF - sf) / 2);
    const L = v.len, HL = v.hipLen, cbDrop = 1;
    const lenB = [r1(HL - 6.5), r1(HL - 7.5)], lenF = [r1(HL - 8.5), r1(HL - 9.5)];
    const warn = [];
    if (exB < 1 || exF < 1) warn.push("허리와 엉덩이 차이가 너무 작습니다. 다트 없이 고무줄 허리를 고려하세요.");
    if (db > 3.5 || df > 3.5) warn.push("다트 하나가 3.5cm를 넘습니다. 다트를 3개로 나누거나 옆선 들임을 늘리세요.");

    function panel(back) {
      const w = back ? Bw : Fw, s = back ? sb : sf, top = back ? cbDrop : 0;
      const waist = bez([0, top], [(w - s) * 0.5, top], [(w - s) * 0.85, back ? 0.2 : 0], [w - s, 0], 12);
      const side = bez([w - s, 0], [w - s + s * 0.35, HL * 0.25], [w, HL * 0.5], [w, HL], 14);
      const { pts, edges } = chain([
        [waist, 1],
        [side, 1.5],
        [[[w, HL], [w, L]], 1.5],
        [[[w, L], [0, L]], 4],
        [[[0, L], [0, top]], back ? 1.5 : 0],
      ]);
      const dl = back ? lenB : lenF, d = back ? db : df;
      const darts = [1 / 3, 2 / 3].map((k, i) => {
        const x = (w - s) * k, y = yOnCurve(waist, x);
        return { pts: [[x - d / 2, y], [x, y + dl[i]], [x + d / 2, y]] };
      });
      const p = {
        name: back ? "뒤판 BACK" : "앞판 FRONT", count: back ? "2장 (좌우 대칭)" : "1장 (앞중심 골선)",
        pts, edges, darts, fold: back ? null : [[0, 0], [0, L]],
        lines: [{ pts: [[0, HL], [w, HL]], dash: true, label: "엉덩이선 HL" }],
        grain: [[w * 0.55, HL + 6], [w * 0.55, L - 8]],
        notchPts: [[w, HL]].concat(back ? [[0, top + v.zip]] : []),
        dims: [   // 치수선은 조각 안쪽에 (분할 인쇄 장수를 줄이려고)
          { a: [0, HL + 4], b: [w, HL + 4], text: `${r1(w)}` },
          { a: [w * 0.22, top], b: [w * 0.22, L], text: `${r1(L - top)}`, v: true },
        ],
        notes: back ? [[1.5, top + v.zip + 1.2, `콘솔지퍼 ${v.zip}cm`]] : [[1.2, L * 0.7, "앞중심 골선 (CF)"]],
      };
      return p;
    }
    const bandLen = W + 3, bandW = 3;
    const band = {
      name: "허리밴드", count: "1장 (접착 심지)",
      ...chain([[[[0, 0], [bandLen, 0]], 1], [[[bandLen, 0], [bandLen, bandW * 2]], 1], [[[bandLen, bandW * 2], [0, bandW * 2]], 1], [[[0, bandW * 2], [0, 0]], 1]]),
      darts: [], fold: null,
      lines: [{ pts: [[0, bandW], [bandLen, bandW]], dash: true, label: "접는 선" }],
      grain: [[bandLen * 0.35, bandW], [bandLen * 0.65, bandW]],
      notchPts: [[3 + W / 4 - 0.5, 0], [3 + W / 2, 0], [3 + (W * 3) / 4 + 0.5, 0], [3, 0]],
      dims: [{ a: [0, bandW * 1.55], b: [bandLen, bandW * 1.55], text: `${r1(bandLen)} × ${bandW * 2}` }], dimAt: 0.75,
      notes: [[bandLen - 2.6, -0.4, "겹침 3"], [0.4, -0.4, "직사각형이라 실물 크기 분할 인쇄에서는 빠짐 · 자로 재서 재단"]],
      below: true, measureOnly: true,
    };
    return {
      pieces: [panel(true), panel(false), band], warn,
      calc: [
        ["엉덩이 반둘레 + 여유", `${v.hip} ÷ 2 + ${v.ease / 2}`, half],
        ["뒤판 폭 / 앞판 폭", "반둘레 ÷ 2 ∓ 0.5", `${r1(Bw)} / ${r1(Fw)}`],
        ["뒤 허리 / 앞 허리", `(${v.waist}+${v.waistEase}) ÷ 4 ∓ 0.5`, `${r1(wb)} / ${r1(wf)}`],
        ["남는 양 (뒤 / 앞)", "판 폭 − 허리", `${r1(exB)} / ${r1(exF)}`],
        ["옆선 들임 (뒤 / 앞)", "남는 양 × 0.4", `${sb} / ${sf}`],
        ["다트량 (뒤 / 앞, 각 2개)", "(남는 양 − 옆선 들임) ÷ 2", `${db} / ${df}`],
        ["다트 길이 (뒤 / 앞)", `엉덩이길이 ${HL} 기준`, `${lenB.join("·")} / ${lenF.join("·")}`],
        ["뒤중심 내림", "", cbDrop],
        ["허리밴드", "허리 + 여유 + 겹침 3 × 완성 폭 3", `${r1(bandLen)} × 6`],
      ].map(([a, b, c]) => [a, b, typeof c === "number" ? r1(c) : c]),
      seam: "시접: 허리 1 · 옆선 1.5 · 뒤중심 1.5 · 밑단 4 · 앞중심 골선",
    };
  }

  /* ---------- 사각 마치 지퍼 파우치 ----------
     원단 한 장: 가로 = 완성 가로 + 마치, 세로 = 높이 × 2 + 마치.
     양옆 가운데 (마치/2 × 마치) 홈을 따내고, 위·아래 끝에 지퍼를 단 뒤 옆선을 박고 홈을 맞붙여 마치를 만듦. */
  function draftPouch(v) {
    const Wn = v.w + v.d, Ln = v.h * 2 + v.d, c1 = v.h, c2 = v.h + v.d, k = v.d / 2, sa = v.sa;
    const pts = [[0, 0], [Wn, 0], [Wn, c1], [Wn - k, c1], [Wn - k, c2], [Wn, c2], [Wn, Ln], [0, Ln], [0, c2], [k, c2], [k, c1], [0, c1]];
    const warn = [];
    if (v.d >= v.h) warn.push("마치가 높이보다 크면 모양이 무너집니다. 마치를 줄이세요.");
    const body = {
      name: "몸판", count: "겉감 1장 · 안감 1장 (같은 모양)",
      pts, edges: pts.map(() => sa), darts: [], fold: null,
      lines: [{ pts: [[k + 1.6, Ln / 2], [Wn - k - 1.6, Ln / 2]], dash: true, label: "바닥 중심 (골선 재단 가능)" }],
      grain: [[Wn * 0.3, 2.5], [Wn * 0.3, c1 - 4]], labelY: 0.74,
      notchPts: [[Wn / 2, 0], [Wn / 2, Ln]],   // 지퍼 중심 맞춤
      dims: [
        { a: [0, c1 - 2.5], b: [Wn, c1 - 2.5], text: `${r1(Wn)}` },
        { a: [Wn - k - 1.4, 0], b: [Wn - k - 1.4, Ln], text: `${r1(Ln)}`, v: true },
        { a: [k + 0.6, c1], b: [k + 0.6, c2], text: `${r1(v.d)}`, v: true },
      ],
      notes: [[Wn / 2 - 1.2, 1.4, "지퍼"], [Wn / 2 - 1.2, Ln - 0.8, "지퍼"]],
    };
    const tab = {
      name: "고리 탭", count: "웨빙 2.5 × 7, 1장",
      ...chain([[[[0, 0], [2.5, 0]], 0], [[[2.5, 0], [2.5, 7]], 0], [[[2.5, 7], [0, 7]], 0], [[[0, 7], [0, 0]], 0]]),
      darts: [], fold: null, lines: [{ pts: [[0, 3.5], [2.5, 3.5]], dash: true }],
      grain: [[1.25, 1.2], [1.25, 5.8]], notchPts: [], dims: [], notes: [], below: true, measureOnly: true,
    };
    return {
      pieces: [body, tab], warn,
      calc: [
        ["재단 가로", `완성 가로 ${v.w} + 마치 ${v.d}`, Wn],
        ["재단 세로", `높이 ${v.h} × 2 + 마치 ${v.d}`, Ln],
        ["마치 홈 (양옆 가운데)", "마치 ÷ 2 × 마치", `${r1(k)} × ${r1(v.d)}`],
        ["지퍼 길이 (테이프)", "재단 가로와 같게, 양 끝 탭 처리", `${r1(Wn)}`],
        ["완성 크기", "가로 × 높이 × 마치", `${v.w} × ${v.h} × ${v.d}`],
      ].map(([a, b, c]) => [a, b, typeof c === "number" ? r1(c) : c]),
      seam: `시접: 사방 ${sa} (지퍼 쪽 포함) · 고리 탭은 웨빙이라 시접 없음`,
    };
  }

  const TYPES = {
    skirt_h: {
      name: "H라인 스커트", draft: draftSkirt,
      fields: [["waist", "허리둘레", 66], ["hip", "엉덩이둘레", 90], ["hipLen", "엉덩이길이", 19], ["len", "스커트 길이", 60],
               ["ease", "엉덩이 여유 (둘레)", 2], ["waistEase", "허리 여유 (둘레)", 0], ["zip", "콘솔지퍼 길이", 20]],
      presets: { "S (허리 66·엉덩이 90)": { waist: 66, hip: 90 }, "M (70·94)": { waist: 70, hip: 94 }, "L (74·98)": { waist: 74, hip: 98 } },
    },
    pouch: {
      name: "사각 지퍼 파우치 (마치)", draft: draftPouch,
      fields: [["w", "완성 가로", 15], ["h", "완성 높이", 10], ["d", "마치 (바닥 폭)", 5], ["sa", "시접", 1]],
      presets: { "미니 15×10×5": { w: 15, h: 10, d: 5 }, "중 20×12×6": { w: 20, h: 12, d: 6 }, "대 24×15×8": { w: 24, h: 15, d: 8 } },
    },
  };

  /* ---------- 배치 + SVG ---------- */
  function layout(dr) {
    const GAP = 2.2, MARGIN = 1.2;
    let x = MARGIN, rowBottom = 0;
    const placed = [];
    for (const p of dr.pieces.filter((p) => !p.below)) {
      p.cut = offset(p.pts, p.edges);
      const bb = bbox(p.cut.concat(p.dims.flatMap((d) => [d.a, d.b])));
      const dx = x - bb.x0 + (p.fold ? 1.8 : 0), dy = MARGIN - bb.y0;   // 골선 표시 자리
      placed.push({ p, dx, dy }); x += bb.x1 - bb.x0 + GAP + (p.fold ? 1.8 : 0); rowBottom = Math.max(rowBottom, bb.y1 + dy);
    }
    let x2 = MARGIN;
    for (const p of dr.pieces.filter((p) => p.below)) {
      p.cut = offset(p.pts, p.edges);
      const bb = bbox(p.cut.concat(p.dims.flatMap((d) => [d.a, d.b])));
      placed.push({ p, dx: x2 - bb.x0, dy: rowBottom + GAP + 1 - bb.y0 }); x2 += bb.x1 - bb.x0 + GAP;
    }
    const all = bbox(placed.flatMap(({ p, dx, dy }) => p.cut.concat(p.dims.flatMap((d) => [d.a, d.b])).map(([a, b]) => [a + dx, b + dy])));
    return { placed, w: Math.ceil(all.x1 + MARGIN), h: Math.ceil(all.y1 + MARGIN) };
  }
  function bbox(pts) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }
  const f2 = (v) => Math.round(v * 100) / 100;
  const path = (pts, close) => "M" + pts.map((p) => `${f2(p[0])},${f2(p[1])}`).join(" L") + (close ? " Z" : "");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function pieceSVG({ p, dx, dy }, title) {
    const T = (x, y, s, size = 0.9, extra = "") => `<text x="${f2(x)}" y="${f2(y)}" font-size="${size}" ${extra}>${esc(s)}</text>`;
    let g = `<g transform="translate(${f2(dx)},${f2(dy)})">`;
    g += `<path d="${path(p.cut, true)}" fill="#fff" stroke="#1d1d1b" stroke-width="0.07"/>`;            // 재단선
    g += `<path d="${path(p.pts, true)}" fill="none" stroke="#1d1d1b" stroke-width="0.035" stroke-dasharray="0.35 0.2"/>`; // 완성선
    if (p.fold) {
      const [a, b] = p.fold, x = a[0] - 1.2;
      g += `<path d="M${a[0]},${a[1] + 3} H${x} V${b[1] - 3} H${b[0]}" fill="none" stroke="#c62828" stroke-width="0.06" marker-start="url(#pa)" marker-end="url(#pa)"/>`;
      g += T(x - 0.4, (a[1] + b[1]) / 2, "골선 FOLD", 0.8, `fill="#c62828" transform="rotate(-90 ${f2(x - 0.4)} ${f2((a[1] + b[1]) / 2)})" text-anchor="middle"`);
    }
    for (const d of p.darts) g += `<path d="${path(d.pts)}" fill="none" stroke="#1d1d1b" stroke-width="0.045"/>`;
    for (const l of p.lines) {
      g += `<path d="${path(l.pts)}" fill="none" stroke="#5b5b57" stroke-width="0.03" ${l.dash ? 'stroke-dasharray="0.6 0.3"' : ""}/>`;
      if (l.label) g += T(l.pts[0][0] + 0.5, l.pts[0][1] - 0.35, l.label, 0.7, 'fill="#5b5b57"');
    }
    const [ga, gb] = p.grain;
    g += `<path d="M${f2(ga[0])},${f2(ga[1])} L${f2(gb[0])},${f2(gb[1])}" stroke="#1d1d1b" stroke-width="0.05" marker-start="url(#pa)" marker-end="url(#pa)"/>`;
    const vert = Math.abs(gb[1] - ga[1]) > Math.abs(gb[0] - ga[0]);
    if (vert) g += T(ga[0] + 0.5, (ga[1] + gb[1]) / 2, "식서 ↕", 0.7, `transform="rotate(90 ${f2(ga[0] + 0.5)} ${f2((ga[1] + gb[1]) / 2)})"`);
    for (const pt of p.notchPts) {
      const nn = notchAt(p, pt); if (!nn) continue;
      const o = [nn.q[0] + nn.n[0] * nn.sa, nn.q[1] + nn.n[1] * nn.sa];
      g += `<path d="M${f2(o[0])},${f2(o[1])} L${f2(o[0] - nn.n[0] * 0.6)},${f2(o[1] - nn.n[1] * 0.6)}" stroke="#1d1d1b" stroke-width="0.07"/>`;
    }
    for (const d of p.dims) {
      g += `<path d="M${f2(d.a[0])},${f2(d.a[1])} L${f2(d.b[0])},${f2(d.b[1])}" stroke="#c62828" stroke-width="0.04" stroke-dasharray="0.4 0.2" marker-start="url(#pr)" marker-end="url(#pr)"/>`;
      const k = p.dimAt || 0.5, mx = d.a[0] + (d.b[0] - d.a[0]) * k, my = d.a[1] + (d.b[1] - d.a[1]) * k;
      g += d.v ? T(mx - 0.35, my, d.text, 0.8, `fill="#c62828" text-anchor="middle" transform="rotate(-90 ${f2(mx - 0.35)} ${f2(my)})"`)
               : T(mx, my - 0.35, d.text, 0.8, 'fill="#c62828" text-anchor="middle"');
    }
    for (const [x, y, s] of p.notes) g += T(x, y, s, 0.65, 'fill="#5b5b57"');
    /* 조각 이름: 좁은 조각은 오른쪽 바깥, 납작한 조각은 위쪽 한 줄, 나머지는 가운데 */
    const bb = bbox(p.pts), pw = bb.x1 - bb.x0, ph = bb.y1 - bb.y0;
    if (pw < 6) {
      g += T(bb.x1 + 1.2, bb.y0 + 1.4, p.name, 0.9, 'font-weight="700"') + T(bb.x1 + 1.2, bb.y0 + 2.6, p.count, 0.65, 'fill="#5b5b57"');
    } else if (ph < 10) {
      g += T(bb.x0 + pw * 0.3, bb.y0 + ph * 0.32, `${p.name} · ${p.count}${title ? " · " + title : ""}`, 0.85, 'text-anchor="middle" font-weight="700"');
    } else {
      const cx = (bb.x0 + bb.x1) / 2, cy = bb.y0 + ph * (p.labelY || 0.42);
      const big = Math.max(0.8, Math.min(1.6, pw / 9));
      g += T(cx, cy, p.name, big, 'text-anchor="middle" font-weight="700"');
      g += T(cx, cy + big * 1.2, p.count, big * 0.62, 'text-anchor="middle" fill="#5b5b57"');
      if (title) g += T(cx, cy + big * 2.1, title, big * 0.55, 'text-anchor="middle" fill="#5b5b57"');
    }
    return g + "</g>";
  }
  const DEFS = `<defs><marker id="pa" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,1 L7,4 L0,7 z" fill="#1d1d1b"/></marker>`
    + `<marker id="pr" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0,1 L7,4 L0,7 z" fill="#c62828"/></marker></defs>`;

  /* mode: "view"(화면 맞춤) | "real"(실물 크기 mm) | region {x,y,w,h}(cm, 분할 인쇄 한 장) */
  function svg(dr, lay, mode = "view", title = "") {
    const body = lay.placed.map((pl) => pieceSVG(pl, title)).join("");
    const font = 'font-family="IBM Plex Sans KR, Apple SD Gothic Neo, Malgun Gothic, sans-serif"';
    if (mode === "view") return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lay.w} ${lay.h}" ${font} role="img" aria-label="패턴 제도도">${DEFS}<rect width="${lay.w}" height="${lay.h}" fill="#fff"/>${body}</svg>`;
    if (mode === "real") return `<svg xmlns="http://www.w3.org/2000/svg" width="${lay.w * 10}mm" height="${lay.h * 10}mm" viewBox="0 0 ${lay.w} ${lay.h}" ${font}>${DEFS}<rect width="${lay.w}" height="${lay.h}" fill="#fff"/>${body}</svg>`;
    const r = mode;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${r.w * 10}mm" height="${r.h * 10}mm" viewBox="${f2(r.x)} ${f2(r.y)} ${r.w} ${r.h}" ${font}>${DEFS}<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#fff"/>${body}</svg>`;
  }

  /* A4 세로 분할: 인쇄 가능 19.6 × 28.3cm, 1cm 겹침. 조각이 하나도 안 걸리는 장은 뺌 */
  const TILE = { w: 19.6, h: 28.3, overlap: 1 };
  /* 세로·가로 A4 중 장수가 적은 쪽 (같으면 세로) */
  function tiles(lay) {
    const port = tilesFor(lay, TILE.w, TILE.h, false), land = tilesFor(lay, TILE.h, TILE.w, true);
    return land.length < port.length ? land : port;
  }
  function tilesFor(lay, TW, TH, landscape) {
    const sx = TW - TILE.overlap, sy = TH - TILE.overlap;
    // 직사각형 조각(measureOnly)은 자로 재서 자르면 되므로 분할 인쇄 범위에서 뺌
    const boxes = lay.placed.filter(({ p }) => !p.measureOnly).map(({ p, dx, dy }) => { const b = bbox(p.cut.concat(p.dims.flatMap((d) => [d.a, d.b]))); return { x0: b.x0 + dx, y0: b.y0 + dy, x1: b.x1 + dx, y1: b.y1 + dy }; });
    const ext = boxes.reduce((m, b) => ({ w: Math.max(m.w, b.x1), h: Math.max(m.h, b.y1) }), { w: 0, h: 0 });
    const cols = Math.max(1, Math.ceil((ext.w + 1 - TILE.overlap) / sx)), rows = Math.max(1, Math.ceil((ext.h + 1 - TILE.overlap) / sy));
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const t = { x: c * sx, y: r * sy, w: TW, h: TH, landscape, label: `${String.fromCharCode(65 + r)}${c + 1}`, row: r, col: c, rows, cols };
      if (boxes.some((b) => b.x1 > t.x && b.x0 < t.x + t.w && b.y1 > t.y && b.y0 < t.y + t.h)) out.push(t);
    }
    return out;
  }

  function draft(type, vals) {
    const T = TYPES[type];
    const v = Object.fromEntries(T.fields.map(([k, , def]) => [k, Number.isFinite(+vals[k]) && vals[k] !== "" ? +vals[k] : def]));
    const dr = T.draft(v);
    const lay = layout(dr);
    return { type, name: T.name, v, ...dr, lay, tiles: tiles(lay) };
  }

  window.Pattern = { TYPES, draft, svg, TILE, _offset: offset, _area: area };
})();
