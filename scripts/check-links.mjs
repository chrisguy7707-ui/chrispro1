/* 사이트 안의 외부 링크가 아직 열리는지 확인 (가끔 직접 실행: npm run check-links)
   200·3xx는 정상, 403·429는 봇 차단일 수 있어 '확인 필요', 그 밖(연결 실패·404 등)은 죽은 링크 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [...fs.readdirSync(root), ...fs.readdirSync(path.join(root, "en")).map((f) => "en/" + f)].filter((f) => f.endsWith(".html"));
const urls = new Map();
for (const f of files) for (const m of fs.readFileSync(path.join(root, f), "utf8").matchAll(/href="(https?:\/\/[^"]+)"/g)) {
  const u = m[1]; if (/jakji\.app|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(u)) continue; (urls.get(u) || urls.set(u, []).get(u)).push(f);
}
let bad = 0;
for (const [u, where] of urls) {
  let code = 0; try { const r = await fetch(u, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": "Mozilla/5.0" } }); code = r.status; } catch (e) { code = 0; }
  const tag = code >= 200 && code < 400 ? "OK  " : code === 403 || code === 429 ? "확인" : "죽음";
  if (tag === "죽음") bad++;
  console.log(`${tag} ${code || "연결실패"} ${u}  ← ${[...new Set(where)].slice(0, 3).join(", ")}`);
}
console.log(bad ? `\n죽은 링크 ${bad}개` : `\n죽은 링크 없음 (${urls.size}개 확인)`);
process.exit(bad ? 1 : 0);
