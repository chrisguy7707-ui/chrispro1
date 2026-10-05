# 옷만들기 도면 메이커 — Claude Code 작업 안내

옷 사진 1장 + 사이즈 선택(남 80~110 / 여 44~88) → 한국형 작업지시서(도식화 앞·뒤, 치수표, 원단·부자재, 봉제 사양)를 만드는 웹앱.

## 사이트 구조 (v0.3, 빌드 도구 없음)
- `index.html` 대문(소개·사용 순서·기능·FAQ, JSON-LD WebApplication+FAQPage), `guide.html` 작성법(애드센스 승인용 본문 콘텐츠),
  `about`·`contact`·`privacy`·`terms`·`404.html`. 공통 스타일 `assets/site.css`, 광고 자리 채우기 `assets/site.js`.
- `site.config.json` → `npm run configure`(scripts/configure.mjs)가 각 페이지의 `<!-- SITE:HEAD -->` 블록(canonical, og, 검색 인증, 애드센스 코드),
  `<!-- SITE:CONTACT -->`, `sitemap.xml`, `robots.txt`, `ads.txt`를 다시 만듦. 이 블록과 생성 파일은 손으로 고치지 말 것.
- 광고 자리: `<aside class="ad-slot" data-ad-key="...">`. `adSlots`에 ID가 있을 때만 보이고, 인쇄에서는 항상 숨김.
- 새 페이지를 추가하면 configure.mjs의 `PAGES`, tests/site.mjs의 `PAGES`, 바닥 링크에 함께 추가.
- `assets/preview.png`·`og.png`는 `npm run images`로 생성 (도구 화면이 바뀌면 다시 생성).

## 도구 구조 (`app.html` 한 파일에 HTML/CSS/JS)
- 분석 엔진 3단 구조 (`analyze()`):
  1. claude.ai 아티팩트로 열렸을 때: `window.claude.use("sample")` → Claude가 사진 분석 (키 불필요)
  2. 그 외(직접 호스팅): Gemini API 키 입력 → `generateContent` + `responseMimeType: application/json`
  3. 키 없음(공개 사이트 기본): **기기 안 인식** `analyzeLocal()`/`applyLocal()`. 사진 올리면 자동 실행.
     - transformers.js 4.3.0(jsDelivr) + `Xenova/mobileclip_s0` 사진 모델 **fp16**(23MB). q8 양자화 모델은 출력이 망가지므로 쓰지 말 것.
     - 글자 쪽은 `scripts/build-clip-labels.mjs`로 미리 임베딩해 `assets/clip-labels.json`(그룹별 후보: template·fit·neck·closure·rib·shape·주머니·color).
       후보 문장을 바꾸면 `npm run clip-labels`. 품목 top-1 적용 + 후보 3개 버튼, 디테일은 `LOCAL_ALLOWED`와 확률 기준을 넘을 때만 적용.
     - 사진·실측 사진 50장 시험에서 단일 의류 사진 약 90% 품목 일치. 소재·봉제 사양은 추정하지 않음(기본값).
     - 수동 모드 보조: `FABRICS` 원단 프리셋(품목별 추천 그룹) → 원단·혼용률·중량 칸 채움, 컬러·품명 입력칸. AI가 없으면 `manualHint` 안내 표시.
- AI는 **디테일(품목·넥라인·여밈·주머니·소재·봉제사양)만** 판단. 치수는 AI가 추정하지 않음.
- 치수는 `T`(품목별 기준값·편차) × `FIT`(핏 보정) × 선택 사이즈로 계산 (`specValues()`).
  - 남 기준 100, 여 기준 66. 값은 **레귤러핏 참고치**이며 실측 대체 불가 (UI에 명시).
- 하의(pants·shorts·skirt) 사이즈 표기: `INCH`(호칭→허리 인치) + `state.label`(num / both / inch), `sizeLabel()`로 칩·치수표 머리·사이즈 칸에 공통 적용.
  - 남 80~110 → 28·29·30·31·32·34·36, 여 44~88 → 24·26·28·30·32. `T` 허리단면×2÷2.54와 ±1인치 안에서 맞춘 참고값.
- 도식화는 SVG 파라메트릭 드로잉: `drawTop`, `drawPants`, `drawSkirt`, `buildSVG`.
  - 치수 기호(A, B, C…)를 빨간 점선으로 도식화에 표시 → 치수표 기호 열과 연결.
