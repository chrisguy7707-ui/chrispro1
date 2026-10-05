/* 기기 안 사진 인식용 글자 임베딩 생성 → assets/clip-labels.json
   MobileCLIP 글자 모델(43MB)은 여기서 한 번만 돌리고, 방문자는 사진 모델(12MB)만 받습니다.
   실행: npm run clip-labels  (프롬프트를 바꿨을 때만)
   그룹마다 후보(class)별 영어 문장 여러 개 × 문장 틀(TEMPLATES) 임베딩을 평균내 저장합니다. */
import { AutoTokenizer, CLIPTextModelWithProjection } from "@huggingface/transformers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MODEL = "Xenova/mobileclip_s0";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TEMPLATES = ["a photo of {}.", "a product photo of {}.", "a flat lay photo of {}.", "a fashion flat sketch of {}."];

/* 앱의 선택값(value)과 같은 키를 씀 */
export const GROUPS = {
  template: {
    top_short: ["a short sleeve t-shirt", "a short-sleeved tee", "a plain crew neck t-shirt with short sleeves"],
    top_long: ["a long sleeve t-shirt", "a crewneck sweatshirt", "a long-sleeved pullover top"],
    shirt: ["a button-up collared shirt", "a button-down dress shirt", "a long sleeve shirt with a collar and buttons"],
    hoodie: ["a hoodie", "a hooded sweatshirt", "a pullover hoodie with a hood"],
    jacket: ["a jacket", "a zip-up jacket", "a bomber jacket", "a coat"],
    pants: ["a pair of long pants", "a pair of jeans", "trousers"],
    shorts: ["a pair of shorts", "short pants above the knee", "denim shorts"],
    skirt: ["a skirt", "a mini skirt", "a midi skirt"],
    dress: ["a dress", "a one-piece dress", "a sleeveless summer dress"],
    pouch: ["a small zippered pouch", "a cosmetic pouch with a zipper", "a mini pouch bag with a key ring clip"],
  },
  fit: {
    regular: ["a regular fit top", "a standard fit garment"],
    oversize: ["an oversized baggy top", "a loose oversized fit garment with dropped shoulders"],
    slim: ["a slim fit tight top", "a body-hugging slim garment"],
  },
  neck: {
    crew: ["a top with a round crew neckline"],
    v: ["a top with a v-neck"],
    collar: ["a top with a shirt collar"],
    hood: ["a top with a hood"],
    mock: ["a top with a turtleneck", "a mock neck top"],
  },
  closure: {
    none: ["a pullover top with no buttons or zipper"],
    buttons: ["a garment with a button front"],
    zip: ["a garment with a full-length front zipper"],
    half_zip: ["a half-zip pullover", "a quarter zip top"],
  },
  rib: {
    plain: ["a top with plain hemmed sleeves and hem"],
    rib: ["a top with ribbed knit cuffs and ribbed waistband"],
  },
  shape: {
    a: ["an A-line flared skirt"],
    h: ["a straight pencil skirt"],
    pleat: ["a pleated skirt"],
  },
  kangaroo: { yes: ["a hoodie with a front kangaroo pocket"], no: ["a top without a front pocket"] },
  chest: { yes: ["a shirt with a chest pocket"], no: ["a shirt without a chest pocket"] },
  patch: { yes: ["a jacket with large flap pockets on the front"], no: ["a jacket without front pockets"] },
  color: {
    블랙: ["black clothing"], 화이트: ["white clothing"], 그레이: ["gray clothing", "heather gray clothing"], 네이비: ["navy blue clothing"],
    블루: ["blue clothing"], 스카이블루: ["light sky blue clothing"], 데님: ["denim blue clothing"], 베이지: ["beige clothing"],
    아이보리: ["ivory cream clothing"], 브라운: ["brown clothing"], 카키: ["khaki clothing"], 올리브: ["olive green clothing"],
    그린: ["green clothing"], 레드: ["red clothing"], 버건디: ["burgundy clothing"], 핑크: ["pink clothing"],
    옐로우: ["yellow clothing"], 오렌지: ["orange clothing"], 퍼플: ["purple clothing"],
  },
};

const round = (v) => Math.round(v * 10000) / 10000;

export async function embedTexts(texts) {
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL);
  const model = await CLIPTextModelWithProjection.from_pretrained(MODEL, { dtype: "fp32" });
  const inputs = tokenizer(texts, { padding: "max_length", truncation: true });
  const { text_embeds } = await model(inputs);
  return text_embeds.normalize(2, -1).tolist();
}

async function main() {
  const jobs = [];
  for (const [g, classes] of Object.entries(GROUPS)) for (const [c, phrases] of Object.entries(classes)) for (const p of phrases) for (const t of TEMPLATES) jobs.push({ g, c, text: t.replace("{}", p) });
  const embs = await embedTexts(jobs.map((j) => j.text));
  const sum = {};
  jobs.forEach((j, i) => {
    const k = `${j.g}\t${j.c}`;
    sum[k] = sum[k] ? sum[k].map((v, d) => v + embs[i][d]) : [...embs[i]];
  });
  const out = { model: MODEL, dim: embs[0].length, groups: {} };
  for (const [k, v] of Object.entries(sum)) {
    const [g, c] = k.split("\t");
    const n = Math.hypot(...v);
    (out.groups[g] ||= {})[c] = v.map((x) => round(x / n));
  }
  fs.writeFileSync(path.join(root, "assets/clip-labels.json"), JSON.stringify(out));
  console.log(`${jobs.length}개 문장 → ${Object.keys(sum).length}개 후보, ${out.dim}차원`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
