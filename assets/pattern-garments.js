/* 작지 — 작업지시서 품목 패턴 제도 (완성 치수 기반). 소분류(34종)의 모양은 작업지시서 디테일 선택(opts)으로 구분:
   카라티(칼라·반오픈), 카디건(앞트임·앞단 시보리), 후드 집업(앞 지퍼), 블라우스(칼라 없음), 코치·데님 자켓(셔츠형 칼라·가슴 주머니),
   블루종(시보리 칼라), 셔츠 원피스(앞 단추 여밈·칼라), 바지(고무줄 허리·밑단 시보리·앞 턱·뒤 요크·입술/아웃 주머니·청바지 앞주머니·카고),
   스커트(플리츠·머메이드·랩)
   작업지시서 치수표의 기준 사이즈 값(단면 = 둘레의 절반)을 받아 조각을 그립니다.
   - 상의: 앞·뒤 반쪽(중심 골선) + 소매. 소매산 높이는 진동둘레 길이에 맞춰 자동 계산
   - 셔츠: 요크·앞단·칼라·칼라밴드·커프스 / 후드티: 후드·캥거루 주머니·시보리 / 자켓: 앞 지퍼·스탠드 칼라
   - 원피스: 몸판(허리 다트) + 치마 / 바지·반바지: 앞·뒤 밑위 곡선, 앞뒤 허벅지 합 = 허벅지 둘레
   - 스커트: pattern.js의 칠판식 제도에 완성 치수를 넣음
   좌표 cm, y 아래로 증가. 제도 값은 표준 공식에 따른 참고값입니다(가봉으로 확인). */