- 출력: `window.print()`(A4 가로 1장, `@media print`에서 zoom .93), HTML 파일 저장, SVG 저장.

## 패턴 제도 (`assets/pattern.js`, app.html의 '패턴 제도' 탭)
- `Pattern.TYPES`에 품목별 { name, fields, presets, draft }.
  - `ws_<템플릿>` 10종(파우치 포함)(`assets/pattern-garments.js`): 작업지시서 치수표 **기준 사이즈 열(화면에서 고친 값 포함)** → `fromSpec`으로 칸을 채워 완성 치수 기반 제도.
    상의 원형 `bodice()`(진동 깊이 = 가슴단면 × 0.48, 어깨 경사 4.5/오버핏 3) + `sleevePiece()`(소매산 높이를 진동둘레+여유에 이분 탐색으로 맞춤).
    셔츠 요크·칼라·칼라밴드·커프스, 후드·캥거루, 자켓 스탠드 칼라, 원피스 몸판 다트+치마, 바지 밑위 연장(허벅지×2−엉덩이를 3:7).
  - 따로 제도: `skirt_h`(H라인 스커트, 칠판 제도식, 신체 치수), `pouch`(사각 마치 지퍼 파우치).
  - 작업지시서 디테일(state.opt: 핏·넥라인·여밈·시보리·주머니·모양)은 `Pattern.draft(type, vals, opts)`로 전달.
- 조각 = 완성선 다각형(cm, 시계 방향) + `edges`(변마다 시접, 골선 0). 재단선은 `offset()`이 변별 거리로 계산.
- 인쇄: `preparePrint()`가 탭에 따라 `body.print-pattern` 전환. 축소도 1장(@page pat 세로, 50mm 확인 네모) + 실물 크기 분할(세로/가로 중 장수 적은 쪽, 겹침 1cm) 또는 `patPrintMode=one`이면 패턴 크기 그대로 한 장(@page patBig).
  `measureOnly` 조각(허리밴드·웨빙 같은 직사각형)은 분할 인쇄에서 뺌.
- 제도 값 바꾸면 tests/verify.mjs의 칠판 기준값(S: 옆선 2.6·다트 2·다트 길이 12.5·11.5/10.5·9.5) 확인.

## 저장 · 화면 · 인쇄
- 작업 저장/열기: `snapshot()` ↔ `restore()` (JSON, v1). 복원은 글자만 넣음(textContent·esc) — HTML을 받지 않음. 자동 저장 `wo_autosave`(localStorage, 넘치면 사진 빼고).
- 휴대폰: 화면에서만 `.sheet { zoom: var(--fit) }` (`fitScreen()`), `fitPrint()`는 이 배율을 되돌려 잼.
- 인쇄: 이름 붙은 @page를 쓰지 않음(사파리 호환). `preparePrint()`가 `#pageStyle`에 @page 하나만 씀 — 작업지시서 A4 가로, 패턴 A4 세로 분할 또는 대형 한 장(표지 없음).
- 사진 인식 모델은 Hugging Face 커밋 `LOCAL.revision`에 고정, 처음엔 사용자가 버튼을 눌러야 받음(`modelReady()`), 확신도는 `confLabel()` 높음·보통·낮음.
- 패턴 탭은 **베타** 표시(가봉 검증 전). 실물 검증 결과가 나오면 공식과 표시를 함께 고칠 것.

## 외곽선 분석 (시험, `assets/outline.js`, '외곽선' 탭)
- AI 없음. 테두리 색 = 배경 → 테두리와 이어진 비슷한 색을 걷어 냄(옷 안 흰 프린트는 남음) → 열기 연산 → 가장 큰 덩어리 → 무어 추적 + 더글러스-포이커.
- 배경 얼룩 = 테두리 거리의 70% 지점 (옷이 테두리에 닿아도 버티게). 민감도 슬라이더로 임계값 조정.
- 모양 판단은 **참고용**: 다리 두 갈래(비슷한 폭 2구간, 가운데 비어 있음)·네모(채움 80%+)만 믿을 만함. 품목 판단은 사진 인식이 담당.
- 치수: 줄별 구간(run)으로 픽셀 측정 → 사진 위 기준선(두 점 + 실제 cm)으로 환산 → 고른 항목만 치수표 기준 열에 넣고 다른 사이즈는 같은 차이만큼 이동.
- 합성 사진(앱 도식화를 회색 바닥에) 기준 오차 3.5% 이내를 검사로 유지. 실제 사진 한계: 입은 사진·복잡한 배경·여러 개 겹침·흰 옷+흰 배경.

