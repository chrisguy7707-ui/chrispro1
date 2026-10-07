# 작지 (옷 작업지시서 메이커) — Claude Code 작업 안내

사이트 이름은 **작지**(2026-10-07 확정, 옛 이름 '옷만들기 도면 메이커'·'마름'). 작지 = 현장에서 작업지시서를 줄여 부르는 말, 유래는 about.html#name.
도메인 후보 jakji.app·jakji.kr(2026-10 DNS 기록 없음). '작지'는 업계 일반 용어라 글자만으로는 상표 식별력이 약함 → 출원 시 로고(도형) 결합 검토.
작업 파일 `JOB.app`은 "작지", 옛 파일(`JOB_OLD`)도 열림. 페이지 제목 형식: `페이지 – 작지 · 옷 작업지시서 메이커`.

옷 사진 1장 + 사이즈 선택(남 80~110 / 여 44~88) → 한국형 작업지시서(도식화 앞·뒤, 치수표, 원단·부자재, 봉제 사양)를 만드는 웹앱.

## 사이트 구조 (v0.3, 빌드 도구 없음)
- `index.html` 대문(소개·사용 순서·기능·FAQ, JSON-LD WebApplication+FAQPage), `guide.html` 작성법(애드센스 승인용 본문 콘텐츠), `factory.html` 공장 찾기 안내,
  `about`·`contact`·`privacy`·`terms`·`404.html`. 공통 스타일 `assets/site.css`, 광고 자리 채우기 `assets/site.js`.
- `site.config.json` → `npm run configure`(scripts/configure.mjs)가 각 페이지의 `<!-- SITE:HEAD -->` 블록(canonical, og, 검색 인증, 애드센스 코드),
  `<!-- SITE:CONTACT -->`, `sitemap.xml`, `robots.txt`, `ads.txt`를 다시 만듦. 이 블록과 생성 파일은 손으로 고치지 말 것.
- 광고 자리: `<aside class="ad-slot" data-ad-key="...">`. `adSlots`에 ID가 있을 때만 보이고, 인쇄에서는 항상 숨김.
- **광고는 도구 화면(app.html)에 두지 않음**(상호작용 화면 옆 광고·게시자 콘텐츠 부족으로 보일 위험). 모든 페이지(도구 포함)에서 개인정보처리방침·이용약관·문의 링크가 보여야 하며 tests/site.mjs가 검사. 도구 화면 하단은 `.app-foot`(인쇄 숨김).
- 새 페이지를 추가하면 configure.mjs의 `PAGES`, tests/site.mjs의 `PAGES`, 바닥 링크에 함께 추가.
- `assets/preview.png`·`preview.webp`(대문용)·`og.png`는 `npm run images`로 생성 (도구 화면이 바뀌면 다시 생성).
- 디자인(2026-10 개편): 크림 바탕 `#fbf8f2` + 먹색 `#17171c` + 레몬 `#ffe14d`·코랄 `#ff6b4a`·민트 `#3dd6ae`·라일락 `#b8a6ff`, 글꼴 Pretendard(jsDelivr), 둥근 카드·알약 버튼.
  예전 변수 이름(`--mat`=먹색, `--tape`=레몬)은 호환용으로 남김. A4 작업지시서(`.sheet`) 본문은 서류라 색을 바꾸지 않음.

