/* 작지 서비스 워커: 홈 화면에 추가해 쓸 때 인터넷이 없어도 열리게 앱 파일을 기기에 담아 둠.
   - 같은 사이트의 파일만 담음. 사진·작업 내용은 여기에 안 들어감(그건 이 브라우저의 저장 공간에 따로 있음).
   - 인터넷이 되면 항상 새 파일을 받아 오고(그래서 업데이트가 바로 반영됨), 안 될 때만 담아 둔 파일을 보여 줌.
   - 방문 통계용 빈 페이지(e/)와 사진 인식 모델 파일은 건드리지 않음. 파일을 바꾸면 아래 VERSION을 올릴 것 */
const VERSION = "jakji-pwa-v1";
const CORE = ["./", "app.html", "index.html", "manifest.json", "assets/site.css", "assets/site.js", "assets/feedback.js", "assets/pattern.js", "assets/pattern-garments.js",
  "assets/outline.js", "assets/xlsx.js", "assets/i18n.js", "assets/i18n-en.js", "assets/favicon.svg", "assets/icons/icon-192.png", "assets/icons/icon-512.png"];
const FONT_HOST = "cdn.jsdelivr.net";

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.allSettled(CORE.map((u) => c.add(new Request(u, { cache: "reload" }))));   // 하나가 없어도 나머지는 담음
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

const withTimeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); p.then((v) => { clearTimeout(t); res(v); }, (er) => { clearTimeout(t); rej(er); }); });
async function networkFirst(req, fallbackUrl) {
  const c = await caches.open(VERSION);
  try {
    const res = await withTimeout(fetch(req), 4000);
    if (res && res.ok) c.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = (await c.match(req, { ignoreSearch: true })) || (fallbackUrl && (await c.match(fallbackUrl)));
    if (hit) return hit;
    throw err;
  }
}
async function staleWhileRevalidate(req) {
  const c = await caches.open(VERSION), hit = await c.match(req);
  const net = fetch(req).then((res) => { if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (/\/e\/[^/]+\.html$/.test(url.pathname) || /\/(sitemap\.xml|robots\.txt)$/.test(url.pathname)) return;
    if (req.mode === "navigate" || /\.(html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith("/")) e.respondWith(networkFirst(req, req.mode === "navigate" ? "app.html" : null));
    else e.respondWith(staleWhileRevalidate(req));   // 이미지·엑셀 양식 같은 파일
    return;
  }
  if (url.hostname === FONT_HOST && /pretendard/i.test(url.pathname)) e.respondWith(staleWhileRevalidate(req));   // 글꼴만
});
