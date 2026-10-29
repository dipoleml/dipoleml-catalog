# CU 앱 스크래핑 재현 가이드 (실측 기반)

작성일: 2026-03-08 (KST)
기준 캡처: `captures/cu-20260308/requests-from-0234-kst.jsonl`

## 1. 목적

이 문서는 포켓CU 앱 트래픽 실측 결과를 바탕으로,
재고/점포 조회를 로컬에서 재현하는 최소 절차를 제공합니다.

## 2. 핵심 엔드포인트

- 재고 화면 데이터: `POST /api/search/display/stock`
- 재고 검색: `POST /api/search/rest/stock/main`
- 점포 조회: `POST /api/store`

베이스 URL:
- `https://www.pocketcu.co.kr`

## 3. 공통 요청 조건

최소 헤더:
- `content-type: application/json`
- `x-requested-with: XMLHttpRequest`

권장:
- 브라우저 세션/쿠키 없이도 2026-03-08 실측 기준 응답 확인됨
- 다만 차단 정책 변경에 대비해 실패 시 최신 캡처로 헤더 재검증 필요

## 4. 재현 명령

### A. 재고 화면 초기 데이터

```bash
curl -sS 'https://www.pocketcu.co.kr/api/search/display/stock' \
  -H 'content-type: application/json' \
  -H 'x-requested-with: XMLHttpRequest' \
  --data '{}' \
  | jq '{keys: keys}'
```

기대 결과:
- `areaCateList`, `areaItemList`, `areaList`, `cuconList`, `productList` 포함

### B. 재고 검색

```bash
curl -sS 'https://www.pocketcu.co.kr/api/search/rest/stock/main' \
  -H 'content-type: application/json' \
  -H 'x-requested-with: XMLHttpRequest' \
  --data '{
    "searchWord":"과자",
    "prevSearchWord":"두바이",
    "spellModifyUseYn":"Y",
    "offset":0,
    "limit":8,
    "searchSort":"recom"
  }' \
  | jq '{
      spellModifyYn,
      total: .data.stockResult.result.total_count,
      first: .data.stockResult.result.rows[0].fields
      | {item_cd,item_nm,hyun_maega,pickup_yn,deliv_yn,reserv_yn}
    }'
```

기대 결과:
- `total` 양수
- `first.item_cd`, `first.item_nm` 존재

### C. 좌표 기반 점포 조회

```bash
curl -sS 'https://www.pocketcu.co.kr/api/store' \
  -H 'content-type: application/json' \
  -H 'x-requested-with: XMLHttpRequest' \
  --data '{
    "latVal":"37.3206029",
    "longVal":"126.8374892",
    "baseLatVal":"37.3206029",
    "baseLongVal":"126.8374892",
    "items":"",
    "jipCd":"",
    "voucher_cd":"",
    "exPin":"",
    "custId":"",
    "isRecommend":"",
    "recommendId":"",
    "pageType":"search_improve",
    "item_cd":"",
    "storeCd":"",
    "isCoupon":"",
    "firstRowNum":"",
    "tabId":"2",
    "filterSvcList":[],
    "filterAdtList":[],
    "stockCdcYn":"N",
    "alcProdYn":"",
    "searchStock":false,
    "pickupType":"change",
    "getRoute":"IOS",
    "areaTplNo":"0",
    "itemCd":"",
    "onItemNo":"",
    "childMealPickUpYn":"N",
    "onlineType":"",
    "searchWord":"",
    "stockChkYn":"",
    "isCurrentSearch":"N"
  }' \
  | jq '{
      totalCnt,
      first: .storeList[0] | {storeCd,storeNm,storeTelNo}
    }'
```

기대 결과:
- `totalCnt` 양수
- `first.storeCd`, `first.storeNm` 존재

## 5. 분석/검증 명령

```bash
# 캡처 구간 요청 수
wc -l captures/cu-20260308/requests-from-0234-kst.jsonl

# 재고 관련 요청만 확인
jq -r 'select(.request.path|test("stock";"i")) | [.capturedAt,.request.method,.request.path] | @tsv' \
  captures/cu-20260308/requests-from-0234-kst.jsonl

# 경로별 빈도
jq -r '.request.path' captures/cu-20260308/requests-from-0234-kst.jsonl | sort | uniq -c | sort -nr | head
```

## 6. 실패 대응

1. `403/5xx` 또는 빈 응답
- 앱/웹 정책 변경 가능성. 최신 캡처로 파라미터 재동기화

2. DNS/연결 실패
- 실행 환경 네트워크 정책 확인(샌드박스/사내망)

3. 결과는 오는데 필드 누락
- `offset`, `limit`, `searchSort`, 검색어를 바꿔 재검증

## 7. 운영 권장

- 스크래퍼는 `display/stock` + `rest/stock/main` 조합으로 구성
- 응답 스키마 변화를 대비해 필드 접근에 방어 로직 적용
- 민감정보 마스킹 정책(`Authorization`, `Cookie`, 토큰류) 유지
