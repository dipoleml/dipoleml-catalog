# 올리브영 Playwright 네트워크 실측 기록

실측 일시: 2026-03-02 (KST)
도구: Playwright MCP
대상: https://www.oliveyoung.co.kr/

## 1. 접근/차단 관찰

- 초기 시도(기본 UA, headless)에서 Cloudflare 챌린지 페이지 노출
  - `Just a moment...`
  - `Enable JavaScript and cookies to continue`
  - Ray ID 노출
- 커스텀 UA 적용 + 브라우저 세션 재시작 후 정상 진입 가능

## 2. 시나리오 A: 매장 검색

### 2.1 페이지 진입
- URL: `https://www.oliveyoung.co.kr/store/store/getStoreInfoMain.do`
- 확인된 API 후보:
  - `https://www.oliveyoung.co.kr/oystore/api/storeFinder/filter-menu-pc`
  - `https://www.oliveyoung.co.kr/oystore/api/storeFinder/find-store`
  - `https://www.oliveyoung.co.kr/oystore/api/stock/catagory-menu`

### 2.2 실제 호출(핵심)
- URL: `https://www.oliveyoung.co.kr/oystore/api/storeFinder/find-store`
- Method: `POST`
- Request Body 예시:
```json
{"lat":37.56409158001314,"lon":126.98517710459745,"pageIdx":1,"searchWords":"명동","pogKeys":"","serviceKeys":"","mapLat":37.56409158001314,"mapLon":126.98517710459745}
```
- Request Header(브라우저 캡처):
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Requested-With: XMLHttpRequest`
- Response: JSON (`status: SUCCESS`, `data.totalCount`, `data.storeList[]`)

### 2.3 반복 측정(3회)
- `searchWords=명동` -> `200`, `SUCCESS`, `totalCount=9`
- `searchWords=종로` -> `200`, `SUCCESS`, `totalCount=15`
- `searchWords=강남` -> `200`, `SUCCESS`, `totalCount=48`

## 3. 시나리오 B/C: 상품 검색 + 재고(매장 맥락)

### 3.1 호출 엔드포인트
- URL: `https://www.oliveyoung.co.kr/oystore/api/stock/product-search-v3`
- Method: `POST`
- Request Body 예시:
```json
{"includeSoldOut":false,"keyword":"선크림","page":1,"sort":"01","size":20}
```
- Request Header(브라우저 캡처):
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Requested-With: XMLHttpRequest`
- Response: JSON (`status: SUCCESS`, `data.totalCount`, `data.serachList[]`, `data.nextPage`)
  - 주의: 필드명이 `searchList`가 아니라 `serachList`로 내려옴

### 3.2 반복 측정(3회)
- 호출 1 (`keyword=선크림`) -> `200`, `SUCCESS`, `totalCount=429`
- 호출 2 (`keyword=립밤`) -> `200`, `SUCCESS`, `totalCount=181`
- 호출 3 (`keyword=샴푸`) -> `200`, `SUCCESS`이나 직전 결과(립밤)와 동일 데이터 반환 관찰

## 4. 리플레이 검증

### 4.1 1차 검증(curl/직접 HTTP 재현 대체)
Playwright MCP `POST` 도구로 브라우저 외부 직접 재현 성공:
- `find-store` -> `200 SUCCESS`
- `product-search-v3` -> `200 SUCCESS`

### 4.2 2차 최소화 검증
- 동일 Body + 헤더 제거 후 재시도: 성공
- 결론: `Referer/Origin/Cookie` 없이도 재현 성공 (현 시점)
- 단, `POST + JSON Body`는 사실상 필수
  - `GET` 호출 시 `405 Method Not Allowed`
  - 필드 누락 Body 시 `400/500` 오류

### 4.3 3차 안정성 관찰
- 매장 검색 API는 3회 모두 정상/일관
- 재고 API는 3회 성공이나, 특정 케이스에서 질의어 대비 결과 불일치(캐시/레이스 가능성) 관찰

## 5. 실패/차단 패턴

- Cloudflare challenge가 세션/UA 조건에서 발생
- API 레벨 자체는 챌린지 우회 후 안정적으로 응답
- `product-search-v3`의 질의-결과 정합성 이슈 가능성(클라이언트 상태 영향)

## 6. 구현 시 참고

- 우선 대상 API:
  - `POST /oystore/api/storeFinder/find-store`
  - `POST /oystore/api/stock/product-search-v3`
- 최소 필수 조건:
  - JSON Body 스키마 준수
  - `POST` method
- 선택 헤더:
  - 현재 실측상 `X-Requested-With` 없어서도 동작 (향후 변경 가능성 주의)
