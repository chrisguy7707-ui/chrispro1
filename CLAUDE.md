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
  3. 키 없음: 4단계 선택상자로 수동 지정 (AI 없이도 작업지시서 생성 가능)
     - 수동 모드 보조: `FABRICS` 원단 프리셋(품목별 추천 그룹) → 원단·혼용률·중량 칸 채움, 컬러·품명 입력칸. AI가 없으면 `manualHint` 안내 표시.
- AI는 **디테일(품목·넥라인·여밈·주머니·소재·봉제사양)만** 판단. 치수는 AI가 추정하지 않음.
- 치수는 `T`(품목별 기준값·편차) × `FIT`(핏 보정) × 선택 사이즈로 계산 (`specValues()`).
  - 남 기준 100, 여 기준 66. 값은 **레귤러핏 참고치**이며 실측 대체 불가 (UI에 명시).
- 하의(pants·shorts·skirt) 사이즈 표기: `INCH`(호칭→허리 인치) + `state.label`(num / both / inch), `sizeLabel()`로 칩·치수표 머리·사이즈 칸에 공통 적용.
  - 남 80~110 → 28·29·30·31·32·34·36, 여 44~88 → 24·26·28·30·32. `T` 허리단면×2÷2.54와 ±1인치 안에서 맞춘 참고값.
- 도식화는 SVG 파라메트릭 드로잉: `drawTop`, `drawPants`, `drawSkirt`, `buildSVG`.
  - 치수 기호(A, B, C…)를 빨간 점선으로 도식화에 표시 → 치수표 기호 열과 연결.
- 출력: `window.print()`(A4 가로 1장, `@media print`에서 zoom .93), HTML 파일 저장, SVG 저장.

## 규칙
- 한국어 UI, 공장 용어(시보리, 오버록, 2본침, 커버스티치, 요척 등) 유지.
- 기준 치수 데이터(`T`)를 바꾸면 반드시 9개 품목 × 남/여 모두 렌더링 확인.
- 인쇄 시 A4 가로 **1장**을 넘기지 않을 것. `fitPrint()`가 내용 높이에 맞춰 `--print-zoom`(기본 .93, `PRINT_H` 705px 기준)을 자동으로 줄임.
- 변경 후 `npm run serve` + `npm test` 통과 확인: tests/verify.mjs(도구 23개), tests/site.mjs(사이트 22개: SEO 태그·링크·모바일·광고 설정).
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
