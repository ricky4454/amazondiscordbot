# Amazon Restock Discord Bot

아마존 상품 페이지를 주기적으로 확인해서 **품절 → 재입고** 상태 전환이 감지되면 디스코드 채널로 알림을 보내는 봇입니다.

## 기능

- 여러 Amazon 상품 URL 동시 감시
- 추적 파라미터가 붙은 Amazon URL을 `/dp/ASIN` 형태로 자동 정규화
- Discord 텍스트 채널로 재입고 알림 전송
- 시작 시 감시 대상/주기 안내 메시지 전송
- 단위 테스트 포함

## 주의사항

Amazon은 페이지 구조를 수시로 바꾸거나 봇 요청을 차단할 수 있습니다. 이 프로젝트는 HTML의 재고 관련 텍스트와 버튼 유무를 기반으로 동작하므로, 일부 상품에서는 셀렉터를 조정해야 할 수 있습니다.

## 빠른 시작

### 1) Discord Bot 생성

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 새 애플리케이션을 만듭니다.
2. **Bot** 메뉴에서 봇을 추가합니다.
3. Bot Token을 발급받아 `.env` 파일의 `DISCORD_TOKEN`에 넣습니다.
4. 봇을 서버에 초대하고 메시지 전송 권한이 있는 채널 ID를 `DISCORD_CHANNEL_ID`에 넣습니다.

### 2) 환경 변수 설정

```bash
cp .env.example .env
```

`AMAZON_PRODUCTS_JSON`은 다음처럼 설정합니다.

```json
[
  {
    "name": "Persona 5 Royal Joker Figure",
    "url": "https://www.amazon.com/dp/B0FY7XV4JY/?coliid=I1ICROY7VSIYFH&colid=468FUDFXB0QM&ref_=list_c_wl_lv_ov_lig_dp_it&th=1"
  }
]
```

봇은 위 URL을 자동으로 `https://www.amazon.com/dp/B0FY7XV4JY` 형태로 정규화해서 사용합니다.

### 3) 설치 및 실행

```bash
npm install
npm start
```

### 4) 테스트

```bash
npm test
```

## 환경 변수

- `DISCORD_TOKEN`: Discord 봇 토큰
- `DISCORD_CHANNEL_ID`: 알림을 받을 텍스트 채널 ID
- `AMAZON_PRODUCTS_JSON`: 감시할 상품 목록 JSON 배열
- `POLL_INTERVAL_MS`: 확인 주기(ms), 기본값 `300000` (5분)
- `REQUEST_TIMEOUT_MS`: Amazon 요청 타임아웃(ms), 기본값 `15000`
- `USER_AGENT`: Amazon 요청 시 사용할 User-Agent 문자열

## 동작 방식

1. 봇이 시작되면 Discord에 접속합니다.
2. 지정한 채널에 감시 시작 메시지를 보냅니다.
3. 각 상품 URL을 정규화한 뒤 페이지 재고 상태를 읽습니다.
4. 직전 상태가 품절이고 현재 상태가 재입고면 알림을 보냅니다.

## 실제 링크 테스트 메모

사용자가 제공한 `B0FY7XV4JY` 상품 링크를 기준으로 파서 회귀 테스트를 추가했습니다. 이 환경에서는 Amazon 직접 HTTP 요청이 프록시 정책상 `403 Forbidden`으로 차단되어, 실시간 네트워크 테스트는 제한되지만 페이지에 표시된 `Currently unavailable.` / `We don't know when or if this item will be back in stock.` 상태를 기준으로 테스트 케이스를 만들었습니다.

## 확장 아이디어

- slash command로 감시 상품 추가/삭제
- SQLite로 마지막 상태 영속화
- Keepa 또는 Amazon PA-API 연동으로 정확도 향상
- 역할 멘션(`@here`, 특정 role) 옵션 추가