## 도구 구조 (`app.html` 한 파일에 HTML/CSS/JS)
- 분석 엔진 3단 구조 (`analyze()`):
  1. claude.ai 아티팩트로 열렸을 때: `window.claude.use("sample")` → Claude가 사진 분석 (키 불필요)
  2. (Google Gemini 경로는 2026-10-07에 제거. 다시 넣을지 검토 중 — 넣는다면 git 기록의 `analyzeWithGemini`·키 받기 탭 참고. 무료 등급 불안정·AQ. 키 문제 주의)
  3. 키 없음(공개 사이트 기본): **기기 안 인식** `analyzeLocal()`/`applyLocal()`. 모델을 받은 뒤에는 사진 올리면 자동 실행.
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
  - **상의·원피스·바지·반바지는 치수표 기준 사이즈 열의 비율로 그림** (`baseVals()`: 화면 치수표가 지금 품목 것이면 고친 값 포함, 아니면 `specValues()` 계산값 — `specTable.dataset.key`로 확인).
    배율 k = 상의 min(185/총장, 76/(가슴단면/2), 2.9), 바지 min(282/총장, 140/엉덩이단면). 치수 칸을 고치면 0.25초 뒤 도식화 다시 그림.
  - 치수가 아닌 디테일 선택: 상의 `sleeve`(set·drop·raglan)·`hem`(straight·curved), 바지 `waist`(fixed·elastic)·`fpocket`(slant·scoop)·`bpocket`(patch·welt)·`cargo`·`pleat`.
    `renderKindControls()`가 품목별로 보이는 선택을 정함. 패턴에는 `Pattern.OPT_KEYS`만 넘김(도식화 `hem`이 패턴 밑단 둘레 `hem`과 겹치지 않게).
  - AI(claude.ai 안의 Claude)는 위 디테일 + `ratios`(상의: 총장÷가슴·소매÷총장·밑단÷가슴, 바지: 밑단÷허벅지·밑위÷총장)를 줌. 비율은 `showRatioHints()`로 **제안만** 보이고, 사용자가 눌러야 `setBaseValue()`로 치수표 반영.
  - 기기 안 인식(CLIP)은 새 디테일을 아직 판단하지 않음 (직접 선택 또는 claude.ai 안의 Claude).
  - 치수 기호(A, B, C…)를 빨간 점선으로 도식화에 표시 → 치수표 기호 열과 연결.
- 출력: `window.print()`(A4 가로 1장, `@media print`에서 zoom .93), HTML 파일 저장, SVG 저장.

## 기준 치수 검증 (2026-10-07)
- 공개 실측표 11건(무신사 스탠다드 9: 베이식 크루넥 남·여, 레귤러 스웨트, 베이식 옥스포드 셔츠, 후디드 스웨트(래글런, 일부), 스트레이트 데님, 와이드 치노 쇼츠, 우먼즈 와이드 슬랙스, 우먼즈 데님 미디 스커트 / 스파오 레귤러핏 반팔티 / 블루종·폴로 원피스는 핏이 달라 참고만)과 남 L(100)·여 M(66) 비교.
- ±1cm 넘게 차이 나던 값만 고침: 반팔 총장 72→70·소매 21→23.5(남), 가슴·밑단 47→48.5(여) / 긴팔 총장 70·가슴 57·소매 63 / 셔츠 가슴 57·밑단 56 / 바지 엉덩이 51·47, 허벅지 31·29.5, 밑단 20.5·20, 여 밑위 27.5 / 스커트 여 허리 35.5(28인치와 맞춤)·엉덩이 48.
- **2차 보정(스파오 5건 추가, 같은 날)**: 스파오 레귤러핏 반팔티·링클프리 드레스 셔츠(L: 총장 77·어깨 47·가슴둘레 110·소매 63)·퍼 플리스 집업·씬라이트 후드 재킷 L(총장 67·어깨 50·가슴 118·소매 63)·와이드 진(둘레 표기라 참고만). 셔츠 가슴단면은 스파오 55·무신사 57의 중간 56으로 되돌림. 자켓·점퍼는 블루종류 두 브랜드가 총장 65~67이라 총장 74→69, 어깨 48→50, 소매 64→62.5(여 총장 61·어깨 40·소매 57.5).
- 그대로 둔 것: 후드(차이 1cm 안), 반바지(일치), 자켓·원피스(레귤러 표본 부족). 한 브랜드 비중이 커서 다음 보정 때 유니클로·탑텐·에잇세컨즈 등으로 넓힐 것.
- 후드 총장을 70으로 바꾸면 기기 안 인식 검사(도식화→후드)가 자켓으로 흔들림, 바지 밑단 21이면 외곽선 합성 검사 4.1% → 지금 값 유지.

## 도메인 (2026-10-07 적용)
- **jakji.app** (Cloudflare Registrar). DNS: A 185.199.108~111.153 4개 + www CNAME chrisguy7707-ui.github.io, 모두 **DNS only(회색 구름)** — 주황 프록시로 바꾸면 GitHub 인증서 갱신이 막힐 수 있음. HTTPS 강제 켜짐(.app은 HSTS 필수).
- `site.config.json` url=`https://jakji.app/`, customDomain=`jakji.app` → CNAME 파일. 옛 주소 github.io/chrispro1은 자동으로 넘어옴.
- 공개 사이트 검사: `APP_URL=https://jakji.app/app.html node tests/verify.mjs`, `SITE_URL=https://jakji.app/ node tests/site.mjs`. GitHub이 자동화 브라우저에만 넣는 봇 탐지 요청(긴 무작위 경로)은 `isGhBot()`으로 걸러냄.
- 도메인 자동 갱신·WHOIS 개인정보 보호는 Cloudflare Manage domain에서 켜 둘 것. 이메일(chris7707@naver.com)은 도메인과 별개.

