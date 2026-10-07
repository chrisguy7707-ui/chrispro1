/* 작지 — 비밀 의견 보내기 (운영자만 봄)
   [data-feedback] 자리에 양식을 그립니다. window.SITE.feedbackEndpoint(폼 서비스 주소, 예: Formspree)가 있으면 바로 접수,
   없으면 내용이 채워진 메일(window.SITE.contactEmail)을 엽니다. 사진·작업 내용은 보내지 않습니다.
   도구 화면은 window.JAKJI_CONTEXT()로 지금 품목·탭 같은 짧은 정보를 붙일 수 있습니다. */
(function () {
  var cfg = window.SITE || {};
  var KINDS = ["의견·기능 제안", "오류 제보", "칭찬", "기타"];
  var MAX = 1000;
  function el(tag, attrs, html) { var n = document.createElement(tag); for (var k in attrs || {}) n.setAttribute(k, attrs[k]); if (html != null) n.innerHTML = html; return n; }
  function envInfo() {
    var parts = [navigator.userAgent.replace(/\s*\([^)]*\)\s*/, " ").slice(0, 120), "화면 " + innerWidth + "×" + innerHeight, location.pathname.split("/").pop() || "index.html"];
    try { if (typeof window.JAKJI_CONTEXT === "function") parts.push(String(window.JAKJI_CONTEXT()).slice(0, 200)); } catch (e) {}
    return parts.join(" · ");
  }
  function mount(box, n) {
    var id = "fb" + n;
    box.innerHTML = "";
    box.classList.add("fb");
    var form = el("form", { novalidate: "", "aria-label": "비밀 의견 보내기" });
    form.innerHTML =
      '<p class="fb-lock"><b>🔒 비밀 의견</b> 운영자만 읽습니다. 다른 이용자에게 공개되지 않으며, 옷 사진이나 작업 내용은 보내지 않습니다.</p>' +
      '<label class="fb-f" for="' + id + 'k">종류<select id="' + id + 'k">' + KINDS.map(function (k) { return "<option>" + k + "</option>"; }).join("") + "</select></label>" +
      '<label class="fb-f" for="' + id + 'm"><span>내용 <small>(필수)</small></span><textarea id="' + id + 'm" maxlength="' + MAX + '" rows="5" placeholder="불편한 점, 있었으면 하는 기능, 틀린 치수 등을 자유롭게 적어 주세요." required></textarea><span class="fb-count" id="' + id + 'c">0 / ' + MAX + "</span></label>" +
      '<label class="fb-f" for="' + id + 'e"><span>답장 받을 이메일 <small>(선택 · 답장이 필요할 때만)</small></span><input id="' + id + 'e" type="email" maxlength="120" autocomplete="email" placeholder="you@example.com" /></label>' +
      '<label class="fb-chk"><input type="checkbox" id="' + id + 'v" checked /> <span>오류 확인에 도움이 되는 기기 정보 함께 보내기 <small>(브라우저 종류·화면 크기·보던 화면)</small></span></label>' +
      '<input type="text" name="_gotcha" class="fb-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />' +
      '<div class="fb-row"><button type="submit" class="fb-send">' + (cfg.feedbackEndpoint ? "비밀 의견 보내기" : "메일로 비밀 의견 보내기") + '</button><span class="fb-msg" role="status" id="' + id + 's"></span></div>' +
      '<div class="fb-fallback" id="' + id + 'f" hidden><p>메일 앱이 열리지 않으면 아래 내용을 복사해 <b class="fb-mail"></b>으로 보내 주세요.</p><textarea readonly rows="5"></textarea><button type="button" class="fb-copy">내용 복사</button></div>';
    box.appendChild(form);
    var $ = function (s) { return form.querySelector(s); };
    var msg = $("#" + id + "m"), cnt = $("#" + id + "c"), status = $("#" + id + "s");
    msg.addEventListener("input", function () { cnt.textContent = msg.value.length + " / " + MAX; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = msg.value.trim();
      if (text.length < 5) { status.textContent = "내용을 5자 이상 적어 주세요."; status.className = "fb-msg err"; msg.focus(); return; }
      if ($(".fb-hp").value) return;   // 스팸 봇
      var kind = $("#" + id + "k").value, email = $("#" + id + "e").value.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status.textContent = "이메일 주소 형식을 확인해 주세요."; status.className = "fb-msg err"; return; }
      var env = $("#" + id + "v").checked ? envInfo() : "";
      var send = $(".fb-send");
      if (cfg.feedbackEndpoint) {
        send.disabled = true; status.className = "fb-msg"; status.textContent = "보내는 중…";
        var fd = new FormData(); fd.append("종류", kind); fd.append("내용", text); if (email) { fd.append("email", email); fd.append("_replyto", email); } if (env) fd.append("기기 정보", env); fd.append("_subject", "[작지 비밀 의견] " + kind);
        fetch(cfg.feedbackEndpoint, { method: "POST", body: fd, headers: { Accept: "application/json" } })
          .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); cnt.textContent = "0 / " + MAX; status.textContent = "고맙습니다. 운영자에게 잘 전달했습니다."; })
          .catch(function () { status.className = "fb-msg err"; status.textContent = "보내지 못했습니다. 잠시 뒤 다시 시도하거나 " + (cfg.contactEmail || "문의 페이지의 이메일") + "로 보내 주세요."; })
          .then(function () { send.disabled = false; });
        return;
      }
      var to = cfg.contactEmail || "";
      if (!to) { status.className = "fb-msg err"; status.textContent = "아직 의견 받는 주소가 준비되지 않았습니다."; return; }
      var body = "[종류] " + kind + "\n\n" + text + (email ? "\n\n[답장 받을 이메일] " + email : "") + (env ? "\n\n[기기 정보] " + env : "");
      var fb = $("#" + id + "f");
      fb.hidden = false; fb.querySelector(".fb-mail").textContent = to; fb.querySelector("textarea").value = body;
      status.className = "fb-msg"; status.textContent = "메일 앱을 열었습니다. 보내기를 눌러야 전달됩니다.";
      if (window.JAKJI_NO_MAILTO) return;   // 자동 테스트가 이 컴퓨터의 메일 앱을 열지 않게 하는 스위치
      location.href = "mailto:" + to + "?subject=" + encodeURIComponent("[작지 비밀 의견] " + kind) + "&body=" + encodeURIComponent(body);
    });
    $(".fb-copy").addEventListener("click", function () {
      var ta = $(".fb-fallback textarea"), b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(function () { b.textContent = "복사했습니다 ✓"; }, function () { ta.select(); b.textContent = "선택된 내용을 복사하세요"; });
    });
  }
  var CSS = ".fb form{display:grid;gap:12px}.fb-lock{margin:0;padding:12px 14px;border-radius:14px;background:#fff6c7;color:#17171c;font-size:14px;line-height:1.6}" +
    ".fb-f{display:grid;gap:5px;font-size:14px;font-weight:600;color:inherit}.fb-f small,.fb-chk small{font-weight:400;opacity:.65}" +
    ".fb-f select,.fb-f input,.fb-f textarea,.fb-fallback textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #e3ddd1;border-radius:12px;font:inherit;font-size:15px;font-weight:400;background:#fff;color:#17171c}" +
    ".fb-f textarea{resize:vertical;min-height:110px}.fb-count{justify-self:end;font-size:12px;font-weight:400;opacity:.6}" +
    ".fb-chk{display:flex;gap:8px;align-items:flex-start;font-size:13.5px}.fb-chk input{margin-top:3px;width:17px;height:17px}" +
    ".fb-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}" +
    ".fb-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.fb-send,.fb-copy{border:0;border-radius:999px;padding:12px 20px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;background:#17171c;color:#fff}" +
    ".fb-send:disabled{opacity:.5}.fb-copy{background:#fff;color:#17171c;border:1px solid #17171c;padding:8px 14px;font-size:13.5px}" +
    ".fb-msg{font-size:14px}.fb-msg.err{color:#e5482a;font-weight:600}.fb-fallback{display:grid;gap:8px;font-size:13.5px}.fb-fallback[hidden]{display:none}.fb-fallback p{margin:0}";
  function addCss() { if (document.getElementById("fbCss")) return; var st = document.createElement("style"); st.id = "fbCss"; st.textContent = CSS; document.head.appendChild(st); }
  function init() { addCss(); document.querySelectorAll("[data-feedback]").forEach(mount); }
  window.JakjiFeedback = { mount: function (box) { addCss(); mount(box, Date.now() % 100000); } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
