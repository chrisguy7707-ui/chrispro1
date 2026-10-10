/* 작지 — 광고 자리 채우기
   window.SITE 는 scripts/configure.mjs 가 각 페이지 <head>에 넣습니다 (site.config.json 기준).
   애드센스 게시자 ID와 광고 단위 ID가 둘 다 있을 때만 광고 자리가 보입니다. */
(function () {
  var cfg = window.SITE || {};
  if (!cfg.adClient) return;
  var slots = cfg.adSlots || {};
  document.querySelectorAll(".ad-slot[data-ad-key]").forEach(function (box) {
    var id = slots[box.getAttribute("data-ad-key")];
    if (!id) return;
    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", cfg.adClient);
    ins.setAttribute("data-ad-slot", id);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    box.appendChild(ins);
    box.classList.add("on");
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  });
})();

/* 언어: 고른 언어 기억(jakji_lang), 한국어 페이지에서 브라우저 언어가 한국어가 아니면 영어판 안내 띠 (자동 이동은 하지 않음 — 검색 로봇·해외 거주 한국인 배려) */
(function () {
  function remember(l) { try { localStorage.setItem("jakji_lang", l); } catch (e) {} }
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a[data-lang]"); if (a) remember(a.getAttribute("data-lang")); });
  if ((document.documentElement.lang || "ko").slice(0, 2) !== "ko") return;
  var saved = null; try { saved = localStorage.getItem("jakji_lang"); } catch (e) {}
  if (saved) return;
  var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
  if (langs.some(function (l) { return /^ko\b/i.test(l); })) return;
  var en = document.querySelector('a[data-lang="en"]'); if (!en) return;
  var bar = document.createElement("div");
  bar.className = "lang-bar"; bar.setAttribute("role", "region"); bar.setAttribute("aria-label", "Language"); bar.lang = "en";
  bar.innerHTML = '<span>This page is in Korean.</span><a class="lang-go" data-lang="en" href="">Read it in English →</a><button type="button" class="lang-x" aria-label="Keep Korean">한국어로 볼게요 ×</button>';
  var go = bar.querySelector(".lang-go");
  function setHref() { var h = en.getAttribute("href"); go.setAttribute("href", h.charAt(0) === "?" ? h + location.hash : h); }   // 도구 화면: 공유 링크 내용(#)은 그대로
  setHref(); go.addEventListener("pointerdown", setHref); go.addEventListener("focus", setHref); window.addEventListener("hashchange", setHref);
  if (!document.getElementById("langBarCss")) { var st = document.createElement("style"); st.id = "langBarCss";
    st.textContent = ".lang-bar{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;justify-content:center;padding:10px 16px;background:#ffe14d;color:#17171c;font:600 14px/1.4 Pretendard,system-ui,sans-serif;position:relative;z-index:50}" +
      ".lang-bar a{color:#17171c;font-weight:800}.lang-x{border:1px solid #17171c;background:transparent;color:#17171c;border-radius:999px;padding:4px 12px;font:inherit;font-size:13px;cursor:pointer}@media print{.lang-bar{display:none}}";
    document.head.appendChild(st); }
  bar.querySelector(".lang-x").addEventListener("click", function () { remember("ko"); bar.remove(); });
  function show() { document.body.insertBefore(bar, document.body.firstChild); }
  if (document.body) show(); else document.addEventListener("DOMContentLoaded", show);
})();

/* 화면 모드: 자동(기기 설정 따름) → 밝게 → 어둡게 순서로 바뀌는 버튼. 고른 값은 localStorage jakji_theme("light"·"dark", 자동이면 없음).
   처음 그릴 때의 적용은 각 페이지 <head>의 짧은 스크립트(scripts/configure.mjs)가 함(깜빡임 방지). 버튼은 머리 막대(.topbar) 또는 도구의 .brand 줄 끝에 넣음.
   적용 결과는 <html data-theme="dark">(어두울 때만 속성이 있음), 버튼의 data-mode는 고른 값(auto·light·dark) */
(function () {
  var root = document.documentElement, en = root.lang === "en" || /[?&]lang=en/.test(location.search);
  var NAME = en ? { auto: "Auto (follows your device)", light: "Light", dark: "Dark" } : { auto: "자동 (기기 설정을 따름)", light: "밝게", dark: "어둡게" };
  var NEXT = { auto: "light", light: "dark", dark: "auto" };
  var ICON = '<svg class="i-auto" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 010 17z" fill="currentColor" stroke="none"/></svg>' +
    '<svg class="i-light" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>' +
    '<svg class="i-dark" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 019.8 3.5a8.5 8.5 0 1010.7 10.7z"/></svg>';
  var host = document.querySelector(".topbar") || document.querySelector(".brand");
  if (!host) return;
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  var btn = document.createElement("button");
  btn.type = "button"; btn.className = "theme-btn"; btn.id = "themeBtn"; btn.innerHTML = ICON;
  function mode() { var v = null; try { v = localStorage.getItem("jakji_theme"); } catch (e) {} return v === "dark" || v === "light" ? v : "auto"; }
  function dark(m) { return m === "dark" || (m === "auto" && !!mq && mq.matches); }
  function apply() {
    var m = mode(), d = dark(m);
    if (d) root.setAttribute("data-theme", "dark"); else root.removeAttribute("data-theme");
    btn.setAttribute("data-mode", m);
    var nx = NAME[NEXT[m]].replace(/ \(.*/, "");
    var label = en ? "Display mode: " + NAME[m] + ". Click for \u201c" + nx + "\u201d" : "화면 모드: " + NAME[m] + " · 누르면 \u2018" + nx + "\u2019";
    btn.title = label; btn.setAttribute("aria-label", label);
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute("content", d ? "#0e1014" : "#f6f7f9");
    document.dispatchEvent(new CustomEvent("jakji-theme", { detail: { mode: m, dark: d } }));
  }
  function set(m) { try { if (m === "auto") localStorage.removeItem("jakji_theme"); else localStorage.setItem("jakji_theme", m); } catch (e) {} apply(); }
  btn.addEventListener("click", function () { set(NEXT[mode()]); });
  if (mq) { var onSys = function () { if (mode() === "auto") apply(); }; if (mq.addEventListener) mq.addEventListener("change", onSys); else if (mq.addListener) mq.addListener(onSys); }
  window.addEventListener("storage", function (e) { if (e.key === "jakji_theme") apply(); });
  host.appendChild(btn); apply();
})();