## Gemini 키 받기 탭 ('🔑 Gemini 키 받기', 강조)
- `checkGeminiKey()`: `GET v1beta/models`(헤더 x-goog-api-key)로 키 확인 → `gKey`·localStorage 저장. 기본 모델 `GEMINI_DEFAULT`가 목록에 없으면 lite·image 등을 뺀 Flash(정식 우선)로 바꿈.
- 키 모양 검사는 공백 없는 20자 이상만 봄: 2026년부터 AI Studio는 **`AQ.`로 시작하는 인증 키**만 발급(예전 `AIza`도 허용). 점(.)을 막으면 새 키가 전부 막힘.
- 401 `ACCESS_TOKEN_TYPE_UNSUPPORTED`: 일부 계정에서 AQ. 키가 Google 쪽 문제로 거부되는 사례(공식 포럼 다수 보고, 헤더·?key=·Bearer 모두 실패) → 원인과 대안(새 프로젝트로 재발급, 기기 안 인식) 안내.
- 키는 작업 저장 파일(snapshot)에 넣지 않음. 안내 문구의 사실(자동 프로젝트·키 생성, 무료 등급 데이터 사용)은 ai.google.dev 공식 문서 기준 — 바뀌면 함께 고칠 것.

## 규칙
- 한국어 UI, 공장 용어(시보리, 오버록, 2본침, 커버스티치, 요척 등) 유지.
- 기준 치수 데이터(`T`)를 바꾸면 반드시 10개 품목 × 남/여 모두 렌더링 확인.
- 잡화(`kind: "bag"`, 지금은 `pouch`)는 성별 호칭 대신 `BAG_SIZES` S·M·L(기준 M), 치수는 완성 치수. `sizeList()`·`ensureSizeSystem()`·`renderKindControls()` 참고.
- 인쇄 시 A4 가로 **1장**을 넘기지 않을 것. `fitPrint()`가 내용 높이에 맞춰 `--print-zoom`(기본 .93, `PRINT_H` 705px 기준)을 자동으로 줄임.
- 변경 후 `npm run serve` + `npm test` 통과 확인: tests/verify.mjs(도구 58개, Gemini 키 확인(가짜 응답) 포함, 외곽선 합성 사진 정확도·기준선·치수표 반영 포함, 저장·열기·자동 저장·휴대폰·베타 포함, 10품목×남녀×3핏 패턴 60개, 인식·외부 전송 0건·SVG 전 조합·패턴 제도·실물 크기 인쇄 포함), tests/site.mjs(사이트 22개: SEO 태그·링크·모바일·광고 설정).
- 안내 글은 사실과 앱 동작이 맞아야 함 (치수표·인치 대응표·품목 수를 바꾸면 guide·about·index 문구도 수정).
- 사용자 사진은 서버로 보내지 않음(분석 API 호출 제외). 저장 기능 추가 시 동의 문구 필수.
- 타인 디자인 복제 용도 금지 문구 유지 (부정경쟁방지법상 형태 모방 위험).

## 다음 작업 후보 (우선순위 순)
1. 기준 치수표 검증: 실제 브랜드 실측표 10건 이상과 비교해 `T` 값 보정, 품목별 "슬림/레귤러/오버" 기준값 분리.
2. ~~하의 호칭 병기~~ (v0.2 완료). 남 110을 38인치까지 늘리려면 `T` 허리 편차 보정(1번)과 함께 조정.
3. 도식화 품질: 칼라 종류(카라/스탠드/테일러드), 소매 종류(래글런/드롭), 프린트·자수 위치 표시.
4. 도식화 편집: SVG 위 클릭으로 메모·화살표 추가, 앞/뒤 디테일 확대 뷰.
5. 작업지시서 여러 장 관리: Firebase(Firestore + Storage)로 스타일별 저장·목록·복제.
6. 내보내기: PDF 직접 생성(jsPDF 또는 서버 렌더), 엑셀 치수표(xlsx).
7. 수익화 실험: 무료 월 3건 → 건당 과금, 공장 공유 링크.

## 로컬 실행
```bash
npm run serve      # http://localhost:8766
npx serve .        # 또는 python3 -m http.server 8000
# 브라우저에서 http://localhost:3000 (또는 :8000) 열기
```