## 배우기 글 (애드센스 콘텐츠, 2026-10-07)
- `learn.html`(목록) + 9편: `learn-sample`(첫 샘플~본생산)·`learn-fabric`·`learn-yield`·`learn-size`·`learn-label`·`learn-inspect`·`learn-flat`(도식화)·`learn-terms`(봉제 용어 사전)·`learn-wash`(소재별 세탁). 각 편 끝에 '자주 묻는 질문' 3개, 읽는 시간은 한글 글자 수(450자/분)로 계산한 값.
- 글은 정적 HTML(생성 스크립트는 저장소에 없음, 고칠 때는 파일을 직접 수정). 새 글을 추가하면 configure.mjs `PAGES`·tests/site.mjs `PAGES`·`learn.html` 카드·대문 '옷 만들기 안내서'·바닥 링크를 함께 고칠 것.
- 숫자(중량 oz→g/㎡ 환산, 그레이딩 간격, 요척 계산 예시 등)는 이 앱의 값·공개 실측표와 맞춰 둠. 케어라벨 7항목·어린이 제품 구분은 '생산 준비 탭'과 같은 근거(국가기술표준원).
- 남성 알파벳 대응은 스파오 사이즈표 기준(85=XS … 110=XXL, 80=XXS). guide.html 표도 같게 고침.

## 애드센스 신청 체크리스트
- 필수 페이지·모든 페이지의 방침·약관·문의 링크(검사 있음), 도구 화면(app.html)에는 광고 칸을 두지 않음.
- 신청은 **구글 색인 후**(서치 콘솔에서 색인된 페이지가 늘어난 뒤, 보통 2~4주). 승인 뒤: 게시자 ID를 `adsenseClient`에 넣고 configure → ads.txt 생성, 광고 단위 ID는 `adSlots`(home-mid·home-bottom·guide-mid·factory-mid·learn-mid).
- 승인 뒤 애드센스 화면의 '개인 정보 보호 및 메시지'에서 유럽·영국 방문자용 동의 메시지(Google 인증 CMP)를 켤 것. 코드 변경은 필요 없음.

