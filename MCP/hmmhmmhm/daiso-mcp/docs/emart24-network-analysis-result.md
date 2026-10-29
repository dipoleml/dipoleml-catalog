# 이마트24 네트워크 분석 결과 (실측 기반)

작성일: 2026-03-03 (KST)  
실측 도구: `curl`, 정적 JS 분석  
대상:
- `https://emart24.co.kr/store`
- `https://emart24.co.kr/libs/FindStore.js`
- `https://emart24.co.kr/api1/area`
- `https://emart24.co.kr/api1/store`
- `https://emart24.co.kr/api1/goods`
- `https://emart24.co.kr/service/app`

## 결론 요약

- 주변 매장 조회: `가능` (웹 API 실측 성공)
- 재고 조회(매장 단위 수량): `웹 기준 미확인`
- 구현 판정:
  - `emart24_find_nearby_stores`는 즉시 구현 가능
  - `emart24_check_inventory`는 앱 트래픽 실측 전까지 보류

현재 프로젝트(`daiso`, `oliveyoung` 플러그인 구조) 기준으로는
`emart24` 서비스 프로바이더 추가 시 매장 기능은 바로 확장 가능하지만,
재고는 근거 API가 없어 "정확한 재고 도구"로 제공하기 어렵습니다.

## 1) 매장 조회 API 실측 결과

`/store` 페이지와 `FindStore.js`에서 아래 호출을 확인했습니다.

### A. 시/도/구군 조회

- Endpoint: `GET /api1/area`
- JS 근거:
  - `FindStore.js`: `_apiAct.area = _api.httpGetFunc('area')`
  - `getGunguInfo(payload)`에서 `AREA_SEQ` 전달
- 실측:
  - `GET /api1/area` -> `error:0`, `count:17` (시/도 목록)
  - `GET /api1/area?AREA_SEQ=11` -> `error:0`, `count:25` (서울 구/군 목록)

### B. 매장 목록 조회

- Endpoint: `GET /api1/store`
- JS 근거:
  - `FindStore.js`: `_apiAct.store = _api.httpGetFunc('store')`
  - `displayPlaces()`에서 `page/search/AREA1/AREA2/SVR_*` 등 전송
- 실측:
  - `GET /api1/store?page=1` -> `error:0`, `count:5669`
  - `GET /api1/store?page=1&search=강남` -> `error:0`, `count:71`
  - `GET /api1/store?page=1&search=강남&SVR_24=1` -> `error:0`, `count:12`
  - `GET /api1/store?page=1&AREA1=서울특별시&AREA2=강남구` -> `error:0`, `count:58`

## 2) 응답 필드 (실측)

`/api1/store` 응답 `data[]`에서 확인한 주요 필드:

- 점포 식별: `CODE`, `TITLE`
- 위치/주소: `LATITUDE`, `LONGITUDE`, `ADDRESS`, `ADDRESS_DE`
- 연락처: `PHONE`
- 운영정보: `START_HHMM`, `END_HHMM`, `OPEN_DATE`, `END_DATE`
- 서비스 플래그:
  - `SVR_24`, `SVR_AUTO`, `SVR_PARCEL`, `SVR_ATM`, `SVR_WINE`,
  - `SVR_COFFEE`, `SVR_SMOOTH`, `SVR_APPLE`, `SVR_TOTO`,
  - `SVR_PICKUP`, `NBR_LICS_YN`, `USE_YN`
- 응답 메타: `error`, `count`, `data`

거리 계산에 필요한 위경도(`LATITUDE`, `LONGITUDE`)가 포함되어
`find_nearby_stores` 구현에 충분합니다.

## 3) 요청 파라미터 동작 메모

`FindStore.js`의 `reqData` 기준 주요 파라미터:

- 기본: `page`, `search`, `AREA1`, `AREA2`
- 서비스 필터: `SVR_24`, `SVR_AUTO`, `SVR_PARCEL`, `SVR_ATM`, `SVR_WINE`,
  `SVR_COFFEE`, `SVR_SMOOTH`, `SVR_APPLE`, `SVR_TOTO`, `NBR_LICS_YN`, `USE_YN`
- 지도 경계: `top`, `bottom`, `left`, `right`

실측 참고:
- `top/bottom/left/right`만 전달한 샘플 요청은 `{"error":1,"count":0}` 반환.
- 따라서 초기에 MCP 구현은 `search/area/service` 중심으로 시작하고,
  경계 파라미터는 브라우저 동작과 동일한 조건에서 추가 검증이 필요합니다.

## 4) 재고 조회 실측 결과

### 웹 채널에서 확인한 상품 API

- Endpoint: `GET /api1/goods`
- 근거:
  - `libs/home.js`의 `loadGoods()`에서 `url: "/api1/goods"`
- 실측:
  - `GET /api1/goods` -> `error:0`, `count:2862`
  - `GET /api1/goods?page=1&search=도시락` -> `error:0`, `count:13`
  - `GET /api1/goods?category_seq=1&page=1` -> `error:0`, `count:2862`

응답 필드 예시:
- `CODE`, `TITLE`, `CATEGORY`, `KIND`, `PRICE_REAL`, `PRICE_ORIGIN`,
  `POST_START`, `POST_FINISH`, `BASE_CATEGORY_SEQ`, `CATEGORY_SEQ`

관측되지 않은 필드:
- 매장코드 연계 재고(`storeCode`, `inventoryQty`, `remainQty` 등)

### 앱 전용 기능 정황

- `https://emart24.co.kr/service/app`는 `예약픽업`, `오늘 픽업` 중심 안내 페이지
- 앱 다운로드 단축 링크(`https://abr.ge/0gnlrx`) 메타에 앱 정보 노출:
  - iOS `app_store_id=1636816705`
  - Android package `kr.co.emart24.everse`

판정:
- 매장 단위 재고는 웹 공개 API에서 확인되지 않음
- 재고는 앱 채널(인증/디바이스 컨텍스트) 기능일 가능성이 높음

## 5) 현재 프로젝트 적용 판정

### 즉시 가능 (A)

- `emart24_find_nearby_stores`
  - 데이터 소스: `/api1/area`, `/api1/store`
  - 구현 방식:
    - 지역/키워드/서비스 필터로 매장 조회
    - `LATITUDE/LONGITUDE` 기반 거리 계산 후 근접순 정렬
  - 기존 `oliveyoung_find_nearby_stores`와 유사 패턴으로 구현 가능

### 조건부/보류 (C)

- `emart24_check_inventory`
  - 현재 웹 실측 근거만으로는 "매장 재고 확인" 정의를 충족하지 못함
  - `/api1/goods`는 상품 카탈로그 성격이며 매장별 재고 필드가 없음

## 6) 구현 권장안 (단계형)

1. 1단계: `emart24_find_nearby_stores` 먼저 출시
2. 2단계: `emart24_search_products`(카탈로그 조회) 별도 도구로 분리
3. 3단계: 앱 트래픽 실측 후 `emart24_check_inventory` 구현 여부 재판정

주의:
- 2단계 도구를 "재고"로 표기하면 오해 소지가 있으므로
  명확히 "상품 목록/행사 정보"로 구분하는 것이 안전합니다.

## 7) 다음 실측 작업

1. Android/iOS `emart24` 앱에서 예약픽업/재고조회 시나리오 캡처
2. 앱 API 엔드포인트, 인증 헤더/토큰, 필수 파라미터 확인
3. 비로그인/로그인 상태별 재현성 비교
4. Cloudflare Worker 환경에서 재현 가능성(A/B/C) 재평가
