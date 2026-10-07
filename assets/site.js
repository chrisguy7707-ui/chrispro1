/* 마름 — 광고 자리 채우기
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
