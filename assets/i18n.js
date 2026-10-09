/* 작지 — 번역 엔진 (도구 화면 app.html). 영어 화면(?lang=en)이거나, 작업지시서 언어가 한국어가 아닐 때만 불러옴.
   한국어 원문을 그대로 두고, 화면에 들어오는 글자(텍스트 노드·placeholder·title·aria-label)를
   사전(window.I18N_DICT: 정확히 같은 문장 → 번역, I18N_RULES: 숫자 등이 섞인 문장 정규식)으로 바꿉니다.
   두 가지 범위를 따로 다룸:
   - 화면(UI): window.LANG === "en" 이면 #sheet 밖 전체를 영어로
   - 작업지시서(#sheet): window.SHEET_LANG = "ko" | "en" | "both"(한·영 병기: 한국어 줄 + 영어 줄)
   번역한 글자마다 한국어 원문을 기억(srcText) → 저장·검사는 원문, 언어를 바꾸면 원문에서 다시 만듦.
   - 코드가 화면 글자를 다시 읽어 비교하는 곳(치수표 측정 부위)은 data-part 원문을 씀
   - 사전에 없는 문장은 그대로 두고 I18N.miss에 모음 (tests/verify.mjs가 0건인지 검사) */
(function () {
  var D = window.I18N_DICT || {}, R = window.I18N_RULES || [];
  var HAN = /[ㄱ-ㆎ가-힣]/;
  var miss = new Set();
  var SEP = /( · | \/ | — | → | ← | \+ | − | × | = |, |: |; |\n|\(|\)|\[|\]|「|」|“|”|‘|’|")/;
  var NUM = /((?:[+−-]?\d[\d.,]*)(?:\s?(?:cm|mm|%|g\/㎡|oz|°C|℃|D))?)/;
  function look(c, depth) {
    if (!HAN.test(c)) return c;
    if (Object.prototype.hasOwnProperty.call(D, c)) return D[c];
    for (var i = 0; i < R.length; i++) {
      var m = c.match(R[i][0]);
      if (m) {
        var f = R[i][1];
        /* 규칙의 결과는 그대로 씀 (사용자가 쓴 이름 같은 원문이 들어갈 수 있음). 함수 규칙은 tr(낱말)이 null이면 null을 돌려 실패 처리 */
        if (typeof f === "function") { var out = f.apply(null, [function (s) { return look(String(s), (depth || 0) + 1); }].concat(m)); if (out != null) return out; }
        else return c.replace(R[i][0], f);
      }
    }
    if ((depth || 0) > 3) return null;
    var parts = c.split(SEP);
    if (parts.length > 1) {
      var ok = true;
      var res = parts.map(function (p, i) {
        if (i % 2 || !HAN.test(p)) return p;
        var core = p.trim(), t = look(core, (depth || 0) + 1);
        if (t == null) { ok = false; return p; }
        return p.replace(core, t);
      });
      if (ok) return res.join("");
    }
    /* 숫자가 섞인 말: "총장 70" → 숫자 앞뒤 낱말을 따로 번역 */
    var np = c.split(NUM);
    if (np.length > 1) {
      var ok2 = true;
      var res2 = np.map(function (p, i) {
        if (i % 2 || !HAN.test(p)) return p;
        var core = p.trim(), t = look(core, (depth || 0) + 1);
        if (t == null) { ok2 = false; return p; }
        return p.replace(core, t);
      });
      if (ok2) return res2.join("");
    }
    return null;
  }
  /* 영어로 (없으면 원문 그대로, miss에 기록) */
  function t(s) {
    if (s == null) return s;
    s = String(s);
    if (!HAN.test(s)) return s;
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2].replace(/\s+/g, " ");
    var out = look(core, 0);
    if (out == null && /\n/.test(m[2])) out = look(m[2].replace(/[ \t]*\n[ \t]*/g, "\n").replace(/[ \t]+/g, " "), 0);   // 여러 줄 글(케어라벨 미리보기)은 줄을 살려서
    if (out == null) { miss.add(core); return s; }
    return m[1] + out + m[3];
  }
  /* 모드별 결과: ko 원문 / en 영어 / both 한국어 + 줄바꿈 + 영어 (영어가 따로 없거나 원문에 이미 들어 있으면 원문만) */
  function conv(src, mode) {
    if (mode === "en") return t(src);
    if (mode === "both") {
      var m = src.match(/^(\s*)([\s\S]*?)(\s*)$/), en = t(m[2]);
      if (en === m[2] || m[2].indexOf(en) >= 0 || !HAN.test(m[2])) return src;
      return m[1] + m[2] + "\n" + en + m[3];
    }
    return src;
  }
  var cfg = { ui: window.LANG === "en" ? "en" : "ko", sheet: /^(ko|en|both)$/.test(window.SHEET_LANG) ? window.SHEET_LANG : (window.LANG === "en" ? "en" : "ko") };
  var ATTRS = ["placeholder", "title", "aria-label", "alt", "data-ph", "label"];
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };
  function skipEl(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) { if (SKIP[n.nodeName] || n.hasAttribute("data-i18n-skip")) return true; }
    return false;
  }
  function modeOf(el) { return el && el.closest && el.closest("#sheet") ? cfg.sheet : cfg.ui; }
  function typing(node) { var a = document.activeElement; return a && a.isContentEditable && a.contains(node); }
  var recs = new WeakMap(), tracked = new Set();   // 번역한 글자 노드 → { src: 한국어 원문, out: 지금 보이는 글 }
  function text(node) {
    var v = node.nodeValue, rec = recs.get(node);
    var src = rec && v === rec.out ? rec.src : v;   // 지금 값이 우리가 넣은 값이면 원문은 기억해 둔 것, 아니면(새 글·고친 글) 지금 값이 원문
    if (!src || !HAN.test(src)) { if (rec) { recs.delete(node); tracked.delete(node); } return; }
    var p = node.parentNode;
    if (!p || skipEl(p) || typing(node)) return;
    var mode = modeOf(p);
    var out = mode === "ko" ? src : conv(src, mode);
    if (out === src && !rec) return;
    if (p.nodeName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", p.textContent);   // value를 글자로 쓰는 옵션은 원문 유지
    if (out !== v) node.nodeValue = out;
    if (out === src) { recs.delete(node); tracked.delete(node); }
    else { recs.set(node, { src: src, out: out }); tracked.add(node); }
    if (out.indexOf("\n") >= 0) p.classList.add("i18n-nl");   // 한·영 병기 줄바꿈이 보이게
  }
  function attrs(el) {
    var mode = modeOf(el), store = el.__i18na || (el.__i18na = {});
    for (var i = 0; i < ATTRS.length; i++) {
      var n = ATTRS[i], v = el.getAttribute(n);
      if (v == null) continue;
      var rec = store[n], src = rec && v === rec.out ? rec.src : v;
      if (!HAN.test(src)) continue;
      var out = mode === "en" ? t(src) : mode === "both" && n === "data-ph" ? conv(src, "both").replace("\n", " / ") : src;
      if (out !== v) el.setAttribute(n, out);
      if (out === src) delete store[n]; else store[n] = { src: src, out: out };
    }
    if (el.nodeName === "A" && cfg.ui === "en") link(el);
  }
  /* 영어 화면의 사이트 링크 → 영어 페이지 (영어 페이지가 없는 글은 한국어로 둠) */
  var EN_PAGES = { "./": "en/", "index.html": "en/", "guide.html": "en/guide.html", "about.html": "en/about.html", "privacy.html": "en/privacy.html",
    "terms.html": "en/terms.html", "contact.html": "en/contact.html", "contact.html#feedback": "en/contact.html#feedback" };
  function link(a) {
    var h = a.getAttribute("href");
    if (h && Object.prototype.hasOwnProperty.call(EN_PAGES, h) && !a.hasAttribute("data-i18n-keep")) a.setAttribute("href", EN_PAGES[h]);
  }
  var force = false;
  function idle() { return !force && cfg.ui === "ko" && cfg.sheet === "ko" && !tracked.size; }
  function walk(root) {
    if (!root || idle()) return;
    if (root.nodeType === 3) return text(root);
    if (root.nodeType !== 1 || skipEl(root)) return;
    attrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.nodeType === 1 && SKIP[n.nodeName] ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    var n, list = [];
    while ((n = w.nextNode())) list.push(n);
    for (var i = 0; i < list.length; i++) { if (list[i].nodeType === 3) text(list[i]); else if (!list[i].hasAttribute("data-i18n-skip")) attrs(list[i]); }
  }
  function handle(recsIn) {
    if (idle()) return;
    for (var i = 0; i < recsIn.length; i++) {
      var r = recsIn[i];
      if (r.type === "childList") for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      else if (r.type === "characterData") text(r.target);
      else if (r.type === "attributes" && r.target.nodeType === 1 && !skipEl(r.target)) attrs(r.target);
    }
  }
  var mo = new MutationObserver(handle);
  var OBS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(["href"]) };
  mo.observe(document.documentElement, OBS);
  function flush() { handle(mo.takeRecords()); }
  /* 모드를 바꾸고 화면 전체를 원문에서 다시 만듦 */
  function setSheet(mode) { if (!/^(ko|en|both)$/.test(mode)) return; cfg.sheet = mode; window.SHEET_LANG = mode; refresh(); }
  function refresh() {
    mo.takeRecords();
    mo.disconnect();
    Array.from(tracked).forEach(function (n) { if (!n.isConnected) tracked.delete(n); else text(n); });
    if (document.body) { force = true; walk(document.body); force = false; }
    mo.observe(document.documentElement, OBS);
  }
  /* 번역하기 전 한국어 원문 글자 (el.textContent 대신): 저장·검사용 */
  function srcText(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n, s = "";
    while ((n = w.nextNode())) { var r = recs.get(n); s += r && n.nodeValue === r.out ? r.src : n.nodeValue; }
    return s;
  }
  /* 파일로 내보내는 글: 화면 번역과 상관없이 영어로 (SVG·HTML 문자열) */
  function markup(str, type) {
    if (!HAN.test(str)) return str;
    var doc = new DOMParser().parseFromString(str, type);
    if (doc.querySelector("parsererror")) return str;
    var w = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (x) {
      if (x.nodeType === 3) { if (HAN.test(x.nodeValue) && x.parentNode && !skipEl(x.parentNode)) x.nodeValue = t(x.nodeValue); }
      else if (x.nodeType === 1 && !skipEl(x)) ATTRS.forEach(function (a) { var v = x.getAttribute(a); if (v && HAN.test(v)) x.setAttribute(a, t(v)); });
    });
    return (type === "text/html" ? "<!doctype html>\n" : "") + doc.documentElement.outerHTML;
  }
  /* 작업지시서 글(CSV 머리글 등)을 지금 작업지시서 언어로 */
  function sheet(s) { return conv(String(s), cfg.sheet); }
  var _alert = window.alert, _confirm = window.confirm, _prompt = window.prompt;
  window.alert = function (m) { return _alert.call(window, cfg.ui === "en" ? t(m) : m); };
  window.confirm = function (m) { return _confirm.call(window, cfg.ui === "en" ? t(m) : m); };
  window.prompt = function (m, d) { return _prompt.call(window, cfg.ui === "en" ? t(m) : m, d); };
  window.addEventListener("beforeprint", flush);
  function init() { if (cfg.ui === "en") document.title = t(document.title); refresh(); }   // <title>은 관찰을 시작하기 전에 읽혀서 따로 바꿈
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.I18N = { lang: cfg.ui, cfg: cfg, t: t, conv: conv, sheet: sheet, flush: flush, refresh: refresh, setSheet: setSheet, srcText: srcText, markup: markup, miss: miss, walk: walk };
})();
