/* 작지 — 도구 화면(app.html) 번역 엔진. 영어 모드(?lang=en 또는 저장된 선택)에서만 불러옴.
   한국어 원문을 그대로 두고, 화면에 들어오는 글자(텍스트 노드·placeholder·title·aria-label·SVG 글자)를
   사전(window.I18N_DICT: 정확히 같은 문장 → 번역, I18N_RULES: 숫자 등이 섞인 문장 정규식)으로 바꿉니다.
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
  var ATTRS = ["placeholder", "title", "aria-label", "alt", "data-ph", "label"];
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };
  function skipEl(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) { if (SKIP[n.nodeName] || n.hasAttribute("data-i18n-skip")) return true; }
    return false;
  }
  function typing(node) {
    var a = document.activeElement;
    return a && a.isContentEditable && a.contains(node);
  }
  function text(node) {
    var v = node.nodeValue;
    if (!v || !HAN.test(v)) return;
    var p = node.parentNode;
    if (!p || skipEl(p) || typing(node)) return;
    var out = t(v);
    if (out === v) return;
    if (p.nodeName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", p.textContent);   // value를 글자로 쓰는 옵션은 원문 유지
    node.nodeValue = out;
  }
  function attrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (v && HAN.test(v)) { var o = t(v); if (o !== v) el.setAttribute(ATTRS[i], o); }
    }
    if (el.nodeName === "A") link(el);
  }
  /* 도구 화면의 사이트 링크 → 영어 페이지 (영어 페이지가 없는 글은 한국어로 둠) */
  var EN_PAGES = { "./": "en/", "index.html": "en/", "guide.html": "en/guide.html", "about.html": "en/about.html", "privacy.html": "en/privacy.html",
    "terms.html": "en/terms.html", "contact.html": "en/contact.html", "contact.html#feedback": "en/contact.html#feedback" };
  function link(a) {
    var h = a.getAttribute("href");
    if (h && Object.prototype.hasOwnProperty.call(EN_PAGES, h) && !a.hasAttribute("data-i18n-keep")) a.setAttribute("href", EN_PAGES[h]);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return text(root);
    if (root.nodeType !== 1 || skipEl(root)) return;
    attrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.nodeType === 1 && SKIP[n.nodeName] ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    var n, list = [];
    while ((n = w.nextNode())) list.push(n);
    for (var i = 0; i < list.length; i++) { if (list[i].nodeType === 3) text(list[i]); else if (!list[i].hasAttribute("data-i18n-skip")) attrs(list[i]); }
  }
  function handle(recs) {
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i];
      if (r.type === "childList") for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      else if (r.type === "characterData") text(r.target);
      else if (r.type === "attributes" && r.target.nodeType === 1 && !skipEl(r.target)) attrs(r.target);
    }
  }
  var mo = new MutationObserver(handle);
  mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(["href"]) });
  function flush() { handle(mo.takeRecords()); }
  /* 화면 밖으로 나가는 글자: SVG·HTML 파일 저장용 */
  function markup(str, type) {
    if (!HAN.test(str)) return str;
    var doc = new DOMParser().parseFromString(str, type);
    if (doc.querySelector("parsererror")) return str;
    walk(doc.documentElement);
    return (type === "text/html" ? "<!doctype html>\n" : "") + doc.documentElement.outerHTML;
  }
  var _alert = window.alert, _confirm = window.confirm, _prompt = window.prompt;
  window.alert = function (m) { return _alert.call(window, t(m)); };
  window.confirm = function (m) { return _confirm.call(window, t(m)); };
  window.prompt = function (m, d) { return _prompt.call(window, t(m), d); };
  document.title = t(document.title);   // <title>은 관찰을 시작하기 전에 읽혀서 따로 바꿈
  window.addEventListener("beforeprint", flush);
  document.addEventListener("DOMContentLoaded", flush);
  window.I18N = { lang: "en", t: t, flush: flush, markup: markup, miss: miss, walk: walk };
})();
