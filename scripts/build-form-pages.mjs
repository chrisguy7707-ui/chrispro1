/* 양식 안내 페이지 만들기: 품목별 9쪽(form-<품목>.html) + 영문 양식 2쪽(form-english.html, en/form.html)과 미리보기 이미지(assets/forms/*.webp).
   도구(app.html)의 치수표·부자재·봉제 사양·원단 프리셋을 그대로 읽어 표를 채우므로, 도구의 값이 바뀌면 다시 돌릴 것.
   품목마다 다른 설명 글은 아래 ITEMS에 있음(글을 고칠 때는 여기를 고치고 다시 실행).
   실행: npm run serve 상태에서 npm run form-pages → npm run configure */
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = process.env.APP_URL || "http://localhost:8766/app.html";
const TODAY = "2026년 10월 10일";
const e = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------------------------------------------------------------- 품목별 글 */
const ITEMS = {
  "top-short": { tpl: "top_short", file: "form-tshirt.html", name: "반팔 티셔츠", short: "반팔티",
    title: "반팔티 작업지시서 양식 (엑셀) 무료 다운로드 | 작지", h1: "반팔티 작업지시서 양식 무료 다운로드",
    desc: "반팔 티셔츠·크롭티·민소매·카라티에 쓰는 작업지시서 엑셀 양식. 앞뒤 도식화, 치수표, 부자재, 봉제 사양이 들어 있어요. 회원가입 없이 무료.",
    lead: "반팔 티셔츠, 크롭티, 민소매(나시), 카라 티(폴로)에 쓰는 엑셀 작업지시서 양식입니다. 앞·뒤 도식화와 치수표(남성 80~110, 여성 44~88), 원단·부자재·봉제 사양이 들어 있어서 내 샘플의 실측값으로 바꿔 적기만 하면 됩니다.",
    points: [
      "<strong>목 시보리</strong>: 목너비·앞목깊이 치수와 함께 시보리 폭, 상침 폭(예: 2본침 0.6cm)을 봉제 사양에 적어 두세요. 목이 벌어지거나 우는 불량은 여기서 자주 생깁니다.",
      "<strong>수축률</strong>: 면 싱글저지는 세탁 뒤 길이가 줄 수 있어 재단 전에 수축률을 확인해야 합니다. 주의사항에 ‘세탁 후 수축 3% 이내’처럼 기준을 적어 두면 공장과 말이 맞습니다.",
      "<strong>소분류별로 달라지는 곳</strong>: 크롭은 총장, 민소매는 어깨너비와 진동, 카라 티는 칼라와 플래킷(트임) 길이를 따로 적어야 합니다. 이 엑셀은 일반 반팔 티 기준이고, 작지 도구에서 소분류를 고르면 치수 보정과 도식화가 함께 바뀝니다.",
      "<strong>라벨·프린트 위치</strong>: 메인 라벨, 케어 라벨, 사이즈 라벨과 프린트·자수 위치를 도식화 옆 주의사항에 cm 단위로 적어 두세요. ‘가운데 위쪽’ 같은 말은 사람마다 다르게 읽힙니다.",
      "<strong>밑단·소매 접단</strong>: 접단 폭과 박음질 방식(2본침, 커버스티치)을 정해 적습니다. 같은 티라도 방식에 따라 단가와 늘어남이 달라집니다." ],
    fabricIntro: "반팔티에 많이 쓰는 원단입니다. 양식의 원단·혼용률·중량 칸에 그대로 옮겨 적을 수 있습니다.",
    faq: [["크롭티나 민소매도 이 양식으로 쓸 수 있나요?", "쓸 수 있습니다. 다만 크롭은 총장을, 민소매는 어깨너비와 진동을 직접 고쳐 적어야 합니다. 도구에서 소분류를 고르면 해당 형태에 맞게 치수가 보정되고 도식화도 달라집니다."],
      ["반팔 티셔츠 작업지시서에는 어떤 치수를 적나요?", "{PARTS}입니다. 샘플에서 자주 틀어지는 곳(진동, 소매 밑단 등)이 있으면 행을 더해서 적으세요."],
      ["티셔츠 샘플 의뢰할 때 사진만 보내도 되나요?", "사진만으로는 치수와 봉제 방식이 전달되지 않아 샘플이 여러 번 오가게 됩니다. 작업지시서에 치수와 부자재, 봉제 방식까지 적고 참고 사진을 함께 붙이는 것이 가장 빠릅니다."]],
    related: ["top-long", "hoodie", "dress"] },
  "top-long": { tpl: "top_long", file: "form-longsleeve.html", name: "긴팔 티셔츠·맨투맨", short: "긴팔티·맨투맨",
    title: "맨투맨·긴팔티 작업지시서 양식 (엑셀) 무료 다운로드 | 작지", h1: "맨투맨·긴팔티 작업지시서 양식 무료 다운로드",
    desc: "긴팔 티셔츠, 맨투맨, 카디건 바탕에 쓰는 작업지시서 엑셀 양식. 소매부리 치수와 시보리 사양까지 한 장에. 회원가입 없이 무료로 내려받으세요.",
    lead: "긴팔 티셔츠, 맨투맨(스웨트셔츠), 카디건 바탕에 쓰는 엑셀 작업지시서 양식입니다. 반팔과 달리 소매통과 소매부리 치수가 들어 있고, 목·소매·밑단 시보리를 전제로 한 기본 봉제 사양이 채워져 있습니다.",
    points: [
      "<strong>소매 치수 3종</strong>: 소매길이(어깨점부터 소매 끝), 소매통단면(진동 밑), 소매부리단면을 함께 적습니다. 시보리가 달리는 맨투맨은 소매부리를 시보리를 펼치지 않은 상태로 잴지 펼쳐서 잴지도 적어 두세요.",
      "<strong>시보리 사양</strong>: 목·소매·밑단 시보리의 폭과 원단(겉감 동색인지 별도 시보리 원단인지)을 부자재 표에 적습니다. 시보리 길이는 몸판보다 짧게 재단해 늘려 박으므로 공장 기준을 확인하세요.",
      "<strong>쭈리·기모 원단</strong>: 쭈리(프렌치테리)는 두께와 수축이, 기모 쭈리는 안쪽 기모(털) 방향이 재단에서 중요합니다. 원단 방향과 수축률 확인 문구를 주의사항에 넣어 두세요.",
      "<strong>어깨 처리</strong>: 어깨선은 늘어남을 막는 테이프를 대는지, 드롭숄더인지에 따라 어깨너비 기준점이 달라집니다. 드롭숄더라면 기준점을 도식화에 표시해 두는 것이 안전합니다.",
      "<strong>카디건 바탕으로 쓸 때</strong>: 앞트임 길이, 단추·지퍼, 앞단 시보리 폭을 따로 적어야 합니다. 이 양식에는 포함돼 있지 않으니 도구에서 소분류를 ‘카디건’으로 고르세요." ],
    fabricIntro: "긴팔 티와 맨투맨에 많이 쓰는 원단입니다.",
    faq: [["맨투맨 작업지시서에는 어떤 치수를 적나요?", "{PARTS}입니다. 시보리 폭은 치수표가 아니라 부자재·봉제 사양 칸에 적는 경우가 많습니다."],
      ["긴팔티와 맨투맨은 양식이 다른가요?", "큰 틀은 같습니다. 맨투맨은 원단이 두껍고 시보리가 달리므로 원단 중량과 시보리 사양을 더 자세히 적으면 됩니다."],
      ["엑셀에서 기준 사이즈를 고쳤는데 다른 사이즈가 안 바뀌어요.", "엑셀 양식의 사이즈별 치수는 숫자 칸이라 기준 사이즈를 고쳐도 나머지가 저절로 바뀌지 않습니다. ‘편차’ 열의 값만큼 나머지 사이즈를 더하거나 빼서 직접 맞추거나, 작지 도구에서 기준 사이즈만 고치면 나머지가 같은 차이로 바뀝니다."]],
    related: ["top-short", "hoodie", "jacket"] },
  "shirt": { tpl: "shirt", file: "form-shirt.html", name: "셔츠", short: "셔츠",
    title: "셔츠 작업지시서 양식 (엑셀) 무료 다운로드 | 작지", h1: "셔츠 작업지시서 양식 무료 다운로드",
    desc: "남녀 셔츠·블라우스용 작업지시서 엑셀 양식. 칼라·커프스 둘레와 심지, 단추 규격까지 적는 칸이 들어 있어요. 회원가입 없이 무료 다운로드.",
    lead: "남성 셔츠와 여성 블라우스에 쓰는 엑셀 작업지시서 양식입니다. 셔츠는 티셔츠와 달리 칼라, 칼라밴드, 커프스, 요크, 앞단 같은 부위가 많아서 치수표에 칼라 둘레와 커프스 둘레가 들어 있고, 심지와 단추 규격이 부자재 표에 채워져 있습니다.",
    points: [
      "<strong>칼라·커프스 둘레</strong>: 칼라 둘레는 단추를 채운 상태에서 칼라 밴드의 안쪽 길이로 재고, 커프스 둘레는 단추를 채운 상태로 잽니다. 재는 방법을 같이 적어야 사이즈가 틀어지지 않습니다.",
      "<strong>접착 심지</strong>: 칼라·커프스·앞단에 어떤 심지를 붙이는지에 따라 셔츠의 형태와 세탁 뒤 모양이 크게 달라집니다. 심지 종류와 접착 위치를 부자재 표에 적으세요.",
      "<strong>단추 규격과 위치</strong>: 단추 크기(예: 4구 11.5mm), 개수, 첫 단추 위치와 간격을 적습니다. 도식화에 단추 위치를 표시하면 더 정확합니다. 여성 블라우스는 앞 여밈 방향(오른쪽·왼쪽)이 남성과 반대라는 점도 적어 두세요.",
      "<strong>요크·소매 트임</strong>: 요크를 2겹으로 봉제하는지, 소매 트임(플래킷) 처리를 어떻게 하는지 봉제 사양에 적습니다.",
      "<strong>무늬 맞춤</strong>: 스트라이프나 체크 원단이면 앞단·포켓·소매의 무늬를 맞출지 여부와 요척 여유를 함께 정해야 합니다." ],
    fabricIntro: "셔츠에 많이 쓰는 원단입니다.",
    faq: [["셔츠 작업지시서에는 어떤 치수를 적나요?", "{PARTS}입니다. 소매 트임 길이나 포켓 위치처럼 셔츠에서 자주 필요한 치수는 도식화 옆에 따로 적어 두세요."],
      ["블라우스도 이 양식으로 쓸 수 있나요?", "쓸 수 있습니다. 여성 사이즈(44~88)를 고르면 여성 기준 치수가 들어 있고, 스타일에 따라 칼라가 없는 경우에는 칼라 행을 지우거나 목 처리 방식을 적으면 됩니다."],
      ["옥스포드와 포플린은 뭐가 다른가요?", "옥스포드는 조직이 굵어 두툼하고 캐주얼한 느낌이고, 포플린은 조직이 촘촘해 매끈하고 얇습니다. 중량과 조직을 원단 칸에 함께 적어야 공장이 바늘과 심지를 정합니다."]],
    related: ["dress", "jacket", "top-long"] },
  "hoodie": { tpl: "hoodie", file: "form-hoodie.html", name: "후드티", short: "후드티",
    title: "후드티 작업지시서 양식 (엑셀) 무료 다운로드 | 작지", h1: "후드티 작업지시서 양식 무료 다운로드",
    desc: "후드티·후드 집업용 작업지시서 엑셀 양식. 후드 높이·너비, 캥거루 주머니, 시보리 사양까지 담았어요. 회원가입 없이 무료로 내려받으세요.",
    lead: "후드티와 후드 집업에 쓰는 엑셀 작업지시서 양식입니다. 일반 티셔츠 양식에 후드 높이와 후드 너비 치수가 더해져 있고, 캥거루 주머니를 전제로 한 도식화가 들어 있습니다.",
    points: [
      "<strong>후드 치수</strong>: 후드 높이는 목 봉제선부터 후드 맨 위까지, 후드 너비는 가장 넓은 곳을 잽니다. 후드를 쓴 모양이 사진마다 달라 보이므로 도식화에 측정 위치를 표시하세요.",
      "<strong>후드 안감</strong>: 후드를 이중(겉감+안감)으로 만들지 한 겹으로 만들지에 따라 요척과 원가가 달라집니다. 도구의 ‘추가 원단 줄’에 안감을 더하면 원단 표에 같이 정리됩니다.",
      "<strong>드로코드·아일렛</strong>: 끈 길이와 굵기, 끝 마감(금속 팁), 아일렛 규격과 위치를 부자재 표에 적습니다. 끈이 빠지지 않도록 중앙에서 고정하는지도 정하세요.",
      "<strong>캥거루 주머니</strong>: 주머니 크기와 위치(밑단에서 몇 cm), 입구 각도와 보강 박음질을 적습니다. 도식화에서 주머니를 끌어 옮기면 위치를 눈으로 맞출 수 있습니다.",
      "<strong>두꺼운 원단·시보리</strong>: 쭈리와 기모 쭈리는 두꺼워서 바늘과 실 번수가 일반 티셔츠와 다를 수 있고, 시보리 폭과 늘어남 정도를 샘플에서 반드시 확인합니다." ],
    fabricIntro: "후드티에 많이 쓰는 원단입니다.",
    faq: [["후드 집업은 어떻게 적나요?", "후드티 양식에 지퍼 길이와 규격(예: 메탈 지퍼 길이), 지퍼 풀러 종류, 앞 여밈 방향을 더해서 적으세요. 작지 도구에서 소분류를 ‘후드 집업’으로 고르면 지퍼 도식화로 바뀝니다."],
      ["후드티 작업지시서에는 어떤 치수를 적나요?", "{PARTS}입니다. 후드를 쓴 길이가 중요한 디자인이면 후드 둘레도 따로 적어 두세요."],
      ["기모 후드티는 요척이 더 많이 드나요?", "원단이 두껍고 결 방향이 정해져 있어 여유를 더 두는 경우가 많습니다. 정확한 요척은 샘플 패턴으로 재단해 본 뒤에 정하세요."]],
    related: ["top-long", "jacket", "pants"] },
  "jacket": { tpl: "jacket", file: "form-jacket.html", name: "자켓·점퍼", short: "자켓·점퍼",
    title: "자켓·점퍼 작업지시서 양식 (엑셀) 무료 다운로드 | 작지", h1: "자켓·점퍼 작업지시서 양식 무료 다운로드",
    desc: "집업 점퍼, 블루종, 코치 자켓, 데님 자켓에 쓰는 작업지시서 엑셀 양식. 소매부리 치수와 지퍼·안감 정리 칸이 들어 있어요. 무료 다운로드.",
    lead: "집업 점퍼, 블루종(봄버), 코치 자켓, 데님 자켓에 쓰는 엑셀 작업지시서 양식입니다. 소매부리 치수가 있고, 지퍼·주머니·안감처럼 겉옷에서 자주 필요한 정보를 적을 칸을 두었습니다.",
    points: [
      "<strong>지퍼 규격</strong>: 길이, 종류(메탈·코일·비슬론), 풀러 모양, 열리는 방향(오픈 엔드)을 부자재 표에 적습니다. 지퍼는 자켓에서 가장 자주 문제가 되는 부자재입니다.",
      "<strong>안감과 심지</strong>: 안감을 쓰면 겉감과 안감의 요척과 원가를 따로 계산해야 합니다. 작지 도구의 ‘추가 원단 줄’로 안감, 시보리, 배색 원단을 나눠 적을 수 있습니다.",
      "<strong>주머니 위치</strong>: 외주머니와 안주머니의 위치와 크기, 입구 처리(플랩, 지퍼, 웰트)를 도식화와 함께 적습니다. 위치는 ‘어깨선에서 몇 cm’ 또는 ‘밑단에서 몇 cm’처럼 기준점을 밝히세요.",
      "<strong>시보리·밴드</strong>: 블루종은 목·소매·밑단에 시보리가 달리고, 일반 점퍼는 밴드나 접단으로 끝냅니다. 어느 방식인지에 따라 소매부리단면 치수의 의미가 달라집니다.",
      "<strong>데님·코팅 원단</strong>: 데님 자켓은 세탁 가공(워싱) 때 수축과 색 변화가 크므로 가공 전후 치수를 따로 적어야 하고, 나일론 코팅 원단은 바늘 자국과 방수 처리(심 테이프) 여부를 정해야 합니다." ],
    fabricIntro: "자켓·점퍼에 많이 쓰는 원단입니다.",
    faq: [["자켓 작업지시서에는 어떤 치수를 적나요?", "{PARTS}입니다. 포켓 위치, 지퍼 길이, 칼라 높이처럼 디자인에 따라 필요한 치수는 행을 더해 적으세요."],
      ["블루종과 코치 자켓은 같은 양식을 써도 되나요?", "같은 양식에 치수만 다르게 적으면 됩니다. 블루종은 시보리 마감과 풍성한 몸판, 코치 자켓은 셔츠형 칼라와 스냅 단추처럼 디테일이 다르니 작지 도구에서 소분류를 고르면 도식화가 맞게 바뀝니다."],
      ["안감을 쓰면 케어라벨 혼용률은 어떻게 적나요?", "겉감과 안감의 혼용률을 따로 적어야 합니다. 작지 도구에서는 추가 원단 줄의 용도를 ‘안감’으로 두면 그 혼용률이 케어라벨 기본값에 들어갑니다."]],
    related: ["hoodie", "shirt", "pants"] },
  "pants": { tpl: "pants", file: "form-pants.html", name: "바지", short: "바지",
    title: "바지 작업지시서 양식 (엑셀) 무료 다운로드 | 작지", h1: "바지 작업지시서 양식 무료 다운로드",
    desc: "일자·와이드·슬랙스·청바지·조거·카고 바지용 작업지시서 엑셀 양식. 허리 인치 호칭과 밑위·허벅지 치수가 들어 있어요. 무료 다운로드.",
    lead: "일자 바지, 와이드 팬츠, 슬랙스, 청바지, 조거, 카고 팬츠에 쓰는 엑셀 작업지시서 양식입니다. 남성 사이즈에는 허리 인치 호칭(예: 100 = 32인치)이 함께 적혀 있고, 허리·엉덩이·허벅지·밑위·밑단 치수가 들어 있습니다.",
    points: [
      "<strong>허리 인치 호칭</strong>: 바지는 80~110 같은 숫자 호칭 대신 28~36인치 호칭을 쓰는 경우가 많습니다. 이 양식은 둘을 같이 적어 두었고, 인치는 허리단면×2÷2.54를 기준으로 맞춘 참고값이라 실측으로 확인하세요.",
      "<strong>허리단면·밑위</strong>: 허리단면은 허리선을 납작하게 놓고 가로로, 앞 밑위는 허리선 위부터 가랑이 합봉선까지 잽니다. 허리가 고무줄이면 늘이지 않은 상태인지 늘인 상태인지 적어야 합니다.",
      "<strong>지퍼·단추·포켓감</strong>: 앞 지퍼 길이와 종류, 허리 단추 규격, 포켓감 원단(T/C 등)을 부자재 표에 적습니다. 청바지는 리벳과 원단 라벨도 여기에 정리합니다.",
      "<strong>소분류별 차이</strong>: 와이드는 밑단단면, 조거는 밑단 시보리 폭, 카고는 주머니 위치와 덮개 크기가 핵심입니다. 작지 도구에서 소분류를 고르면 해당 디테일이 도식화에 그려집니다.",
      "<strong>세탁 가공</strong>: 데님·워싱 바지는 가공 뒤 수축으로 총장과 허리가 줄 수 있어, 가공 전 치수와 가공 후 목표 치수를 구분해 적어야 합니다." ],
    fabricIntro: "바지에 많이 쓰는 원단입니다.",
    faq: [["바지 작업지시서에는 어떤 치수를 적나요?", "{PARTS}입니다. 인심(안쪽 다리 길이)이나 앞·뒤 밑위를 따로 확인하는 곳이 많아서, 필요하면 행을 더하세요."],
      ["허리 인치는 어떻게 정하나요?", "허리단면(가로 길이)을 두 배 하고 2.54로 나누면 둘레 인치에 가깝습니다. 호칭 인치와 실측은 1인치 안팎으로 달라질 수 있으니, 둘레를 직접 재서 적는 것이 정확합니다."],
      ["카고 팬츠나 조거는 어떻게 적나요?", "같은 양식에 주머니 위치·크기, 밑단 시보리 폭을 더해서 적습니다. 도구에서 소분류를 ‘카고 팬츠’나 ‘조거 팬츠’로 고르면 해당 도식화와 치수 보정이 들어갑니다."]],
    related: ["shorts", "skirt", "hoodie"] },
  "shorts": { tpl: "shorts", file: "form-shorts.html", name: "반바지", short: "반바지",
    title: "반바지 작업지시서 양식 (엑셀) 무료 다운로드 | 작지", h1: "반바지 작업지시서 양식 무료 다운로드",
    desc: "반바지·버뮤다 팬츠용 작업지시서 엑셀 양식. 짧은 총장에 맞춘 허벅지·밑단 치수와 허리 인치 호칭이 들어 있어요. 무료로 내려받으세요.",
    lead: "반바지와 버뮤다 팬츠에 쓰는 엑셀 작업지시서 양식입니다. 바지와 같은 치수 항목을 쓰되 총장이 짧은 옷에 맞춘 기준값이 들어 있습니다. 남성 사이즈에는 허리 인치 호칭도 함께 적혀 있습니다.",
    points: [
      "<strong>총장 기준점</strong>: 반바지는 총장이 짧아 허리선부터 밑단까지 몇 cm인지가 곧 길이감입니다. 기준점(허리선 위, 허리밴드 위 등)을 도식화에 표시해 샘플 때 오해가 없게 하세요.",
      "<strong>허벅지·밑단 비율</strong>: 길이가 짧으면 밑단이 넓게 보이기 쉬워서 허벅지단면과 밑단단면의 차이가 실루엣을 좌우합니다. 두 치수는 함께 정하세요.",
      "<strong>허리 고무줄·끈</strong>: 고무줄이나 드로코드를 쓰면 허리단면을 늘이지 않은 상태로 적고, 고무줄 폭과 끈 길이를 부자재 표에 적습니다.",
      "<strong>원단 선택</strong>: 린넨, 면 트윌, 나일론 태슬란 등 여름 원단을 많이 쓰고, 원단에 따라 수축률과 구김 정도가 다릅니다. 린넨은 수축과 구김이 크므로 주의사항에 가공 방식을 적어 두세요.",
      "<strong>주머니 깊이</strong>: 짧은 바지는 주머니 깊이가 깊으면 안감이 밑단 밖으로 보이거나 소지품이 비칠 수 있습니다. 주머니 크기와 위치를 같이 적습니다." ],
    fabricIntro: "반바지에 많이 쓰는 원단입니다.",
    faq: [["반바지 작업지시서에는 어떤 치수를 적나요?", "{PARTS}입니다. 반바지에서는 총장과 밑단단면을 특히 꼼꼼히 확인하세요."],
      ["바지 양식으로 반바지를 만들어도 되나요?", "치수 항목은 같아서 총장만 짧게 바꾸면 됩니다. 이 반바지 양식은 총장이 짧은 옷에 맞춘 기준값이 이미 들어 있어 따로 줄일 필요가 없습니다."],
      ["수영복이나 운동복 반바지에도 쓸 수 있나요?", "신축 원단과 안감(속 팬티) 구조는 이 양식에 없으니 추가 원단 줄과 봉제 사양에 직접 적어야 합니다. 기본 틀로는 쓸 수 있습니다."]],
    related: ["pants", "skirt", "top-short"] },
  "skirt": { tpl: "skirt", file: "form-skirt.html", name: "스커트", short: "스커트",
    title: "스커트 작업지시서 양식 (엑셀) 무료 다운로드 | 작지", h1: "스커트 작업지시서 양식 무료 다운로드",
    desc: "A라인·H라인·플리츠·머메이드·랩 스커트용 작업지시서 엑셀 양식. 허리 인치와 콘솔 지퍼 사양이 들어 있어요. 회원가입 없이 무료 다운로드.",
    lead: "A라인, H라인(펜슬), 플리츠, 테니스, 미니, 머메이드, 랩 스커트에 쓰는 엑셀 작업지시서 양식입니다. 허리·엉덩이·밑단·총장 4곳을 적고, 허리 인치 호칭(예: 여성 66 = 28인치 안팎)을 함께 씁니다.",
    points: [
      "<strong>모양에 따라 달라지는 밑단단면</strong>: 같은 허리와 엉덩이라도 H라인은 밑단이 좁고 플리츠와 머메이드는 넓어서 밑단단면이 크게 달라집니다. 이 양식의 밑단은 소분류 기준으로 맞춰져 있으니 모양을 바꾸면 값도 바꾸세요.",
      "<strong>플리츠는 주름 수와 깊이</strong>: 플리츠 스커트는 주름 수, 주름 깊이, 눌러 박는 길이(스티칭 위치)를 적어야 합니다. 주름 때문에 허리에 들어가는 원단 길이가 훨씬 길어져 요척이 늘어납니다.",
      "<strong>콘솔 지퍼</strong>: 뒤 중심 지퍼 길이(기본 20cm), 동색 여부, 훅·단추 위치를 적습니다. 지퍼가 없는 랩 스커트나 고무줄 허리는 이 항목을 지우세요.",
      "<strong>허리밴드</strong>: 허리밴드 폭과 접착 심지, 안쪽 처리(고무줄 삽입, 트윌 테이프)를 적습니다. 허리가 들뜨는 불량은 심지와 밴드 폭에서 자주 나옵니다.",
      "<strong>안감과 길이</strong>: 비치는 원단이면 안감(속치마)을 쓰는지, 안감 길이를 겉감보다 몇 cm 짧게 할지 적습니다. 총장은 허리선 기준인지 허리밴드 아래 기준인지도 밝혀야 합니다." ],
    fabricIntro: "스커트에 많이 쓰는 원단입니다.",
    faq: [["스커트 작업지시서에는 어떤 치수를 적나요?", "{PARTS}입니다. 플리츠나 머메이드처럼 모양이 있는 스커트는 주름 수와 밑단 퍼짐 같은 항목을 행으로 더해 적으세요."],
      ["남성 사이즈 스커트 양식도 있나요?", "있습니다. 같은 양식에 남성 사이즈(80~110) 기준 치수를 넣은 파일도 함께 내려받을 수 있습니다. 대부분은 여성 사이즈(44~88)를 쓰게 됩니다."],
      ["허리 인치와 사이즈는 어떻게 대응되나요?", "이 양식의 여성 사이즈는 44가 24인치, 88이 32인치 안팎으로 맞춰 둔 참고값입니다. 브랜드마다 호칭이 달라서 내 샘플 실측값으로 바꿔 쓰세요."]],
    related: ["pants", "dress", "shirt"] },
  "dress": { tpl: "dress", file: "form-dress.html", name: "원피스", short: "원피스",
    title: "원피스 작업지시서 양식 (엑셀) 무료 다운로드 | 작지", h1: "원피스 작업지시서 양식 무료 다운로드",
    desc: "반팔·민소매·셔츠 원피스용 작업지시서 엑셀 양식. 총장·가슴·허리·밑단 치수와 도식화가 들어 있어요. 회원가입 없이 무료로 내려받으세요.",
    lead: "반팔 원피스, 민소매 원피스, 셔츠 원피스에 쓰는 엑셀 작업지시서 양식입니다. 상의 부분과 치마 부분을 함께 적어야 해서 총장·어깨너비·가슴단면·허리단면·밑단단면·소매길이를 한 표에 모았습니다.",
    points: [
      "<strong>허리선 위치</strong>: 원피스는 허리 절개선이 어디에 있는지가 실루엣을 결정합니다. 허리단면과 함께 ‘어깨선에서 허리선까지’ 길이를 도식화에 표시하세요.",
      "<strong>치마 부분의 퍼짐</strong>: 밑단단면이 허리단면보다 얼마나 큰지가 A라인·플레어 같은 모양을 정합니다. 주름이나 개더가 있으면 주름 양과 위치를 봉제 사양에 적습니다.",
      "<strong>여밈 방식</strong>: 뒤 지퍼, 앞 단추(셔츠 원피스), 옆 지퍼 중 무엇인지, 길이와 위치를 부자재 표에 적습니다. 셔츠 원피스는 단추 개수와 간격도 필요합니다.",
      "<strong>안감과 비침</strong>: 얇은 원단이면 안감 사용 여부와 안감 길이를 정하고, 흰색·밝은 색이면 비침을 샘플에서 반드시 확인합니다.",
      "<strong>총장 기준점</strong>: 원피스는 총장이 길어 기준점(어깨 끝점, 목 뒤 중심 등)이 다르면 몇 cm씩 차이 납니다. 재는 위치를 치수표의 ‘측정 방법’ 칸에 적어 두세요." ],
    fabricIntro: "원피스에 많이 쓰는 원단입니다.",
    faq: [["원피스 작업지시서에는 어떤 치수를 적나요?", "{PARTS}입니다. 허리선 위치나 슬릿(트임) 길이처럼 디자인에 따라 필요한 치수는 행을 더해 적으세요."],
      ["셔츠 원피스는 셔츠 양식과 원피스 양식 중 어느 걸 쓰나요?", "원피스 양식에 칼라·커프스 둘레와 단추 사양을 더해서 쓰면 됩니다. 작지 도구에서 소분류를 ‘셔츠 원피스’로 고르면 칼라와 앞 단추 도식화가 들어갑니다."],
      ["원피스에는 케어라벨 혼용률을 어떻게 적나요?", "겉감과 안감의 혼용률을 구분해 적어야 합니다. 안감이 있는 원피스는 추가 원단 줄을 이용하면 케어라벨 기본값에 안감 혼용률이 반영됩니다."]],
    related: ["skirt", "shirt", "top-short"] },
};
const ORDER = Object.keys(ITEMS);

