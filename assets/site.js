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