(function () {
  const P = window.Pattern, { bez, chain, r1, curveLen } = P.h;
  const rev = (a) => a.slice().reverse();

  /* 곡선을 y 기준으로 둘로 나눔 (요크 절개용) */
  function splitAtY(curve, y) {
    for (let i = 0; i < curve.length - 1; i++) {
      const a = curve[i], b = curve[i + 1];
      if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) {
        const t = (y - a[1]) / (b[1] - a[1]), m = [a[0] + (b[0] - a[0]) * t, y];
        return [curve.slice(0, i + 1).concat([m]), [m].concat(curve.slice(i + 1))];
      }
    }
    return [curve, [curve[curve.length - 1]]];
  }
  /* 닫힌 다각형을 변 위의 두 점 p1(변 i1)·p2(변 i2)로 잘라 두 조각으로 (자른 선 시접 1) */
  function nearestEdge(pts, p) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)), d = Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function splitPoly(pts, edges, p1, p2, cutSA = 1) {
    const n = pts.length, i1 = nearestEdge(pts, p1), i2 = nearestEdge(pts, p2);
    const walk = (from, to) => { const out = []; for (let k = (from + 1) % n; ; k = (k + 1) % n) { out.push(k); if (k === to) break; } return out; };
    const A = { pts: [p1], edges: [edges[i1]] };                         // p1 → … → p2 → (자른 선) → p1
    for (const k of walk(i1, i2)) { A.pts.push(pts[k]); A.edges.push(edges[k]); }
    A.pts.push(p2); A.edges.push(cutSA);
    const B = { pts: [p2], edges: [edges[i2]] };                         // p2 → … → p1 → (자른 선) → p2
    for (const k of walk(i2, i1)) { B.pts.push(pts[k]); B.edges.push(edges[k]); }
    B.pts.push(p1); B.edges.push(cutSA);
    return [A, B];
  }
  /* 셔츠형 칼라 (칼라밴드 + 칼라), G = 칼라 둘레 */
  function shirtCollar(G) {
    const stand = chain([[bez([0, 3.5], [G * 0.25, 3.5], [G * 0.42, 3.2], [G / 2, 2.2], 10), 1], [bez([G / 2, 2.2], [G / 2 + 1.6, 2], [G / 2 + 1.7, 0.6], [G / 2 + 0.6, 0.2], 6), 1],
      [[[G / 2 + 0.6, 0.2], [0, 0]], 1], [[[0, 0], [0, 3.5]], 0]]);
    const leaf = chain([[[[0, 4.5], [G / 2 - 0.5, 4.2]], 1], [[[G / 2 - 0.5, 4.2], [G / 2 + 1.8, -3.2]], 1], [bez([G / 2 + 1.8, -3.2], [G * 0.35, -3.4], [G * 0.15, -3.5], [0, -3.5], 10), 1], [[[0, -3.5], [0, 4.5]], 0]]);
    return [
      { name: "칼라밴드", count: "2장 (겉·안, 뒤중심 골선, 심지)", pts: stand.pts, edges: stand.edges, darts: [], fold: [[0, 0], [0, 3.5]], lines: [],
        grain: [[G * 0.15, 1.7], [G * 0.35, 1.7]], notchPts: [], dims: [{ a: [0, 4.6], b: [G / 2, 4.6], text: `${r1(G / 2)}` }], notes: [], below: true },
      { name: "칼라", count: "2장 (겉·안, 뒤중심 골선, 심지)", pts: leaf.pts, edges: leaf.edges, darts: [], fold: [[0, -3.5], [0, 4.5]], lines: [],
        grain: [[G * 0.12, 0.5], [G * 0.32, 0.5]], notchPts: [], dims: [], notes: [], below: true },
    ];
  }
  /* 앞중심 단추 위치 (⊕) */
  const buttonNotes = (y0, y1, x = -0.35) => { const n = Math.max(5, Math.round((y1 - y0) / 9)); return Array.from({ length: n }, (_, i) => [x, y0 + 1.5 + i * ((y1 - y0 - 8) / (n - 1)), "⊕"]); };
  const rect = (w, h, sa = 0) => chain([[[[0, 0], [w, 0]], sa], [[[w, 0], [w, h]], sa], [[[w, h], [0, h]], sa], [[[0, h], [0, 0]], sa]]);
  /* 자로 재서 자르는 직사각형 조각 (분할 인쇄 제외) */
  function strip(name, count, w, h, note) {
    return { name, count: `${count} · ${r1(w)} × ${r1(h)}`, ...rect(w, h, 0), darts: [], fold: null,
      lines: h >= 4 ? [{ pts: [[0, h / 2], [w, h / 2]], dash: true }] : [], grain: [[w * 0.4, h / 2], [w * 0.6, h / 2]],
      notchPts: [], dims: [], notes: note ? [[0.4, -0.4, note]] : [], below: true, measureOnly: true };
  }

  /* ---------------- 상의 원형 ---------------- */
  function bodice(v, o) {
    const AD = v.AD || r1(Math.max(19.5, 0.48 * v.C)), slope = v.slope ?? (o.fit === "oversize" ? 3 : 4.5);
    const N2 = v.N / 2, S2 = v.S / 2, C2 = v.C / 2;
    const L = v.L - (o.ribH || 0);                                       // 시보리가 있으면 몸판은 그만큼 짧게
    const hem2 = o.ribH ? Math.max(C2 - 1.5, v.H / 2) : v.H / 2;         // 시보리 밑단이면 몸판 밑단은 시보리보다 넓게
    const SP = [S2, slope], UA = [C2, AD];
    const arm = (front) => bez(SP, [S2 - 0.5, slope + (AD - slope) * 0.5], [Math.max(S2, C2 - (front ? 2.6 : 1.8)), AD - (front ? 0.1 : 0.5)], UA, 18);
    const FND = v.FND, BND = 2;
    const neckF = o.vneck ? [[N2, 0], [0, FND]] : bez([N2, 0], [N2, FND * 0.55], [N2 * 0.55, FND], [0, FND], 14);
    const neckB = bez([N2, 0], [N2 * 0.9, BND * 0.9], [N2 * 0.5, BND], [0, BND], 12);
    const armF = arm(true), armB = arm(false);
    return { AD, slope, SP, UA, L, hem2, FND, BND, neckF, neckB, armF, armB,
      armLen: curveLen(armF) + curveLen(armB), neckLen: curveLen(neckF) + curveLen(neckB) };
  }
  /* 몸판 반쪽: 중심(0) → 목 → 어깨 → 진동 → 옆선 → 밑단 → 중심 */
  function bodyPiece(b, back, opt = {}) {
    const neck = back ? b.neckB : b.neckF, arm = back ? b.armB : b.armF, cY = back ? b.BND : b.FND;
    const hemSA = opt.hemSA ?? 2.5, cSA = opt.centerSA ?? 0, ext = opt.ext || 0;
    const top = opt.topY || 0;
    const parts = [
      [rev(neck), 1],
      [[neck[0], b.SP], 1],
      [arm, 1],
      [[b.UA, [b.hem2, b.L]], 1],
      [[[b.hem2, b.L], [-ext, b.L]], hemSA],
      [[[-ext, b.L], [-ext, cY]].concat(ext ? [[0, cY]] : []), ext ? 0.5 : cSA],
    ];
    const { pts, edges } = chain(parts);
    return { pts, edges, top };
  }
  function topPieces(v, o, b, labels) {
    const front = bodyPiece(b, false, { hemSA: o.hemSA, centerSA: o.frontOpen ? (o.zip ? 1.5 : o.band ? 1 : 0) : 0, ext: o.placket || 0 });
    const back = bodyPiece(b, true, { hemSA: o.hemSA });
    const mk = (pc, isBack) => ({
      name: isBack ? "뒤판 BACK" : "앞판 FRONT",
      count: isBack ? "1장 (뒤중심 골선)" : o.frontOpen ? "2장 (좌우 대칭)" : "1장 (앞중심 골선)",
      pts: pc.pts, edges: pc.edges, darts: [],
      fold: (isBack || !o.frontOpen) ? [[0, isBack ? b.BND : b.FND], [0, b.L]] : null,
      lines: [{ pts: [[0, b.AD], [b.UA[0], b.AD]], dash: true, label: "가슴선" }].concat(
        !isBack && o.placket ? [{ pts: [[0, b.FND], [0, b.L]], dash: true, label: "앞중심 CF" }, { pts: [[-(o.placket - 3), b.FND], [-(o.placket - 3), b.L]], dash: true }] : []),
      grain: [[b.UA[0] * 0.55, b.AD + 4], [b.UA[0] * 0.55, b.L - 6]],
      notchPts: [b.UA, [isBack ? b.armB[12][0] : b.armF[12][0], isBack ? b.armB[12][1] : b.armF[12][1]]],
      dims: [
        { a: [0, b.AD + 2], b: [b.UA[0], b.AD + 2], text: `${r1(b.UA[0])}` },
        { a: [b.UA[0] * 0.3, 0], b: [b.UA[0] * 0.3, b.L], text: `${r1(b.L)}`, v: true },
      ],
      notes: (labels && labels[isBack ? 1 : 0]) || [], labelY: 0.55,
    });
    return [mk(front, false), mk(back, true)];
  }
  /* 소매: 가운데 0 기준 좌우 대칭, 소매산 높이 ch를 진동둘레(+여유)에 맞춤 */
  function sleevePiece(v, b, o) {
    const SW = v.SW, len = v.SL - (o.cuffH || 0), hemHalf = o.hemHalf;
    const cap = (ch) => {
      const r1c = bez([0, 0], [SW * 0.3, 0], [SW * 0.42, ch * 0.18], [SW * 0.52, ch * 0.45], 10);
      const r2c = bez([SW * 0.52, ch * 0.45], [SW * 0.62, ch * 0.75], [SW * 0.8, ch * 0.96], [SW, ch], 10);
      const right = r1c.concat(r2c.slice(1));
      return { right, left: right.map(([x, y]) => [-x, y]) };
    };
    const target = b.armLen + (o.capEase || 0);
    let lo = 1, hi = Math.min(22, SW * 1.4), ch = (lo + hi) / 2;
    for (let i = 0; i < 40; i++) { ch = (lo + hi) / 2; const c = cap(ch); (curveLen(c.right) * 2 < target ? (lo = ch) : (hi = ch)); }
    const c = cap(ch), capLen = curveLen(c.right) * 2;
    const { pts, edges } = chain([
      [rev(c.left), 1], [c.right, 1],
      [[[SW, ch], [hemHalf, len]], 1],
      [[[hemHalf, len], [-hemHalf, len]], o.hemSA ?? 2.5],
      [[[-hemHalf, len], [-SW, ch]], 1],
    ]);
    return {
      piece: {
        name: "소매 SLEEVE", count: "2장 (좌우 대칭)", pts, edges, darts: [], fold: null,
        lines: [{ pts: [[-SW, ch], [SW, ch]], dash: true, label: "소매통선" }, { pts: [[0, 0], [0, len]], dash: true }],
        grain: [[0.001, ch + 3], [0.001, len - 4]],
        notchPts: [[0, 0], c.right[12], c.left[12]],
        dims: [
          { a: [-SW, ch + 2.5], b: [SW, ch + 2.5], text: `${r1(SW * 2)}` },
          { a: [-SW * 0.45, 0], b: [-SW * 0.45, len], text: `${r1(len)}`, v: true },
        ],
        notes: [[SW * 0.12, ch * 0.6, `소매산 ${r1(ch)}`]], labelY: 0.6,
      },
      ch, capLen,
    };
  }

  /* 품목별 상의 */
  function draftTop(kind) {
    return function (v) {
      const o = { fit: v.fit, vneck: v.neck === "v" };
      const knitTop = kind === "top_short" || kind === "top_long";
      const polo = knitTop && v.neck === "collar" && v.closure === "placket";      // 카라티: 칼라 + 반오픈 플래킷
      const cardigan = knitTop && v.closure === "buttons";                         // 카디건: 앞트임 + 앞단 시보리
      const zipHood = kind === "hoodie" && v.closure === "zip";                    // 후드 집업
      const blouse = kind === "shirt" && v.neck !== "collar";                      // 블라우스: 칼라·요크 없음
      const jktCollar = kind === "jacket" && v.neck === "collar";                  // 코치·데님 자켓: 셔츠형 칼라
      const rib = v.rib === "rib" || kind === "hoodie";
      const longSl = kind !== "top_short" && kind !== "dress";
      if (rib && kind !== "shirt") o.ribH = 6;
      o.hemSA = rib ? 1 : kind === "shirt" ? 1.5 : kind === "jacket" ? 3 : 2.5;
      if (kind === "jacket") { o.frontOpen = true; o.zip = v.closure !== "buttons"; if (!o.zip) o.placket = 5.5; }
      if (kind === "shirt") { o.frontOpen = true; o.placket = 4.5; }            // 앞단 1.5 + 접어 붙이는 안단 3
      if (cardigan) { o.frontOpen = true; o.band = true; }
      if (zipHood) { o.frontOpen = true; o.zip = true; }
      const b = bodice(v, o);
      const pieces = [], warn = [], calc = [];
      let [front, back] = topPieces(v, o, b);

      /* 셔츠: 뒤 요크 8cm 절개 (블라우스는 요크 없이) */
      if (kind === "shirt" && !blouse) {
        const Y = 8, [armTop, armBot] = splitAtY(b.armB, Y);
        const yoke = chain([[rev(b.neckB), 1], [[b.neckB[0], b.SP], 1], [armTop, 1], [[[armTop[armTop.length - 1][0], Y], [0, Y]], 1], [[[0, Y], [0, b.BND]], 0]]);
        const body = chain([[[[0, Y], [armBot[0][0], Y]], 1], [armBot, 1], [[b.UA, [b.hem2, b.L]], 1], [[[b.hem2, b.L], [0, b.L]], o.hemSA], [[[0, b.L], [0, Y]], 0]]);
        back = { ...back, pts: body.pts, edges: body.edges, fold: [[0, Y], [0, b.L]], name: "뒤판 BACK", dims: [{ a: [0, b.AD + 2], b: [b.UA[0], b.AD + 2], text: `${r1(b.UA[0])}` }] };
        pieces.push({ name: "요크 YOKE", count: "2장 (겉·안, 뒤중심 골선)", pts: yoke.pts, edges: yoke.edges, darts: [], fold: [[0, b.BND], [0, Y]],
          lines: [], grain: [[b.SP[0] * 0.3, 3], [b.SP[0] * 0.75, 3]], notchPts: [], dims: [], notes: [], labelY: 0.55 });
      }
      // 단추 위치 (앞중심): 셔츠·블라우스·단추 자켓·카디건
      if (kind === "shirt" || cardigan || (kind === "jacket" && !o.zip)) front.notes = buttonNotes(b.FND, b.L);
      if (polo) {
        front.lines.push({ pts: [[0, b.FND], [0, b.FND + 14]], dash: true, label: "플래킷 트임 14" });
        front.notes = [[0.4, b.FND + 15.5, "트임 끝 (반오픈)"]];
      }
      pieces.unshift(front, back);

      /* 소매 */
      const capEase = kind === "shirt" || kind === "jacket" ? 1.5 : 0;
      const cuffH = kind === "shirt" ? 6 : rib && longSl ? 6 : 0;
      const hemHalf = !longSl ? v.SW - 1 : kind === "shirt" ? (v.CU / 2 + 2) : rib ? Math.max(v.CU + 1, v.SW * 0.55) : v.CU;
      const noSleeve = v.sleeve === "none";
      const sl = noSleeve ? { ch: 0, capLen: b.armLen } : sleevePiece(v, b, { capEase, cuffH, hemHalf, hemSA: cuffH ? 1 : kind === "jacket" ? 3 : 2.5 });
      if (noSleeve) pieces.push(strip("진동 바이어스", "2장 (민소매)", r1(b.armLen + 2), 3.5, "진동둘레 + 2"));
      else pieces.push(sl.piece);
      if (!noSleeve && Math.abs(sl.capLen - b.armLen - capEase) > 1) warn.push("소매산 길이를 진동둘레에 맞추지 못했습니다. 소매통이나 진동 깊이를 확인하세요.");

      /* 목·칼라·후드 */
      const neckFull = b.neckLen * 2;
      if (kind === "shirt") {
        if (blouse) pieces.push(strip("목 바이어스", "1장", r1(neckFull + 2), 3.5, "목둘레 + 2 · 안으로 접어 상침"));
        else pieces.push(...shirtCollar(v.G || neckFull));
        pieces.push(strip("커프스", "4장 (겉·안, 심지)", v.CU + 2.5, 6 + 2, "+시접 1"));
        if (v.chest) pieces.push(strip("가슴 주머니", "1장", 11 + 2, 13 + 3.5, "윗단 접음 2.5 포함"));
      } else if (polo) {
        pieces.push(strip("폴로 칼라", "1장 (편직 칼라 권장 · 원단이면 2장)", r1(neckFull - 3 + 2), 7 + 2, "완성 높이 7 · 목둘레 − 플래킷 3"));
        pieces.push(strip("플래킷 (단추단)", "2장 (2겹 접음, 심지)", 3 * 2 + 2, 14 + 2, "완성 폭 3 · 길이 14 · 단추 2~3개"));
      } else if (cardigan) {
        pieces.push(strip("앞단 시보리 (앞여밈·목둘레)", "1장 (2겹 접음)", r1((2 * (b.L - b.FND) + neckFull) * 0.95), 3 * 2 + 2, "완성 폭 3 · 단추 위치는 작업지시서 참고"));
      } else if (kind === "hoodie") {
        const J = v.J, K = v.K, nh = neckFull / 2;
        const back1 = bez([nh * 0.98, J - 2.5], [K + 1, J * 0.62], [K + 0.5, J * 0.12], [K * 0.5, 0], 16);
        const hood = chain([[[[0, 0], [0, J]], 3], [bez([0, J], [nh * 0.35, J + 0.6], [nh * 0.7, J], [nh * 0.98, J - 2.5], 10), 1], [back1, 1], [[[K * 0.5, 0], [0, 0]], 1]]);
        pieces.push({ name: "후드 HOOD", count: "겉 2장 · 안 2장 (좌우 대칭)", pts: hood.pts, edges: hood.edges, darts: [], fold: null,
          lines: [{ pts: [[2.5, 0], [2.5, J]], dash: true, label: "끈 통로 접는 선" }], grain: [[K * 0.45, J * 0.3], [K * 0.45, J * 0.8]], notchPts: [[nh * 0.5, J + 0.4]],
          dims: [{ a: [K * 0.2, 0], b: [K * 0.2, J], text: `${r1(J)}`, v: true }, { a: [0, J * 0.45], b: [K, J * 0.45], text: `${r1(K)}` }], notes: [], labelY: 0.6 });
        if (v.kangaroo) {
          const pw = v.C * 0.32, ph = 21, top = pw * 0.72;
          const pk = chain([[[[0, 0], [top, 0]], 1], [[[top, 0], [pw, ph]], 1], [[[pw, ph], [0, ph]], 1], [[[0, ph], [0, 0]], zipHood ? 1 : 0]]);
          pieces.push({ name: zipHood ? "앞 손주머니" : "캥거루 주머니", count: zipHood ? "2장 (좌우 대칭, 지퍼 쪽 시접 1)" : "1장 (중심 골선)", pts: pk.pts, edges: pk.edges, darts: [], fold: zipHood ? null : [[0, 0], [0, ph]], lines: [],
            grain: [[top * 0.4, 4], [top * 0.4, ph - 4]], notchPts: [], dims: [], notes: [[top + 0.3, ph * 0.45, "주머니 입구"]], below: true });
        }
      } else if (kind === "jacket") {
        if (jktCollar) pieces.push(...shirtCollar(neckFull));
        else if (v.rib === "rib") pieces.push(strip("칼라 시보리", "1장 (2겹 접음)", r1(neckFull * 0.9), 5 * 2 + 2, "완성 높이 5 (블루종)"));
        else pieces.push(strip("스탠드 칼라", "2장 (겉·안)", neckFull + (o.zip ? 0 : 3), 6 + 2, "+시접 1"));
        if (v.patch) pieces.push(strip("아웃포켓", "2장", 16, 18 + 3.5, "윗단 접음 3.5 포함"));
        if (v.chest) { pieces.push(strip("가슴 주머니", "2장", 13 + 2, 15 + 3.5, "윗단 접음 3.5 포함")); pieces.push(strip("주머니 덮개 (플랩)", "4장 (겉·안)", 14 + 2, 6 + 2, "완성 6 · 단추 1")); }
      } else if (v.neck !== "mock") {
        pieces.push(strip("목 시보리", "1장 (2겹 접음)", r1(neckFull * 0.85), 2 * 1.8 + 2, "완성 폭 1.8 · 시접 포함"));
      } else {
        pieces.push(strip("하이넥 시보리", "1장 (2겹 접음)", r1(neckFull * 0.9), 2 * 5 + 2, "완성 높이 5"));
      }
      if (o.ribH) {
        if (longSl) pieces.push(strip("소매 시보리", "2장 (2겹 접음)", r1(hemHalf * 2 * 0.8), 2 * 6 + 2, "완성 6"));
        pieces.push(strip("밑단 시보리", "1장 (2겹 접음)", r1(v.H * 2), 2 * 6 + 2, "완성 6 · 이완 둘레 = 밑단단면 × 2"));
      }
      if (zipHood) calc.push(["앞 지퍼 (오픈형)", "총장 − 밑단 시보리 − 1", r1(v.L - 6 - 1)]);
      calc.push(["진동 깊이 (목옆점 → 겨드랑이)", v.AD ? "입력값" : "가슴단면 × 0.48", b.AD], ["어깨 경사", "레귤러 4.5 · 오버핏 3", b.slope],
        ["몸판 반쪽 가슴 폭", "가슴단면 ÷ 2", r1(v.C / 2)], ["몸판 반쪽 밑단 폭", o.ribH ? "시보리 위 몸판" : "밑단단면 ÷ 2", r1(b.hem2)],
        ["진동둘레 (앞+뒤)", "곡선 길이", r1(b.armLen)], ["소매산 높이", `소매산 길이 = 진동둘레${capEase ? " + 여유 " + capEase : ""}`, r1(sl.ch)],
        ["목둘레 (전체)", "앞+뒤 목선 × 2", r1(neckFull)]);
      if (o.ribH) calc.push(["몸판 길이", `총장 − 시보리 ${o.ribH}`, r1(b.L)]);
      return { pieces, warn, calc: calc.map(([a, x, c]) => [a, x, typeof c === "number" ? r1(c) : c]),
        seam: `시접: 목·어깨·진동·옆선 1 (오버록) · 밑단 ${o.hemSA}${o.frontOpen ? (o.zip ? " · 앞중심 1.5 (지퍼)" : o.band ? " · 앞중심 1 (앞단 시보리)" : " · 앞단 접어 붙임") : " · 중심 골선"}` };
    };
  }

  /* ---------------- 원피스: 몸판(허리 다트) + 치마 ---------------- */
  function draftDress(v) {
    const o = { fit: v.fit, vneck: v.neck === "v" };
    const b = bodice({ ...v, L: v.WY }, o);
    const Lw2 = v.LW / 2, C2 = v.C / 2, ex = Math.max(0, C2 - Lw2), side = r1(Math.min(2.5, ex * 0.45)), dart = r1(ex - side);
    const warn = [];
    if (dart > 5) warn.push("허리 다트가 5cm를 넘습니다. 허리단면을 늘리거나 다트를 2개로 나누세요.");
    const pieces = [];
    const open = v.closure === "buttons", ext = open ? 4.5 : 0;               // 셔츠 원피스: 앞 단추 여밈(앞단 1.5 + 안단 3), 뒤는 골선
    for (const back of [false, true]) {
      const neck = back ? b.neckB : b.neckF, arm = back ? b.armB : b.armF, cY = back ? b.BND : b.FND, wx = Lw2 + dart;
      const frontOpen = open && !back, backZip = back && !open;
      const tail = frontOpen ? [[[[wx, v.WY], [-ext, v.WY]], 1], [[[-ext, v.WY], [-ext, cY], [0, cY]], 0.5]] : [[[[wx, v.WY], [0, v.WY]], 1], [[[0, v.WY], [0, cY]], backZip ? 1.5 : 0]];
      const pc = chain([[rev(neck), 1], [[neck[0], b.SP], 1], [arm, 1], [[b.UA, [wx, v.WY]], 1], ...tail]);
      const dx = C2 * 0.42;
      pieces.push({ name: back ? "뒤 몸판" : "앞 몸판", count: back ? (backZip ? "2장 (뒤중심 지퍼)" : "1장 (뒤중심 골선)") : (frontOpen ? "2장 (좌우 대칭, 앞단)" : "1장 (앞중심 골선)"), pts: pc.pts, edges: pc.edges,
        darts: dart > 0.4 ? [{ pts: [[dx - dart / 2, v.WY], [dx, b.AD + (back ? 0 : 2)], [dx + dart / 2, v.WY]] }] : [], fold: frontOpen || backZip ? null : [[0, cY], [0, v.WY]],
        lines: [{ pts: [[0, b.AD], [C2, b.AD]], dash: true, label: "가슴선" }].concat(frontOpen ? [{ pts: [[0, cY], [0, v.WY]], dash: true, label: "앞중심 CF" }] : []), grain: [[C2 * 0.75, b.AD + 2], [C2 * 0.75, v.WY - 2]],
        notchPts: [[dx - dart / 2, v.WY], [dx + dart / 2, v.WY]], dims: [{ a: [0, v.WY - 2], b: [wx, v.WY - 2], text: `${r1(Lw2)} + 다트 ${dart}` }], notes: frontOpen ? buttonNotes(cY, v.WY + 6) : [], labelY: 0.5 });
    }
    const SL = v.L - v.WY, hem2 = v.shape === "h" ? Lw2 + dart + 3 : v.D / 2;
    for (const back of [false, true]) {
      const w = Lw2 + dart, frontOpen = open && !back, backZip = back && !open, x0 = frontOpen ? -ext : 0;
      const pc = chain([[[[x0, 0], [w, 0]], 1], [[[w, 0], [hem2, SL]], 1.5], [[[hem2, SL], [x0, SL]], 3], [[[x0, SL], [x0, 0]], frontOpen ? 0.5 : backZip ? 1.5 : 0]]);
      pieces.push({ name: back ? "뒤 치마" : "앞 치마", count: back ? (backZip ? "2장" : "1장 (뒤중심 골선)") : (frontOpen ? "2장 (좌우 대칭, 앞단)" : "1장 (앞중심 골선)"), pts: pc.pts, edges: pc.edges,
        darts: [], fold: frontOpen || backZip ? null : [[0, 0], [0, SL]], lines: v.shape === "pleat" ? [{ pts: [[w * 0.5, 0], [hem2 * 0.5, SL]], dash: true, label: "플리츠 위치 (분량 추가 필요)" }] : [],
        grain: [[w * 0.5, 4], [w * 0.5, SL - 6]], notchPts: [[C2 * 0.42 - dart / 2, 0], [C2 * 0.42 + dart / 2, 0]],
        dims: [{ a: [0, SL - 3], b: [hem2, SL - 3], text: `${r1(hem2)}` }, { a: [w * 0.25, 0], b: [w * 0.25, SL], text: `${r1(SL)}`, v: true }],
        notes: [[0.8, 2.2, "다트 위치에 주름(턱) 또는 다트"]].concat(frontOpen ? buttonNotes(-6, SL * 0.55) : []), labelY: 0.4 });
    }
    const sl = v.sleeve === "none" ? { ch: 0 } : sleevePiece(v, b, { capEase: 1, hemHalf: v.SW - 1, hemSA: 2.5 });
    if (v.sleeve === "none") pieces.push(strip("진동 바이어스", "2장 (민소매)", r1(b.armLen + 2), 3.5, "진동둘레 + 2")); else pieces.push(sl.piece);
    if (v.neck === "collar") pieces.push(...shirtCollar(b.neckLen * 2));
    else pieces.push(strip("목 바이어스", "1장", r1(b.neckLen * 2 + 2), 3.5, "안단 처리 시"));
    return { pieces, warn,
      calc: [["허리 위치 (목옆점 → 허리)", "입력값", v.WY], ["몸판 남는 양 (반쪽)", "가슴 ÷ 2 − 허리 ÷ 2", r1(ex)], ["옆선 들임 / 허리 다트", "남는 양 × 0.45 / 나머지", `${side} / ${dart}`],
        ["치마 길이", "총장 − 허리 위치", r1(SL)], ["치마 밑단 반쪽", v.shape === "h" ? "H라인" : "밑단단면 ÷ 2", r1(hem2)], ["소매산 높이", "진동둘레 + 1", r1(sl.ch)]],
      seam: open ? "시접: 1 · 옆선 1.5 · 앞단 접어 붙임 (단추 여밈) · 밑단 3 · 뒤중심 골선" : "시접: 1 · 옆선 1.5 · 뒤중심 1.5 (콘솔지퍼) · 밑단 3 · 앞중심 골선" };
  }

  /* ---------------- 바지·반바지 ----------------
     디테일: waist(fixed·elastic) · legRib(밑단 시보리) · pleat(앞 턱) · fpocket(slant·scoop) · bpocket(patch=뒤 요크+아웃포켓, welt=입술) · back · side · cargo */
  function draftPants(short) {
    return function (v) {
      const band = 4, R = v.FR - band, warn = [];
      const elastic = v.waist === "elastic", ribH = v.legRib ? 7 : 0, tuck = v.pleat && !elastic ? 3 : 0;
      const yoke = !!v.back && v.bpocket === "patch" && !elastic, welt = !!v.back && v.bpocket === "welt", scoop = v.fpocket === "scoop";
      const Lb = v.OL - band - ribH, hipY = Math.max(6, v.FR * 0.66 - band);
      const Fw = v.HP / 2 - 1, Bw = v.HP / 2 + 1, wf = v.W / 2 - 0.5, dartB = yoke || elastic ? 0 : 2, wb = v.W / 2 + 0.5;
      const extTot = Math.max(8, 2 * v.TH - v.HP), ef = r1(Math.max(2.5, extTot * 0.3)), eb = r1(Math.max(5, extTot - ef));
      const kneeY = R + (Lb - R) * 0.45;
      if (v.W > v.HP) warn.push("허리가 엉덩이보다 큽니다. 치수를 확인하세요.");
      const extraPieces = [];
      function leg(back) {
        const w = back ? Bw : Fw, e = back ? eb : ef, drop = back ? 1 : 0;
        const hemW = (back ? v.HM + 1 : v.HM - 1) + (ribH ? 4 : 0);                 // 시보리 밑단이면 몸판 밑단은 시보리보다 넓게
        const cx = (w - e) / 2, hf = hemW / 2, kf = hf + (short ? 0 : 1);
        const cbTop = back ? (elastic ? [1.5, -1.5] : [3, -2.5]) : [0.8, 0];
        // 허리 옆점: 고무줄 허리는 엉덩이 폭 그대로(입고 벗을 수 있게), 아니면 허리 치수(+앞 턱)
        const wSide = elastic ? [w, 0] : back ? [cbTop[0] + Math.sqrt(Math.max(1, (wb + dartB) ** 2 - 2.5 ** 2)), 0] : [0.8 + wf + tuck, 0];
        const out = short
          ? bez(wSide, [w, hipY * 0.45], [w + 0.2, hipY + 2], [cx + hf, Lb], 14)
          : bez(wSide, [w, hipY * 0.45], [w, hipY], [w - 0.3, R], 10).concat(bez([w - 0.3, R], [cx + kf + 1, kneeY - 6], [cx + kf, kneeY], [cx + hf, Lb], 12).slice(1));
        const inn = short ? [[cx - hf, Lb], [-e, R + drop]] : bez([cx - hf, Lb], [cx - kf, kneeY], [-e + 2.5, R + drop + 4], [-e, R + drop], 12);
        const crotch = bez([-e, R + drop], [-e * 0.45, R + drop], [0, hipY + (R - hipY) * 0.55], [0, hipY], 12);
        const hemSA = ribH ? 1 : short ? 2.5 : 3;
        const pc = chain([[[cbTop, wSide], 1], [out, 1.5], [[[cx + hf, Lb], [cx - hf, Lb]], hemSA], [inn, 1.5], [crotch, 1], [[[0, hipY], cbTop], back ? 2 : 1]]);
        const piece = { name: back ? "뒤판 BACK" : "앞판 FRONT", count: "2장 (좌우 대칭)", pts: pc.pts, edges: pc.edges, darts: [], fold: null,
          lines: [{ pts: [[cx, yoke && back ? 10 : 3], [cx, Lb - 2]], dash: true, label: "주름선 (식서)" }, { pts: [[0, hipY], [w, hipY]], dash: true, label: "엉덩이선 HL" }, { pts: [[-e, R + drop], [w, R + drop]], dash: true, label: "밑위선" }],
          grain: [[cx + 1.2, hipY + 4], [cx + 1.2, Math.min(Lb - 4, hipY + 30)]], notchPts: [[w, hipY], [0, hipY]],
          dims: [{ a: [0, hipY + 2], b: [w, hipY + 2], text: `${r1(w)}` }, { a: [cx - hf, Lb - 2], b: [cx + hf, Lb - 2], text: `${r1(hemW)}` }],
          notes: [], labelY: short ? 0.62 : 0.5 };
        if (back) {
          const mx = (cbTop[0] + wSide[0]) / 2, my = (cbTop[1] + wSide[1]) / 2;
          if (dartB) piece.darts = [{ pts: [[mx - dartB / 2, my], [mx, my + 10], [mx + dartB / 2, my]] }];
          if (welt) piece.lines.push({ pts: [[mx - 7, 8], [mx + 7, 8]], label: "입술 주머니 14" });
          if (yoke) {
            // 뒤 요크: 뒤중심 7cm 아래 ~ 옆선 3.5cm 아래를 잇는 선으로 잘라 별도 조각 (뒤 다트 대신)
            const yc = cbTop[1] + 7, tc = (hipY - yc) / (hipY - cbTop[1]), p1 = [cbTop[0] * tc, yc];
            const ys = 3.5, j = Math.max(0, out.findIndex(([, y], i) => i < out.length - 1 && y < ys && out[i + 1][1] >= ys));
            const ta = (ys - out[j][1]) / ((out[j + 1][1] - out[j][1]) || 1), p2 = [out[j][0] + (out[j + 1][0] - out[j][0]) * ta, ys];
            const [A, B] = splitPoly(piece.pts, piece.edges, p1, p2);
            extraPieces.push({ name: "뒤 요크 YOKE", count: "2장 (좌우 대칭)", pts: A.pts, edges: A.edges, darts: [], fold: null, lines: [],
              grain: [[mx - 3, 1.5], [mx + 3, 1.5]], notchPts: [], dims: [], notes: [], below: true });
            piece.pts = B.pts; piece.edges = B.edges;
            piece.lines.push({ pts: [[mx - 7, yc + 3], [mx + 7, yc + 2]], label: "뒷주머니 위치" });
          }
        } else {
          if (v.side && !scoop) piece.lines.push({ pts: [[wSide[0] - 4.5 - tuck, 0.1], [w - 0.1, 15]], label: "" }), piece.notes.push([w - 6, 6, "주머니 입구"]);
          if (v.side && scoop) piece.lines.push({ pts: bez([wSide[0] - 10, 0.1], [wSide[0] - 9.5, 5], [w - 4, 7.5], [w - 0.1, 8], 10), label: "" }), piece.notes.push([w - 9, 4.5, "앞주머니 (청바지형)"]);
          if (tuck) {
            piece.lines.push({ pts: [[cx, 0.1], [cx, 7]], dash: true, label: "" }, { pts: [[cx + tuck, 0.1], [cx + tuck, 7]], dash: true, label: "" });
            piece.notes.push([cx + 0.3, 8.5, `턱 ${tuck} (앞중심 쪽으로 접음)`]);
            piece.notchPts.push([cx, 0], [cx + tuck, 0]);
          }
          if (!elastic) { piece.lines.push({ pts: [[0.8, 0], [3.8, 0.2], [3.8, R - 6], [0.6, R - 3]], dash: true, label: "" }); piece.notes.push([1.2, R - 7.5, "J 스티치"]); }
        }
        return piece;
      }
      const pieces = [leg(false), leg(true), ...extraPieces];
      if (elastic) pieces.push(strip("허리밴드 (고무줄 통)", "1장 (2겹)", r1((Fw + Bw) * 2 + 2), band * 2 + 2, "고무줄 폭 3.5 · 고무줄 길이는 허리둘레보다 짧게, 입어 보며 조정"));
      else pieces.push(strip("허리밴드", "1장 (2겹, 심지)", r1(v.W * 2 + 4), band * 2 + 2, "겹침 4 · 시접 포함"), strip("지퍼 안단", "2장", 5, r1(R - 3), ""));
      if (v.side) pieces.push(strip("주머니감", "2장 (T/C 포켓감)", 17, 30, ""));
      if (v.side && scoop) pieces.push(strip("주머니 받침천 (앞)", "2장 (겉감)", 17, 20, "주머니 입구 안쪽에 보이는 천"));
      if (yoke) pieces.push((() => { const pk = chain([[[[0, 0], [14, 0]], 3], [[[14, 0], [14, 13]], 1], [[[14, 13], [7, 15]], 1], [[[7, 15], [0, 13]], 1], [[[0, 13], [0, 0]], 1]]);
        return { name: "뒷주머니 (아웃포켓)", count: "2장", pts: pk.pts, edges: pk.edges, darts: [], fold: null, lines: [{ pts: [[0, 3], [14, 3]], dash: true, label: "윗단 접는 선" }],
          grain: [[7, 4], [7, 11]], notchPts: [], dims: [{ a: [0, 7], b: [14, 7], text: "14" }], notes: [], below: true }; })());
      if (welt) pieces.push(strip("입술감 (뒷주머니)", "2장 (2겹, 심지)", 16, 6, "완성 입술 1 · 주머니 입구 14"), strip("뒷주머니감", "2장 (반 접어 주머니)", 16, 36, ""));
      if (v.cargo) pieces.push(strip("카고 주머니", "2장", 18 + 2, 20 + 3.5, "옆선 허벅지 · 가운데 턱 넣으면 폭 +4"), strip("카고 덮개 (플랩)", "4장 (겉·안)", 19 + 2, 7 + 2, "완성 7 · 스냅 1"));
      if (ribH) pieces.push(strip("밑단 시보리", "2장 (2겹 접음)", r1(v.HM * 2), ribH * 2 + 2, `완성 ${ribH} · 이완 둘레 = 밑단단면 × 2`));
      if (!elastic) pieces.push(strip("벨트고리", "5장", 1.2, 9, ""));
      const calc = [["몸판 밑위 (밴드 아래)", `앞 밑위 ${v.FR} − 밴드 ${band}`, r1(R)], ["엉덩이선 위치", "밑위 2/3 지점", r1(hipY)],
        ["앞판 / 뒤판 엉덩이 폭", "엉덩이단면 ÷ 2 ∓ 1", `${r1(Fw)} / ${r1(Bw)}`],
        elastic ? ["허리 폭 (고무줄)", "엉덩이 폭 그대로 · 고무줄로 줄임", `${r1(Fw)} / ${r1(Bw)}`] : ["앞 / 뒤 허리 폭", `허리단면 ÷ 2 ∓ 0.5${dartB ? " (+뒤 다트 2)" : ""}${tuck ? ` (+앞 턱 ${tuck})` : ""}`, `${r1(wf + tuck)} / ${r1(wb)}`],
        ["앞 / 뒤 밑위 연장", "허벅지 × 2 − 엉덩이, 3 : 7", `${ef} / ${eb}`], ["앞 / 뒤 밑단 폭", ribH ? "밑단단면 ∓ 1 + 시보리 여유 4" : "밑단단면 ∓ 1", `${r1(v.HM - 1 + (ribH ? 4 : 0))} / ${r1(v.HM + 1 + (ribH ? 4 : 0))}`],
        ["몸판 길이", `총장 ${v.OL} − 밴드 ${band}${ribH ? ` − 시보리 ${ribH}` : ""}`, r1(Lb)]];
      return { pieces, warn, calc,
        seam: `시접: 허리 1 · 옆선·인심 1.5 · 밑위 1 · 뒤중심 2 · 밑단 ${ribH ? "1 (시보리)" : short ? 2.5 : 3}${elastic ? " · 고무줄 허리 (지퍼 없음)" : ""}${yoke ? " · 뒤 요크 절개 1" : ""}` };
    };
  }

  /* ---------------- 플리츠 스커트 (테니스·플리츠 롱) ----------------
     한 방향 주름(나이프 플리츠). 앞·뒤 각 반쪽(중심 골선)에 주름 분량을 더한 사다리꼴 판.
     허리는 엉덩이보다 작으므로 주름 하나마다 (엉덩이 − 허리) ÷ 주름 수 만큼 허리에서 더 접어 맞춤 */
  function draftPleat(v) {
    const bandW = 3, L = v.L - bandW, n = Math.max(8, Math.round((v.PN || 16) / 4) * 4), d = Math.max(1, v.PD || 3);
    const hip = v.HP * 2 + 2, waist = v.W * 2, hem = Math.max(v.HM * 2, hip);
    const per = n / 4, extra = per * 2 * d;                         // 반쪽 판 하나에 들어가는 주름 수·주름 분량
    const topW = r1(hip / 4 + extra), botW = r1(hem / 4 + extra), atWaist = r1((hip - waist) / n);
    const warn = [];
    if (atWaist > d * 1.5) warn.push("허리와 엉덩이 차이가 커서 허리에서 주름을 많이 접어야 합니다. 주름 수를 늘리거나 요크를 넣으세요.");
    const pieces = [];
    for (const back of [false, true]) {
      const pc = chain([[[[0, 0], [topW, 0]], 1], [[[topW, 0], [botW, L]], 1.5], [[[botW, L], [0, L]], 2.5], [[[0, L], [0, 0]], 0]]);
      const lines = [];
      for (let i = 0; i < per; i++) {
        const ut = topW / per, ub = botW / per, xt = ut * (i + 0.5), xb = ub * (i + 0.5);
        lines.push({ pts: [[xt, 0], [xb, L]], label: i === 0 ? "접는 선" : "" }, { pts: [[xt + 2 * d, 0], [xb + 2 * d, L]], dash: true, label: i === 0 ? "맞추는 선" : "" });
      }
      pieces.push({ name: back ? "뒤판 BACK (플리츠)" : "앞판 FRONT (플리츠)", count: "1장 (중심 골선)", pts: pc.pts, edges: pc.edges, darts: [], fold: [[0, 0], [0, L]],
        lines, grain: [[topW * 0.15, 4], [topW * 0.15, Math.min(L - 4, 30)]], notchPts: [],
        dims: [{ a: [0, L * 0.5], b: [topW + (botW - topW) * 0.5, L * 0.5], text: `${r1(topW)} → ${r1(botW)}` }, { a: [topW * 0.06, 0], b: [topW * 0.06, L], text: `${r1(L)}`, v: true }],
        notes: [[topW * 0.02 + 0.5, L * 0.85, `주름 ${per}개 · 깊이 ${d} · 접는 선을 맞추는 선에 겹침 →`]].concat(back ? [] : [[topW - 6, 2.5, "왼쪽 옆선 콘솔지퍼 18"]]), labelY: 0.35 });
    }
    pieces.push(strip("허리밴드", "1장 (접착 심지)", r1(waist + 3), bandW * 2 + 2, "겹침 3 · 시접 포함"));
    return { pieces, warn,
      calc: [["엉덩이 둘레 + 여유", `${v.HP} × 2 + 2`, r1(hip)], ["주름 수 / 깊이", "입력값 (4의 배수로 맞춤)", `${n} / ${d}`],
        ["반쪽 판 주름 분량", `주름 ${per}개 × 깊이 ${d} × 2`, r1(extra)], ["반쪽 판 폭 (위 / 밑단)", "둘레 ÷ 4 + 주름 분량", `${topW} / ${botW}`],
        ["허리에서 주름 하나당 더 접는 양", "(엉덩이 − 허리) ÷ 주름 수", atWaist], ["치마 길이", `총장 − 밴드 ${bandW}`, r1(L)]],
      seam: "시접: 허리 1 · 옆선 1.5 · 밑단 2.5 · 앞·뒤 중심 골선 · 주름은 다림질로 고정" };
  }

  /* ---------------- 등록: 작업지시서 품목과 같은 이름(ws_템플릿) ---------------- */
  const topFields = [["L", "총장", 72], ["S", "어깨너비", 47], ["C", "가슴단면", 55], ["H", "밑단단면", 54], ["SL", "소매길이", 21], ["SW", "소매통단면", 21],
    ["N", "목너비", 19], ["FND", "앞목깊이", 9], ["AD", "진동 깊이 (비우면 자동)", null], ["slope", "어깨 경사 (비우면 자동)", null]];
  const spec = { L: "총장", S: "어깨너비", C: "가슴단면", H: "밑단단면", SL: "소매길이", SW: "소매통단면", N: "목너비", FND: "앞목깊이", CU: "소매부리단면",
    J: "후드 높이", K: "후드 너비", LW: "허리단면", D: "밑단단면" };
  const reg = (key, name, draft, fields, fromSpec) => { P.TYPES[key] = { name, draft, fields, presets: {}, fromSpec, fromWorksheet: true }; };
  reg("ws_top_short", "반팔 티셔츠", draftTop("top_short"), topFields, spec);
  reg("ws_top_long", "긴팔 티셔츠·맨투맨", draftTop("top_long"), topFields.concat([["CU", "소매부리단면", 10]]), spec);
  reg("ws_shirt", "셔츠", draftTop("shirt"), topFields.map((f) => f[0] === "N" ? ["N", "목너비", 17] : f[0] === "FND" ? ["FND", "앞목깊이", 7.5] : f).concat([["CU", "커프스 둘레", 24], ["G", "칼라 둘레", 41]]), { ...spec, CU: "커프스 둘레", G: "칼라 둘레" });
  reg("ws_hoodie", "후드티", draftTop("hoodie"), topFields.concat([["CU", "소매부리단면", 10], ["J", "후드 높이", 35], ["K", "후드 너비", 25]]), spec);
  reg("ws_jacket", "자켓·점퍼", draftTop("jacket"), topFields.map((f) => f[0] === "FND" ? ["FND", "앞목깊이", 8] : f).concat([["CU", "소매부리단면", 15]]), spec);
  reg("ws_dress", "원피스", draftDress, [["L", "총장", 105], ["S", "어깨너비", 37], ["C", "가슴단면", 46], ["LW", "허리단면", 37], ["D", "밑단단면", 64], ["SL", "소매길이", 18],
    ["SW", "소매통단면 (비우면 자동)", null], ["N", "목너비", 17], ["FND", "앞목깊이", 9], ["WY", "허리 위치 (목옆점→허리)", 39], ["AD", "진동 깊이 (비우면 자동)", null], ["slope", "어깨 경사 (비우면 자동)", null]], spec);
  const pantsFields = [["W", "허리단면", 41], ["HP", "엉덩이단면", 52], ["TH", "허벅지단면", 32], ["FR", "앞 밑위", 28], ["HM", "밑단단면", 20], ["OL", "총장", 102]];
  const pSpec = { W: "허리단면", HP: "엉덩이단면", TH: "허벅지단면", FR: "앞 밑위", HM: "밑단단면", OL: "총장" };
  reg("ws_pants", "바지", draftPants(false), pantsFields, pSpec);
  reg("ws_shorts", "반바지", draftPants(true), pantsFields.map((f) => f[0] === "HM" ? ["HM", "밑단단면", 30] : f[0] === "OL" ? ["OL", "총장", 48] : f), pSpec);
  reg("ws_skirt", "스커트", (v) => {
    const base = { waist: v.W * 2, hip: v.HP * 2, hipLen: v.HL, len: v.L - 3, ease: 0, waistEase: 0, zip: 20 };
    if (v.shape === "pleat") return draftPleat(v);                                  // 테니스·플리츠 롱
    if (v.shape === "mermaid") return P.draftSkirt({ ...base, hem: 0, mermaidHem: v.HM * 2 });
    if (v.shape === "wrap") return P.draftSkirt({ ...base, hem: v.HM * 2, wrap: true });
    return P.draftSkirt({ ...base, hem: v.shape === "h" ? 0 : v.HM * 2 });           // A라인·미니(A)·H라인
  }, [["W", "허리단면", 35], ["HP", "엉덩이단면", 48], ["HM", "밑단단면", 58], ["L", "총장 (밴드 포함)", 65], ["HL", "엉덩이길이", 18],
      ["PN", "주름 수 (플리츠)", 16], ["PD", "주름 깊이 (플리츠)", 3]], { W: "허리단면", HP: "엉덩이단면", HM: "밑단단면", L: "총장" });

  reg("ws_pouch", "파우치", (v) => P.draftPouch({ w: v.W, h: v.H, d: v.D, sa: v.sa }),
    [["W", "가로", 20], ["H", "높이", 12], ["D", "마치", 6], ["sa", "시접", 1]], { W: "가로", H: "높이", D: "마치" });

  /* 원피스 소매통이 치수표에 없으면 가슴단면으로 추정 */
  const dd = P.TYPES.ws_dress.draft;
  P.TYPES.ws_dress.draft = (v) => dd({ ...v, SW: v.SW || r1(v.C * 0.36) });
  /* 사용자의 디테일 선택(핏·넥라인·여밈·시보리·주머니·모양)을 함께 받음 */
  P.OPT_KEYS = ["fit", "neck", "closure", "rib", "shape", "chest", "kangaroo", "patch", "side", "back", "sleeve",
    "waist", "fpocket", "bpocket", "cargo", "pleat", "legRib", "style"];
})();
