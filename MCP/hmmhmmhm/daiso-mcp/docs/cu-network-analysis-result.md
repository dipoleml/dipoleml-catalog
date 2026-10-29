# CU 편의점 네트워크 분석 결과 (웹 + 앱 실측 통합)

최종 업데이트: 2026-03-08 (KST)

실측 이력:
- 2026-03-02: 웹 채널 실측 (Playwright MCP)
- 2026-03-08: iOS 앱 트래픽 실측 (mitmproxy)

대상:
- `https://cu.bgfretail.com/store/list.do?category=store`
- `https://www.pocketcu.co.kr/`
- 포켓CU iOS 앱 시나리오: 로그인 -> 점포 선택 -> 상품 검색 -> 재고조회

## 결론 요약

- 주변 매장 조회: `가능`
  - 웹: `POST /store/list_Ajax.do` 기반 즉시 구현 가능
  - 앱: `POST /api/store` 기반 좌표 중심 조회 가능
- 재고 조회: `가능`
  - 앱/웹 공통 도메인(`www.pocketcu.co.kr`)에서 재고 검색 API 실측 완료
- 구현 판정:
  - `cu_find_nearby_stores` 즉시 구현 가능
  - `cu_check_inventory` 즉시 구현 가능 (요청/응답 스키마 확인 완료)

## 1) 웹 채널 실측 결과 (2026-03-02)

### 확인된 API

- `POST /store/GugunList.do` (시/도 -> 구/군)
- `POST /store/DongList.do` (구/군 -> 동)
- `POST /store/list_Ajax.do` (매장 목록)

### 판정

- 웹 매장 탐색은 안정적으로 재현 가능
- 당시 기준으로는 재고 수량 API가 웹에서 보이지 않아 앱 실측 필요로 분류

## 2) 앱 트래픽 실측 결과 (2026-03-08)

실측 파일:
- `captures/cu-20260308/raw.mitm`
- `captures/cu-20260308/requests.jsonl`
- `captures/cu-20260308/summary.json`
- `captures/cu-20260308/requests-from-0234-kst.jsonl` (02:34 KST 이후 필터)

집계(02:34 KST 이후):
- 총 191건
- 상태코드: 200(190건), 302(1건)
- 호스트: `www.pocketcu.co.kr`(187건), `cloud.pocketcu.co.kr`(4건)

### A. 재고 화면 초기 데이터

- Endpoint: `POST /api/search/display/stock`
- 요청 body: `{}`
- 응답 키 예시:
  - `areaCateList`
  - `areaItemList`
  - `areaList`
  - `cuconList`
  - `productList`

### B. 재고 검색 핵심 API

- Endpoint: `POST /api/search/rest/stock/main`
- 샘플 요청:

```json
{
  "searchWord": "과자",
  "prevSearchWord": "두바이",
  "spellModifyUseYn": "Y",
  "offset": 0,
  "limit": 8,
  "searchSort": "recom"
}
```

- 응답 필드 예시:
  - `data.stockResult.result.total_count`
  - `rows[].fields.item_cd`
  - `rows[].fields.item_nm`
  - `rows[].fields.hyun_maega`
  - `rows[].fields.pickup_yn`
  - `rows[].fields.deliv_yn`
  - `rows[].fields.reserv_yn`

### C. 점포 조회 API (앱)

- Endpoint: `POST /api/store`
- 주요 입력:
  - `latVal`, `longVal`
  - `tabId`
  - `filterSvcList`
  - `itemCd`, `onItemNo` (상황별)
- 응답 필드 예시:
  - `totalCnt`
  - `storeList[].storeCd`
  - `storeList[].storeNm`

## 3) 재현성 검증 (curl)

2026-03-08 기준, 아래 API는 최소 헤더로 curl 재현 성공:

- `POST https://www.pocketcu.co.kr/api/search/display/stock`
- `POST https://www.pocketcu.co.kr/api/search/rest/stock/main`
- `POST https://www.pocketcu.co.kr/api/store`

공통 최소 헤더:
- `content-type: application/json`
- `x-requested-with: XMLHttpRequest`

상세 재현 명령은 `docs/cu-app-scraping-replay-guide.md` 참고.

## 4) 구현 권장안

### 즉시 구현

- `cu_find_nearby_stores`
  - 1순위: 웹 `list_Ajax.do` 파싱
  - 2순위: 앱 `api/store` 기반 좌표 조회

- `cu_check_inventory`
  - 흐름:
    1. `api/search/display/stock` 초기 데이터
    2. `api/search/rest/stock/main` 검색
    3. 필요 시 `item_cd` 기반 후속 상세 조회

### 주의사항

- 민감정보(`Cookie`, 토큰)는 저장/로그에서 마스킹 유지
- 앱 버전 변화로 파라미터가 변경될 수 있으므로, 배포 전 재실측 권장

## 5) 관련 문서

- `docs/mitmproxy-guide.md`
- `docs/cu-app-request-capture-guide.md`
- `docs/cu-app-scraping-replay-guide.md`
