# Amazon Restock Discord Bot

아마존 상품 페이지를 주기적으로 확인해서 다음 두 가지를 디스코드로 알림 보내는 봇입니다.

1. **기존 상품 IN STOCK 상태 알림** (첫 감지/재입고 포함)
2. **브랜드 신규 상품 등록** (브랜드/검색 페이지에 처음 보이는 ASIN 감지)

## 기능

- 여러 Amazon 상품 URL 동시 IN STOCK 감시
- 여러 브랜드/검색 URL 동시 신규 상품 감시
- 추적 파라미터가 붙은 Amazon URL을 `/dp/ASIN` 형태로 자동 정규화
- Discord 텍스트 채널로 IN STOCK/신규상품 알림 전송
- 시작 시 감시 대상/주기 안내 메시지 전송
- Windows용 실행/설정 `.cmd` 스크립트 포함
- 단위 테스트 포함

## 주의사항

Amazon은 페이지 구조를 수시로 바꾸거나 봇 요청을 차단할 수 있습니다. 이 프로젝트는 HTML 파싱 기반이라 일부 페이지에서는 셀렉터/파서 조정이 필요할 수 있습니다.

## Windows에서 바로 쓰는 방법

### 1) Node.js 설치

- [nodejs.org](https://nodejs.org/)에서 **Node.js 20 이상**을 설치합니다.
- 설치 후 새 명령 프롬프트에서 `node -v`를 실행해 확인합니다.

### 2) Discord Bot 만들기

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 새 애플리케이션을 만듭니다.
2. **Bot** 메뉴에서 봇을 추가합니다.
3. Bot Token을 발급받아 복사합니다.
4. 봇을 본인 Discord 서버에 초대하고, 메시지를 보낼 텍스트 채널 ID를 확인합니다.

### 3) Windows 초기 설정

탐색기에서 아래 파일을 **더블클릭**합니다.

```text
windows\setup-windows.cmd
```

### 4) `.env` 입력 예시 (여러 링크 동시 감시)

```env
DISCORD_TOKEN=여기에_디스코드_봇_토큰
DISCORD_CHANNEL_ID=123456789012345678
AMAZON_PRODUCTS_JSON=[{"name":"PS5","url":"https://www.amazon.com/dp/B0CL61F39H"},{"name":"Nintendo Switch","url":"https://www.amazon.com/dp/B0BFJWCYTL"}]
AMAZON_BRAND_WATCH_JSON=[{"name":"Bandai New Toys","url":"https://www.amazon.com/s?k=bandai&i=toys-and-games&s=date-desc-rank","maxItems":30,"keywords":["joker","persona","figure"]},{"name":"LEGO New","url":"https://www.amazon.com/s?k=lego&i=toys-and-games&s=date-desc-rank","maxItems":20,"keywords":["technic","star wars"]}]
POLL_INTERVAL_MS=300000
REQUEST_TIMEOUT_MS=15000
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36
```

- `AMAZON_PRODUCTS_JSON`: IN STOCK 감시 목록
- `AMAZON_BRAND_WATCH_JSON`: 브랜드 신규상품 감시 목록
- `maxItems`: listing 페이지에서 상위 몇 개까지 비교할지(기본 30)
- `keywords`: 제목에 포함되어야 알림을 보내는 키워드 배열(비우면 신규상품 전체 알림)

### 5) 실행

```text
windows\start-windows.cmd
```

또는:

```bat
npm start
```

### 6) 점검만 다시 하고 싶을 때

```bat
npm run doctor
npm run doctor -- --skip-amazon
```

## 환경 변수

- `DISCORD_TOKEN`: Discord 봇 토큰
- `DISCORD_CHANNEL_ID`: 알림을 받을 텍스트 채널 ID
- `AMAZON_PRODUCTS_JSON`: IN STOCK 감시 상품 목록 JSON 배열 (필수)
- `AMAZON_BRAND_WATCH_JSON`: 브랜드 신규상품 감시 목록 JSON 배열 (선택)
- `POLL_INTERVAL_MS`: 확인 주기(ms), 기본값 `300000` (5분)
- `REQUEST_TIMEOUT_MS`: Amazon 요청 타임아웃(ms), 기본값 `15000`
- `USER_AGENT`: Amazon 요청 시 사용할 User-Agent 문자열

## 동작 방식

1. 봇이 시작되면 Discord에 접속합니다.
2. 시작 메시지로 상품 감시 개수/브랜드 감시 개수를 표시합니다.
3. 상품 감시는 각 상품 URL의 상태를 확인하고, IN STOCK일 때마다 알림을 보냅니다(품절→재입고는 재입고 알림).
4. 브랜드 감시는 listing URL에서 ASIN 목록을 파싱합니다.
5. 기존에 없던 ASIN 중에서 키워드 조건(`keywords`)에 맞는 항목만 신규상품 알림을 보냅니다.

## 문제 해결

- `401 Unauthorized`: `DISCORD_TOKEN` 문제 가능성이 큽니다.
- `403 Forbidden`: 봇 권한(채널 보기/메시지 전송) 확인.
- `404 Not Found`: `DISCORD_CHANNEL_ID` 확인.
- 네트워크 제한 환경이면 `npm run doctor -- --skip-amazon`으로 Discord만 먼저 검증.


## 추천 UX: 감시 항목 관리 CLI

`.env`의 긴 JSON을 직접 수정하지 않고, 아래 명령으로 감시 항목을 관리할 수 있습니다.

```bash
npm run watch:list
npm run watch:add:product -- "PS5 Slim" "https://www.amazon.com/dp/B0CL61F39H"
npm run watch:add:brand -- "Bandai New Toys" "https://www.amazon.com/s?k=bandai&i=toys-and-games&s=date-desc-rank" "joker,figure" 30
npm run watch:remove -- "https://www.amazon.com/dp/B0CL61F39H"
```

- 저장 파일: `watch-config.json` (기본)
- 경로 변경: `WATCH_CONFIG_PATH` 환경변수 사용
- `watch-config.json`이 있으면 해당 설정을 우선 사용