## 방문 통계 (Cloudflare Web Analytics, 2026-10-07 켬)
- `analyticsToken`(site.config.json) → configure가 모든 페이지 head에 **조건부 로더**를 넣음: 주소가 공유 링크(`#v0=`·`#v1=`)이면 불러오지 않음(작업 내용이 주소 # 뒤에 있어서). 쿠키 없음.
- Cloudflare 사이트는 DNS only(회색 구름)라 자동 설치가 안 되고 JS 스니펫만 씀. 대시보드: Analytics & Logs → Web Analytics → jakji.app.
- 테스트는 `isAnalytics()`(cloudflareinsights.com)를 '사진·작업 외부 전송 0건' 집계에서 제외하고, 공유 링크 보기에서 통계 요청이 0건인지 따로 검사.
- privacy.html 1항에 방문 통계 문구가 있음. 통계를 끄거나 업체를 바꾸면 함께 고칠 것.

## 0단계 준비 (설정만 넣으면 됨)
- `customDomain` → configure가 `CNAME` 생성. 이때 `url`도 `https://jakji.com/`으로 바꾸고, 도메인 업체 DNS에 GitHub Pages 주소(A 185.199.108~111.153 또는 CNAME chrisguy7707-ui.github.io)를 넣어야 함.
- `analyticsToken`(Cloudflare Web Analytics 32자리) → 모든 페이지에 쿠키 없는 방문 통계 스크립트. 켜기 전에 privacy.html에 방문 통계 항목 추가할 것.
- `googleSiteVerification`·`naverSiteVerification` → 검색 등록 인증 메타 태그.

## 대분류 → 소분류 (`CATS`, `STYLES`)
- 스타일 = 엔진 `template`(T의 10종) + 디테일 `opt` + 치수 보정 `spec`(기준 사이즈에 더할 cm). `specValues()`가 `styleOf().spec`을 더함.
- UI는 `oCat`·`oStyle`, 엔진 칸 `oTemplate`는 숨김(사진 인식·AI·검사가 씀 → 바뀌면 `DEFAULT_STYLE`로). 품명 기본값 = 소분류 이름 `itemName()`.
- 새 모양: 민소매(`sleeve: "none"`, 패턴은 소매 대신 진동 바이어스), 카라티 반오픈(`closure: "placket"`), 조거 밑단 시보리(`legRib`), 스커트 `mermaid`·`wrap`.
- 스커트도 치수표 비율(`skirtGeom()`).

## 도식화 편집 탭 (캔버스)
- `editHandles()`: 품목별 손잡이(상의 7·바지 6·스커트 3·원피스 6, 파우치 없음) = [측정부위, 위치, 끌 방향, 좌표→cm]. 끌면 `setBaseValue()` → `renderFlats()`.
- 표시 `state.notes = {front, back}`: text·arrow·circle. `annoSVG()`로 `buildSVG()` 끝에 그림 → 작업지시서·인쇄·HTML·SVG·작업 저장에 포함. 복원은 숫자·글자만(`cleanNote`).
- 디테일 끌기: 주머니(`chest`·`kangaroo`·`patch`·`cargo`·`bpocket`)는 `det()`로 `<g data-d data-s transform>`에 묶음. `state.offsets[이름] = {dx, dy}`(cm, 0.5 단위, ±40/±60), 좌우 쌍은 `data-s`로 x 대칭. 스타일·품목이 바뀌면 초기화, 저장·되돌리기 포함.
- 편집기 화면은 화살촉 id를 `ed-` 접두어로 바꿈(숨긴 작업지시서 SVG의 같은 id를 가리키면 안 보임). 되돌리기는 치수표 칸 + 표시 JSON 스냅숏 40개.

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

## 화면 순서
- 왼쪽 패널: ① 사이즈 → ② 디테일. 사진(`#drop`·`#file`)과 인식(`#analyzeBtn`·`#guess`·`#ratioHints`)은 **'사진 분석 (시험)' 탭(`#olz`) 맨 위**로 옮김 (사진 인식이 완전하지 않아서).
- 상태 메시지 `setStatus()`는 패널 아래 `#status`와 사진 탭 `#status2` 두 곳에 같이 씀.
- 탭: 작업지시서 · 도식화 편집 · 생산 준비 · 패턴 제도(베타) · 사진 분석(시험). 편집·생산 준비·사진 분석 탭에서 인쇄하면 작업지시서.

## 내 스타일 · 공유 링크 (서버 없음)
- 목록: IndexedDB `jakji`/`jobs` {id, name, item, updatedAt, thumb, data=snapshot}. `cur`={id,name}, 자동 저장이 목록의 지금 작업도 갱신. `Jobs.all/get/put/del`.
- 공유: `packJob()` JSON→deflate-raw→base64url → `app.html#v1=…`(압축 불가 시 #v0=). 사진·원가 기본 제외(`shareSnapshot`). 받은 쪽은 `openShared()` 읽기 전용(body.view-only), **자동 저장 끔**(받은 사람 작업 보호). ‘내 스타일에 저장해서 고치기’ → sessionStorage `jk_open`. hashchange 시 새로 읽음.
- 다음 단계: Firebase 로그인·기기 간 동기화·짧은 링크(로드맵 2단계).

## 비밀 의견 보내기 (`assets/feedback.js`)
- `[data-feedback]` 자리(문의 페이지 #feedback)와 도구의 '🔒 의견 보내기' 대화 상자에 양식을 그림. 운영자만 읽음(공개 게시판 아님).
- `site.config.json`의 `feedbackEndpoint`(https, Formspree 같은 폼 서비스)가 있으면 POST로 바로 접수, 없으면 `contactEmail`로 내용이 채워진 mailto + 복사 대체 상자.
- configure가 모든 페이지 head에 `window.SITE = {contactEmail, feedbackEndpoint, (adClient, adSlots)}`를 넣음. 도구는 `window.JAKJI_CONTEXT()`로 품목·사이즈·탭만 붙임(사진·작업 내용 X).
- **지금은 Formspree 연결됨**(`feedbackEndpoint`=https://formspree.io/f/mqpeeyew, 받는 메일은 Formspree 가입 계정 chrisguy7707@gmail.com). 테스트는 `fetch`를 가로채 진짜 접수가 생기지 않게 하고(`noReal`), `JAKJI_NO_MAILTO`로 메일 앱도 안 열음.
- (참고) 폼 서비스로 바꾸면 privacy.html '의견 보내기'에 서비스 이름·보관 기간을 먼저 적을 것.

## 생산 준비 탭 (`#prod`, 1인 브랜드·학생용)
- 상태 `state.prod` = { cost, colors, qty{"컬러|사이즈"}, care, careOpts, sample{name, meas, memo}, samples[] }. `snapshot().prod` ↔ `cleanProd()`(숫자·글자만, 길이 제한).
  - snapshot에서 도식화 표시는 `marks`(예전 파일의 `notes` 객체도 읽음), `notes`는 주의사항 줄 목록 — 이름 겹쳐 주의사항이 사라지던 문제 고침.
- ① `checks()`: [이름, 공장이 물어볼 질문, 채움, 이동할 칸, 꼭/권장]. ② `costCalc()`. ③ 발주표 → `fQty`·`fColor`, `buildCSV()`(BOM, 작업지시서·치수표·발주표·부자재·봉제·주의·원가).
- ④ 케어라벨: 국가기술표준원 가정용 섬유제품 표시사항 7가지(혼용률·제조자명·제조국·제조연월·치수·취급상 주의·주소·전화). 성인 의류는 안전기준준수 대상(KC 마크 없음), 13세 이하 어린이 옷은 어린이제품 안전 특별법 — 문구 바뀌면 함께 고칠 것.
- ⑤ 샘플 기록: 지시(기준 사이즈 `baseVals()`) vs 실측, 허용오차 `TOL`=1cm, 최대 20개, 두 차수 비교.
- `factory.html`: 기관·서비스 내용은 2026-10 기준 업체·기관 소개. 특정 업체 추천·보증 아님 문구 유지.

## 외곽선 분석 (시험, `assets/outline.js`, '사진 분석' 탭 아래쪽)
- AI 없음. 테두리 색 = 배경 → 테두리와 이어진 비슷한 색을 걷어 냄(옷 안 흰 프린트는 남음) → 열기 연산 → 가장 큰 덩어리 → 무어 추적 + 더글러스-포이커.
- 배경 얼룩 = 테두리 거리의 70% 지점 (옷이 테두리에 닿아도 버티게). 민감도 슬라이더로 임계값 조정.
- 모양 판단은 **참고용**: 다리 두 갈래(비슷한 폭 2구간, 가운데 비어 있음)·네모(채움 80%+)만 믿을 만함. 품목 판단은 사진 인식이 담당.
- 치수: 줄별 구간(run)으로 픽셀 측정 → 사진 위 기준선(두 점 + 실제 cm)으로 환산 → 고른 항목만 치수표 기준 열에 넣고 다른 사이즈는 같은 차이만큼 이동.
- 합성 사진(앱 도식화를 회색 바닥에) 기준 오차 3.5% 이내를 검사로 유지. 실제 사진 한계: 입은 사진·복잡한 배경·여러 개 겹침·흰 옷+흰 배경.

## 규칙
- 한국어 UI, 공장 용어(시보리, 오버록, 2본침, 커버스티치, 요척 등) 유지.
- 기준 치수 데이터(`T`)를 바꾸면 반드시 10개 품목 × 남/여 모두 렌더링 확인.
- 잡화(`kind: "bag"`, 지금은 `pouch`)는 성별 호칭 대신 `BAG_SIZES` S·M·L(기준 M), 치수는 완성 치수. `sizeList()`·`ensureSizeSystem()`·`renderKindControls()` 참고.
- 인쇄 시 A4 가로 **1장**을 넘기지 않을 것. `fitPrint()`가 내용 높이에 맞춰 `--print-zoom`(기본 .93, `PRINT_H` 705px 기준)을 자동으로 줄임.
- 변경 후 `npm run serve` + `npm test` 통과 확인: tests/verify.mjs(도구 76개, 방문 통계 조건부 로딩 포함, 의견 보내기 포함, 내 스타일·공유 링크 포함, 휴대폰 결과 보기 버튼 포함, 화면 순서·생산 준비(빠진 항목·원가·발주표·CSV·케어라벨·샘플 비교·저장 정리) 포함, 소분류 34종·도식화 편집(끌기·디테일 이동·표시·되돌리기·저장) 포함, 도식화-치수표 비율·새 디테일 전 조합·AI 비율 제안 포함, 외곽선 합성 사진 정확도·기준선·치수표 반영 포함, 저장·열기·자동 저장·휴대폰·베타 포함, 10품목×남녀×3핏 패턴 60개, 인식·외부 전송 0건·SVG 전 조합·패턴 제도·실물 크기 인쇄 포함), tests/site.mjs(사이트 35개, factory·배우기 10페이지·비밀 의견·필수 링크 포함: SEO 태그·링크·모바일·광고 설정).
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