/* ---------------------------------------------------------------- 도구에서 읽기 + 미리보기 이미지 */
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: process.env.CI ? ["--no-sandbox"] : [] });
const imgDir = path.join(root, "assets/forms"); fs.mkdirSync(imgDir, { recursive: true });
const BLANK = ["fBrand", "fStyle", "fSeason", "fDate", "fQty", "fDue", "fDesigner", "fFactory", "fColor", "fRound"];
async function readAll(sheetLang, shoot) {
  const page = await browser.newPage(); await page.setViewport({ width: 1400, height: 1000 });
  await page.evaluateOnNewDocument((sl) => { try { localStorage.clear(); localStorage.setItem("jakji_lang", "ko"); localStorage.setItem("jakji_sheetlang", sl); } catch (e) {} }, sheetLang);
  await page.goto(APP + "?lang=ko", { waitUntil: "networkidle0" });
  if (sheetLang === "en") await page.waitForFunction(() => window.SHEET_LANG === "en" && window.I18N, { timeout: 20000 });
  const out = {}; let styled = false;
  for (const [slug, it] of Object.entries(ITEMS)) {
    out[slug] = {};
    for (const g of ["m", "w"]) {
      out[slug][g] = await page.evaluate(async (tpl, g, BLANK) => {
        document.getElementById(g === "m" ? "gM" : "gF").click();
        const s = document.getElementById("oTemplate"); s.value = tpl; s.dispatchEvent(new Event("change", { bubbles: true })); applyTemplateDefaults(); renderAll(); renderContent();
        for (const id of BLANK) document.getElementById(id).textContent = "";
        state.swatches = []; state.photo = null; renderSwatches(); renderSheetPhoto();
        await new Promise((r) => setTimeout(r, 400)); window.I18N?.flush?.();
        const cells = (tr) => [...tr.children].map((c) => c.textContent.replace(/\s+/g, " ").trim());
        return { rows: [...document.querySelectorAll("#specTable tr")].map(cells), trims: [...document.querySelectorAll("#trimTable tbody tr")].map(cells).filter((r) => r[1]),
          sew: [...document.querySelectorAll("#sewList li")].map((li) => li.textContent.trim()).filter(Boolean), notes: [...document.querySelectorAll("#noteList li")].map((li) => li.textContent.trim()).filter(Boolean),
          fabrics: FABRICS.filter((f) => f[4].includes(tpl)).map((f) => [f[0], f[2], f[3]]), styles: Object.values(STYLES).filter((x) => x.template === tpl).map((x) => x.name) };
      }, it.tpl, g, BLANK);
      if (shoot && g === "m") {
        if (!styled) { await page.addStyleTag({ content: "[data-noexport], .pg-note { display: none !important; }" }); styled = true; }
        const el = await page.$("#sheet"); const box = await el.boundingBox();
        await el.screenshot({ path: path.join(imgDir, `${slug}.webp`), type: "webp", quality: 80 });
        out[slug].img = { w: Math.round(box.width), h: Math.round(box.height) };
      }
    }
  }
  await page.close(); return out;
}
const KO = await readAll("ko", true);
const EN = await readAll("en", false);
await browser.close();

