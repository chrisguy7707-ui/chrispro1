# 옷만들기 도면 메이커

옷 사진을 올리고 사이즈(남 80~110, 여 44~88)를 고르면 도식화·치수표·원단·봉제 사양이 담긴 한국형 작업지시서를 A4 한 장으로 만들어 줍니다.

## 페이지
| 파일 | 내용 |
|---|---|
| `index.html` | 대문: 사이트 소개, 사용 순서, 기능, 자주 묻는 질문 |
| `app.html` | 작업지시서 만들기 도구 |
| `guide.html` | 작업지시서 작성법 (도식화·치수 재는 법·봉제 용어) |
| `about.html` · `contact.html` | 사이트 소개 · 문의 |
| `privacy.html` · `terms.html` | 개인정보처리방침 · 이용약관 (애드센스 쿠키 고지 포함) |

## 도구 사용 순서
1. 옷 사진 올리기 (정면 1장)
2. 성별·출력 사이즈 선택 (노란 테두리 = 기준 샘플 사이즈, 더블클릭으로 변경)
3. 사진 자동 인식: 키가 없으면 브라우저 안에서 무료로 품목·디테일·컬러를 인식합니다(처음 한 번 모델 약 23MB). 상위 후보 3개를 눌러 바로 바꿀 수 있습니다.
   claude.ai에서 열면 Claude가, Gemini API 키를 넣으면 Gemini가 소재·봉제 사양까지 분석합니다.
4. 디테일 확인·수정: 품목·핏·넥라인·여밈·주머니·원단·컬러·품명. AI 없이 여기서 직접 골라도 됩니다.
5. 인쇄·PDF 저장 / 작업지시서 파일(HTML) 저장 / 도식화 SVG 저장
6. **패턴 제도 탭**: H라인 스커트·사각 지퍼 파우치. 치수 입력 → 제도도·계산표, 인쇄하면 축소도 1장 + 실물 크기 A4 분할(배율 100%, 50mm 확인 네모), 실물 크기 SVG 저장

## 개발
```bash
npm install          # 검사·이미지 생성용 (puppeteer-core, 설치된 Chrome 사용)
npm run serve        # http://localhost:8766
npm test             # 도구 34개 + 사이트 22개 항목 검사 (인식 모델 다운로드에 인터넷 필요)
npm run configure    # site.config.json → 모든 페이지 <head>, sitemap.xml, robots.txt, ads.txt
npm run images       # 대문 미리보기·공유 이미지 다시 만들기
npm run clip-labels  # 사진 인식 후보 문장을 바꿨을 때 assets/clip-labels.json 다시 만들기
```

## 공개하고 애드센스 신청하기

### 1. 사이트 주소 정하기
- **GitHub Pages:** 저장소 Settings → Pages → Branch `main` / `/ (root)` 저장. 주소는 `https://chrisguy7707-ui.github.io/chrispro1/`.
- **애드센스는 직접 소유한 도메인이 필요합니다.** `github.io`의 하위 폴더 주소로는 사이트 추가와 `ads.txt` 확인이 되지 않습니다. 도메인(예: `.com`, `.kr`)을 사서 GitHub Pages의 Custom domain에 연결하세요.
- 주소가 정해지면 `site.config.json`의 `url`을 바꾸고 `npm run configure`를 실행합니다.

### 2. 검색 등록 (SEO)
- [Google Search Console](https://search.google.com/search-console)에 사이트 추가 → HTML 태그 방식의 `content` 값을 `googleSiteVerification`에 넣고 `npm run configure` → 배포 → 확인 → `sitemap.xml` 제출
- [네이버 서치어드바이저](https://searchadvisor.naver.com/)도 같은 방식으로 `naverSiteVerification`에 넣고 사이트맵을 제출합니다.

### 3. 애드센스 승인 신청
1. [Google 애드센스](https://adsense.google.com/) 가입 → 사이트 추가 → 게시자 ID(`ca-pub-숫자16자리`) 확인
2. `site.config.json`의 `adsenseClient`에 게시자 ID를 넣고, `contactEmail`에 문의 이메일을 넣습니다.
3. `npm run configure` → 커밋·푸시. 모든 페이지 `<head>`에 애드센스 코드와 `google-adsense-account` 메타 태그가 들어가고, 루트에 `ads.txt`가 생깁니다.
4. 애드센스 화면에서 사이트 연결 확인 → **검토 요청**. 보통 며칠~몇 주 걸립니다.

### 4. 승인 후 광고 넣기
- **자동 광고:** 애드센스 화면에서 켜기만 하면 됩니다(코드는 이미 들어가 있음).
- **정해진 자리:** 광고 단위를 만들고 ID를 `adSlots`에 넣은 뒤 `npm run configure`. 자리는 `home-mid`(대문 중간), `home-bottom`(대문 아래), `guide-mid`(작성법 중간), `app-top`(도구 화면 위)입니다. ID가 없는 자리는 화면에 나타나지 않고, 작업지시서 인쇄물에는 광고가 나오지 않습니다.

## 주의
- 치수표는 레귤러핏 참고 표준값입니다. 반드시 샘플 실측으로 수정하세요.
- 자체 디자인·자체 샘플에 사용하세요. 타인 제품 형태를 모방하는 용도는 법적 문제가 될 수 있습니다.