/* ---------------------------------------------------------------- 공통 조각 */
const koIdx = fs.readFileSync(path.join(root, "form.html"), "utf8");
const koHeader = (h1, lead) => koIdx.slice(koIdx.indexOf("<header"), koIdx.indexOf('<div class="wrap page-head">')) + `<div class="wrap page-head">\n    <h1>${e(h1)}</h1>\n    <p>${e(lead)}</p>\n  </div>\n</header>\n`;
const koFooter = koIdx.slice(koIdx.indexOf('<footer class="mat foot">'), koIdx.indexOf("<script>\n/* 양식 내려받기"));
const dlScript = koIdx.slice(koIdx.indexOf("<script>\n/* 양식 내려받기"), koIdx.indexOf("</body>"));
const enAbout = fs.readFileSync(path.join(root, "en/about.html"), "utf8");
const readMin = (html) => Math.max(2, Math.ceil((html.replace(/<[^>]+>/g, "").match(/[가-힣]/g) || []).length / 450));
const headBlock = (title, desc, rel = "") => `<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${e(title)}</title>
<meta name="description" content="${e(desc)}" />
<meta name="theme-color" content="#fbf8f2" />
<link rel="icon" href="${rel}assets/favicon.svg" type="image/svg+xml" />
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
<link rel="stylesheet" href="${rel}assets/site.css" />
<!-- SITE:HEAD-START -->
<!-- SITE:HEAD-END -->
`;
const ld = (obj) => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>\n</head>\n`;
/* 내려받기 링크: en=영문 파일(-en.xlsx)인지, label=버튼 글자 언어, up=페이지가 en/ 안에 있어 ../가 필요한지 */
const dlBtn = (slug, g, { en = false, label = "ko", up = false } = {}) => `<a class="dl" href="${up ? "../" : ""}assets/templates/techpack-${slug}-${g}${en ? "-en" : ""}.xlsx" download data-tpl>${g === "m" ? (label === "en" ? "Men (80–110)" : "남성 사이즈 (80~110)") : (label === "en" ? "Women (44–88)" : "여성 사이즈 (44~88)")}</a>`;
const sizeHead = (rows) => rows[0];
const specTable = (rows) => `<div class="table-scroll"><table><thead><tr>${rows[0].map((c) => `<th>${e(c)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map((r) => `<tr>${r.map((c, i) => (i === 1 ? `<th scope="row">${e(c)}</th>` : `<td>${e(c)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
const parts = (rows) => rows.slice(1).map((r) => r[1]);
const joinKo = (a) => a.join(", ");

/* ---------------------------------------------------------------- 품목별 페이지 */
for (const slug of ORDER) {
  const it = ITEMS[slug], d = KO[slug], m = d.m, w = d.w;
  const partNames = parts(m.rows), n = partNames.length;
  const faqHtml = it.faq.map(([q, a]) => [q, a.replace("{PARTS}", `${n}곳(${joinKo(partNames)})`)]);
  const related = it.related.map((r) => `<li><a href="${ITEMS[r].file}">${e(ITEMS[r].name)} 작업지시서 양식</a></li>`).join("");
  const trimRows = m.trims.map((r) => `<tr><td>${e(r[1])}</td><td>${e(r[2] || "—")}</td></tr>`).join("");
  const fabRows = m.fabrics.map((f) => `<tr><td>${e(f[0])}</td><td>${e(f[1])}</td><td>${e(f[2])}</td></tr>`).join("");
  const inch = ["pants", "shorts", "skirt"].includes(slug);
  const body = `
<main class="article">
  <nav aria-label="현재 위치" style="font-size:13px;margin:0 0 6px"><a href="./">홈</a> › <a href="form.html">양식 다운로드</a> › ${e(it.name)}</nav>
  <p class="updated">최종 수정 ${TODAY} · 읽는 시간 약 {MIN}분</p>

  <h2 id="download">${e(it.short)} 양식 내려받기</h2>
  <p>${e(it.lead)}</p>
  <div class="table-scroll">
  <table class="dl-table">
    <thead><tr><th>사이즈 체계</th><th>엑셀 파일 (.xlsx)</th></tr></thead>
    <tbody>
      <tr><th>남성 사이즈 (80~110)${inch ? "<br><small>허리 인치 호칭 함께 표기</small>" : ""}</th><td>${dlBtn(slug, "m")}</td></tr>
      <tr><th>여성 사이즈 (44~88)${inch ? "<br><small>허리 인치 호칭 함께 표기</small>" : ""}</th><td>${dlBtn(slug, "w")}</td></tr>
      <tr><th>영문 양식 (해외 공장용)</th><td>${dlBtn(slug, "m", { en: true }).replace("남성 사이즈 (80~110)", "남성 · 영문")}　${dlBtn(slug, "w", { en: true }).replace("여성 사이즈 (44~88)", "여성 · 영문")}</td></tr>
    </tbody>
  </table>
  </div>
  <div class="callout">양식에 들어 있는 치수는 레귤러핏 <strong>참고 표준값</strong>입니다. 샘플을 실측한 숫자로 반드시 고쳐서 공장에 보내세요.</div>
  <figure style="margin:18px 0"><img src="assets/forms/${slug}.webp" width="${d.img.w}" height="${d.img.h}" loading="lazy" style="max-width:100%;height:auto;border:1px solid var(--line);border-radius:12px" alt="${e(it.name)} 작업지시서 엑셀 양식 미리보기: 앞·뒤 도식화, 치수표, 원단·부자재, 봉제 사양" /><figcaption style="font-size:13px;color:var(--ink-soft);margin-top:6px">${e(it.name)} 양식의 첫 시트 미리보기입니다. 머리 정보 칸은 비어 있고, 도식화·치수·기본 부자재·봉제 사양이 채워져 있습니다.</figcaption></figure>

  <h2 id="points">${e(it.short)} 작업지시서에서 꼭 챙길 것</h2>
  <ul>
${it.points.map((p) => `    <li>${p}</li>`).join("\n")}
  </ul>

  <h2 id="spec">치수표 (양식에 들어 있는 기준값)</h2>
  <p>이 양식의 치수표는 <strong>${n}곳</strong>(${e(joinKo(partNames))})입니다. 기준(샘플) 사이즈는 100(남성)과 66(여성)이고, 단위는 cm이며 단면(납작하게 놓고 가로로 잰 길이) 기준입니다. ${m.rows[0].some((c) => /\(\d+\)/.test(c)) ? "허리 인치 호칭은 허리단면×2÷2.54에 맞춘 참고값입니다." : ""}</p>
  <h3>남성 사이즈 (80~110)</h3>
  ${specTable(m.rows)}
  <h3>여성 사이즈 (44~88)</h3>
  ${specTable(w.rows)}
  <p>‘측정 방법’ 칸은 어디에서 어디까지 재는지를 적은 것입니다. 공장과 재는 방법이 다르면 같은 숫자도 다른 옷이 됩니다. 일반적인 측정 위치는 <a href="guide.html#measure">치수 재는 법</a>에 정리했습니다.</p>

  <h2 id="trims">기본 부자재와 봉제 사양</h2>
  <div class="table-scroll"><table><thead><tr><th>부자재</th><th>기본 규격(예시)</th></tr></thead><tbody>${trimRows}</tbody></table></div>
  <p>양식에는 아래 봉제 사양이 예시로 들어 있습니다. 내 옷에 맞게 고쳐 쓰세요.</p>
  <ol>
${m.sew.map((s) => `    <li>${e(s)}</li>`).join("\n")}
  </ol>

  <h2 id="fabric">원단 예시</h2>
  <p>${e(it.fabricIntro)}</p>
  <div class="table-scroll"><table><thead><tr><th>원단</th><th>혼용률(예시)</th><th>중량·조직(예시)</th></tr></thead><tbody>${fabRows}</tbody></table></div>
  <p>실제 혼용률과 중량은 구입한 원단의 스와치 라벨이나 공급처 자료로 확인해서 적어야 합니다. 원단 선택은 <a href="learn-fabric.html">원단 고르는 법</a>, 요척과 원가는 <a href="learn-yield.html">요척과 원가 계산</a>을 참고하세요.</p>

  <h2 id="tool">엑셀 양식과 작지 도구</h2>
  <p>엑셀 양식은 직접 쓰기 편하지만, ${e(it.name)}의 <strong>소분류(${e(d.m.styles.join("·"))})</strong>와 디테일에 맞는 도식화를 바꾸려면 그림을 직접 편집해야 합니다. <a href="app.html">작지 도구</a>에서는 소분류와 디테일을 고르면 도식화와 치수표가 자동으로 채워지고, ‘엑셀로 저장’으로 내 옷 기준의 엑셀을 받을 수 있습니다.</p>

  <h2 id="faq">자주 묻는 질문</h2>
  <section class="faq">
${faqHtml.map(([q, a]) => `    <details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("\n")}
  </section>

  <h2 id="more">다른 품목 양식</h2>
  <ul>${related}<li><a href="form.html">전체 양식 목록 (9종 × 남·여)</a></li><li><a href="form-english.html">영문 작업지시서 양식 (해외 공장용)</a></li></ul>

  <div class="band" style="margin-top:40px">
    <div><h2 style="font-size:22px">내 옷에 맞는 도식화까지 한 번에</h2><p style="margin:6px 0 0;opacity:.85">소분류와 디테일을 고르면 도식화·치수표가 자동으로 채워집니다.</p></div>
    <a class="btn" href="app.html">무료로 도면 만들기</a>
  </div>
</main>

`;
  const html = `<!doctype html>\n<html lang="ko">\n` + headBlock(it.title, it.desc) + ld({ "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", name: it.h1, inLanguage: "ko", description: it.desc },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "홈", item: "https://jakji.app/" }, { "@type": "ListItem", position: 2, name: "양식 다운로드", item: "https://jakji.app/form.html" }, { "@type": "ListItem", position: 3, name: it.name, item: "https://jakji.app/" + it.file }] },
    { "@type": "FAQPage", mainEntity: faqHtml.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } ] })
    + "<body>\n" + koHeader(it.h1, it.desc) + body.replace("{MIN}", String(readMin(body))) + koFooter + dlScript + "</body>\n</html>\n";
  fs.writeFileSync(path.join(root, it.file), html);
}

/* ---------------------------------------------------------------- 영문 양식 (한국어 페이지 + 영어 페이지) */
const ENLIST = ORDER.map((slug) => ({ slug, ko: ITEMS[slug].name, en: { "top-short": "T-shirt (short sleeve)", "top-long": "Long sleeve tee / sweatshirt", shirt: "Shirt / blouse", hoodie: "Hoodie", jacket: "Jacket / blouson", pants: "Pants", shorts: "Shorts", skirt: "Skirt", dress: "Dress" }[slug] }));
const enRows = (slug, g) => EN[slug][g].rows;
/* 한국어 페이지: 영문 양식 + 용어 대응표 */
{
  const glossary = new Map();   // 측정 부위 한→영
  for (const slug of ORDER) { const k = KO[slug].m.rows.slice(1), en = enRows(slug, "m").slice(1); k.forEach((r, i) => { if (en[i] && !glossary.has(r[1])) glossary.set(r[1], [en[i][1], en[i][2], r[2]]); }); }
  const sewPairs = new Map();
  for (const slug of ORDER) KO[slug].m.sew.forEach((s, i) => { const en = EN[slug].m.sew[i]; if (en && !sewPairs.has(s)) sewPairs.set(s, en); });
  const dlRows = ENLIST.map((x) => `<tr><th>${e(x.ko)}<br><small>${e(x.en)}</small></th><td>${dlBtn(x.slug, "m", { en: true }).replace("남성 사이즈 (80~110)", "남성 · 영문")}</td><td>${dlBtn(x.slug, "w", { en: true }).replace("여성 사이즈 (44~88)", "여성 · 영문")}</td></tr>`).join("\n      ");
  const title = "작업지시서 영문 양식 (영어 엑셀) 무료 다운로드 | 작지", h1 = "작업지시서 영문 양식 무료 다운로드";
  const desc = "해외 공장용 영문 작업지시서(tech pack) 엑셀 양식 18종. 측정 부위·봉제 사양이 영어로 적혀 있고 사이즈는 XXS~XXL 호칭을 함께 씁니다. 무료.";
  const lead = "해외 공장이나 영어 소통이 필요한 거래처에 보내는 영문 작업지시서(tech pack) 엑셀 양식입니다. 도식화·치수표·원단·부자재·봉제 사양이 모두 영어로 적혀 있습니다.";
  const faq = [["영문 양식과 한국어 양식은 뭐가 다른가요?", "내용은 같고 글자만 영어입니다. 측정 부위(Point of measure), 측정 방법(How to measure), 부자재와 봉제 사양이 영어 표현으로 바뀌어 있고, 사이즈는 80~110 호칭 옆에 XXS~XXL 알파벳을 함께 적습니다."],
    ["영어와 한국어를 함께 적을 수는 없나요?", "작지 도구에서 ‘작업지시서 언어’를 ‘한·영 병기’로 고르면 한국어 아래에 영어가 함께 적힌 엑셀·PDF를 만들 수 있습니다. 양식 파일은 영어 전용입니다."],
    ["영문 번역이 정확한가요?", "봉제 현장에서 쓰는 표현을 기준으로 직접 번역했고 원어민 검수는 거치지 않았습니다. 중요한 계약이나 대형 거래에서는 거래처와 한 번 더 확인하세요."],
    ["치수는 그대로 보내도 되나요?", "안 됩니다. 한국어 양식과 마찬가지로 표준 참고 치수가 들어 있을 뿐이므로 샘플 실측값으로 고쳐서 보내야 합니다."]];
  const body = `
<main class="article">
  <nav aria-label="현재 위치" style="font-size:13px;margin:0 0 6px"><a href="./">홈</a> › <a href="form.html">양식 다운로드</a> › 영문 양식</nav>
  <p class="updated">최종 수정 ${TODAY} · 읽는 시간 약 {MIN}분</p>
  <h2 id="download">영문 양식 내려받기 (9종 × 남·여)</h2>
  <p>${e(lead)} 영문 도구 화면 없이도 쓸 수 있고, 한국어 양식과 같은 구성입니다. 해외 사이트에서 쓸 영어 설명은 <a href="en/form.html" hreflang="en" lang="en">English page</a>에 있습니다.</p>
  <div class="table-scroll">
  <table class="dl-table">
    <thead><tr><th>품목</th><th>남성 (80~110)</th><th>여성 (44~88)</th></tr></thead>
    <tbody>
      ${dlRows}
    </tbody>
  </table>
  </div>
  <div class="callout">치수는 레귤러핏 <strong>참고 표준값</strong>입니다. 샘플 실측으로 고쳐서 보내세요. 영문 번역은 원어민 검수를 거치지 않았습니다.</div>

  <h2 id="size">사이즈 호칭: 80~110은 알파벳으로?</h2>
  <p>한국 남성복 호칭 80~110은 해외 공장에서 알아보기 어려워서, 영문 양식에는 알파벳을 함께 적습니다(스파오 사이즈표 기준 대응: 남성 80=XXS, 85=XS, 90=S, 95=M, 100=L, 105=XL, 110=XXL). 여성 44~88은 44=XS부터 88=XL까지 대응시킵니다. 브랜드마다 대응이 달라서 영문 양식 위쪽에 사이즈 표를 두고 확인을 받는 것이 안전합니다.</p>

  <h2 id="glossary">측정 부위 한영 대응표</h2>
  <p>양식에 쓰인 측정 부위와 측정 방법의 영어 표현입니다. 공장과 용어를 맞출 때 쓰세요.</p>
  <div class="table-scroll"><table><thead><tr><th>측정 부위</th><th>Point of measure</th><th>측정 방법(한)</th><th>How to measure</th></tr></thead><tbody>
${[...glossary.entries()].map(([k, v]) => `    <tr><td>${e(k)}</td><td lang="en">${e(v[0])}</td><td>${e(v[2])}</td><td lang="en">${e(v[1])}</td></tr>`).join("\n")}
  </tbody></table></div>

  <h2 id="sewing">봉제 사양 한영 대응표</h2>
  <p>양식의 기본 봉제 사양 문장과 영어 표현입니다. 오버록, 2본침, 커버스티치 같은 용어는 해외 공장에서도 같은 말(overlock, 2-needle, coverstitch)로 통합니다.</p>
  <div class="table-scroll"><table><thead><tr><th>한국어</th><th>English</th></tr></thead><tbody>
${[...sewPairs.entries()].map(([k, v]) => `    <tr><td>${e(k)}</td><td lang="en">${e(v)}</td></tr>`).join("\n")}
  </tbody></table></div>

  <h2 id="faq">자주 묻는 질문</h2>
  <section class="faq">
${faq.map(([q, a]) => `    <details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("\n")}
  </section>

  <h2 id="more">품목별 한국어 양식</h2>
  <ul>${ORDER.map((s) => `<li><a href="${ITEMS[s].file}">${e(ITEMS[s].name)} 작업지시서 양식</a></li>`).join("")}</ul>

  <div class="band" style="margin-top:40px">
    <div><h2 style="font-size:22px">한·영 병기로 바로 만들기</h2><p style="margin:6px 0 0;opacity:.85">도구에서 ‘작업지시서 언어’를 고르면 한국어·영어·한영 병기 파일을 만들 수 있습니다.</p></div>
    <a class="btn" href="app.html">무료로 도면 만들기</a>
  </div>
</main>

`;
  const html = `<!doctype html>\n<html lang="ko">\n` + headBlock(title, desc) + ld({ "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", name: h1, inLanguage: "ko", description: desc },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "홈", item: "https://jakji.app/" }, { "@type": "ListItem", position: 2, name: "양식 다운로드", item: "https://jakji.app/form.html" }, { "@type": "ListItem", position: 3, name: "영문 양식", item: "https://jakji.app/form-english.html" }] },
    { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } ] })
    + "<body>\n" + koHeader(h1, desc) + body.replace("{MIN}", String(readMin(body))) + koFooter + dlScript + "</body>\n</html>\n";
  fs.writeFileSync(path.join(root, "form-english.html"), html);
}

/* 영어 페이지 */
{
  const enHeaderTop = enAbout.slice(enAbout.indexOf("<header"), enAbout.indexOf('<div class="wrap page-head">'));
  const enNav = enHeaderTop.replace(' aria-current="page"', "").replace('<a href="guide.html">How-to guide</a>', '<a href="form.html" aria-current="page">Templates</a><a href="guide.html">How-to guide</a>').replaceAll("../about.html", "../form.html");
  const enFooter = enAbout.slice(enAbout.indexOf('<footer class="mat foot">'), enAbout.indexOf("</body>")).replace('<a href="about.html">About</a>', '<a href="about.html">About</a><a href="form.html">Templates</a>').replaceAll("../about.html", "../form.html");
  const title = "Free Tech Pack Template (Excel) for Apparel | Jakji", h1 = "Free tech pack template (Excel) for apparel";
  const desc = "Free Excel tech pack templates for tees, shirts, hoodies, jackets, pants, shorts, skirts and dresses, with flat sketches, spec tables and sewing notes.";
  const lead = "Download a ready-to-edit apparel tech pack in Excel. Each file has front and back flat sketches, a size spec table, fabric and trims, sewing notes and cautions — in English, for overseas factories.";
  const faq = [["Is it really free? Can I use it for my brand?", "Yes. No sign-up is needed, and you can use the templates for your brand, school or workshop. Please don't use them to copy another company's product."],
    ["Are the measurements ready to send to a factory?", "No. They are regular-fit reference values only. Measure your own sample and replace the numbers, and add a tolerance (usually ±1cm), before sending."],
    ["What do the sizes 80–110 and 44–88 mean?", "They are Korean numeric sizes. The templates show the letter size next to each number (men: 80 = XXS, 85 = XS, 90 = S, 95 = M, 100 = L, 105 = XL, 110 = XXL; women: 44 = XS up to 88 = XL). Brands map them differently, so confirm the size chart with your factory."],
    ["Will these open outside Excel?", "Yes. The .xlsx files open in Excel, Google Sheets, Numbers, LibreOffice and Hancell."],
    ["Can I get the same sheet with my own flat sketch?", "Use the Jakji tool: pick the sub-category and details, and it fills the flat sketch and spec table, then exports to Excel, PDF or an English / bilingual sheet."]];
  const dlRows = ENLIST.map((x) => `<tr><th>${e(x.en)}</th><td>${dlBtn(x.slug, "m", { en: true, label: "en", up: true })}</td><td>${dlBtn(x.slug, "w", { en: true, label: "en", up: true })}</td></tr>`).join("\n      ");
  const poms = ENLIST.map((x) => `    <tr><th>${e(x.en)}</th><td>${e(parts(enRows(x.slug, "m")).join(", "))}</td></tr>`).join("\n");
  const body = `
<main class="article">
  <p class="updated">Last updated October 10, 2026 · 4 min read</p>
  <h2 id="download">1. Pick a garment and download</h2>
  <p>${e(lead)}</p>
  <div class="table-scroll">
  <table class="dl-table">
    <thead><tr><th>Garment</th><th>Men's sizing</th><th>Women's sizing</th></tr></thead>
    <tbody>
      ${dlRows}
    </tbody>
  </table>
  </div>
  <div class="callout">The measurements are regular-fit <strong>reference values</strong>. Replace them with your own sample's measurements before you send the file.</div>

  <h2 id="inside">2. What's inside</h2>
  <ul>
    <li><strong>Tech pack sheet</strong>: header fields (brand, style no., season, date, item, size, qty, due date, designer, factory, color, round), front and back flat sketches, fabric and trims tables, sewing spec and notes. It fits one landscape A4 page.</li>
    <li><strong>Size spec sheet</strong>: code (A, B, C…), point of measure, how to measure, measurements by size and the grade between sizes. The base (sample) size column is highlighted. Measurements are real number cells, so you can edit them or add formulas.</li>
  </ul>
  <p>Points of measure included in each template:</p>
  <div class="table-scroll"><table><thead><tr><th>Garment</th><th>Points of measure</th></tr></thead><tbody>
${poms}
  </tbody></table></div>

  <h2 id="how">3. How to use it</h2>
  <ol>
    <li>Download the template for your garment and size system.</li>
    <li>Fill in the brand, style number, due date, colors and quantities. Write "1st sample" or "Bulk" in the Round field so the factory doesn't mix up documents.</li>
    <li>Measure your sample and replace the numbers in the size spec. Add a tolerance (usually ±1cm).</li>
    <li>Enter the fabric name, composition, weight, trims (button size, zipper length) and consumption.</li>
    <li>Edit the sewing spec and notes, add a reference photo or logo next to the sketch, then send it as PDF or Excel.</li>
  </ol>

  <h2 id="sizes">4. About the sizes</h2>
  <p>The templates use Korean numeric sizes (men 80–110, women 44–88) with letter sizes next to them. For pants, shorts and skirts the waist in inches is shown too (for example, 100 = 32 inches). The mapping is a reference only: brands differ, so ask your factory to confirm the size chart.</p>

  <h2 id="tool">5. Template or tool?</h2>
  <div class="table-scroll"><table><thead><tr><th>Situation</th><th>Recommendation</th></tr></thead><tbody>
    <tr><td>One or two garments, and you prefer filling in Excel by hand</td><td>Use these templates as they are</td></tr>
    <tr><td>You need a flat sketch that matches details like collar or pocket style</td><td>Use the <a href="../app.html?lang=en">Jakji tool</a> and export to Excel</td></tr>
    <tr><td>You want measurements for every size from one base size</td><td>The tool (edit the base size and the others follow)</td></tr>
    <tr><td>You need a bilingual (Korean + English) sheet</td><td>The tool (choose the sheet language)</td></tr>
  </tbody></table></div>

  <h2 id="faq">Frequently asked questions</h2>
  <section class="faq">
${faq.map(([q, a]) => `    <details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join("\n")}
  </section>

  <div class="band" style="margin-top:40px">
    <div><h2 style="font-size:22px">Get a flat sketch that matches your design</h2><p style="margin:6px 0 0;opacity:.85">Pick the sub-category and details and the sketch and spec table fill themselves in.</p></div>
    <a class="btn" href="../app.html?lang=en">Make a tech pack for free</a>
  </div>
</main>

`;
  const dlScriptEn = dlScript.replace('f.src = "e/template.html"', 'f.src = "../e/template.html"');
  const html = `<!doctype html>\n<html lang="en">\n` + headBlock(title, desc, "../") + ld({ "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", name: h1, inLanguage: "en", description: desc },
    { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) } ] })
    + "<body>\n" + enNav + `<div class="wrap page-head">\n    <h1>${e(h1)}</h1>\n    <p>${e(desc)}</p>\n  </div>\n</header>\n` + body + enFooter + dlScriptEn + "</body>\n</html>\n";
  fs.writeFileSync(path.join(root, "en/form.html"), html);
}
console.log(`양식 안내 페이지 ${ORDER.length + 2}개 + 미리보기 이미지 ${ORDER.length}개`);
