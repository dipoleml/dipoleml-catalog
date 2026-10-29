# 메가박스 네트워크 분석 결과 (실측 기반)

작성일: 2026-03-03 (KST)  
실측 도구: Playwright MCP, curl  
대상:
- `https://www.megabox.co.kr/booking`
- `https://www.megabox.co.kr/on/oh/ohb/SimpleBooking/simpleBookingPage.do`
- `https://www.megabox.co.kr/on/oh/ohz/PcntSeatChoi/selectPcntSeatChoi.do`
- `https://www.megabox.co.kr/theater?brchNo=1372`

## 결론 요약

- 근처 영화관 조회: `가능` (극장 정보 API에서 주소 + 위경도 추출 가능)
- 상영중 영화/상영회차 목록: `가능` (`selectBokdList.do` 응답에 회차 필드 포함)
- 좌석 남은량(회차별): `가능` (`selectBokdList.do`의 `restSeatCnt`)
- 좌석 선점 가능 여부 체크: `조건부 가능`
  - `selectOccupSeat.do`는 `playSchdlNo` 단독 호출 실패
  - `seatOccupText` 포함 시 정상 응답 확인

---

## 1) Playwright 기준 동작 방식 이해

### A. 진입 구조

- `/booking` 본문에서 데이터가 바로 내려오지 않음
- 실제 예매 데이터는 iframe에서 동작
  - iframe URL: `/on/oh/ohb/SimpleBooking/simpleBookingPage.do`

### B. 사용자 동작별 호출 흐름

1. 영화 선택  
   -> `POST /on/oh/ohb/SimpleBooking/selectBokdList.do`

2. 극장 선택  
   -> `POST /on/oh/ohb/SimpleBooking/selectBrchBokdUnablePopup.do`  
   -> `POST /on/oh/ohb/SimpleBooking/selectBokdList.do`

3. 좌석 페이지 로딩  
   - 좌석 iframe: `/on/oh/ohz/PcntSeatChoi/selectPcntSeatChoi.do`
   - 좌석 조회: `POST /on/oh/ohz/PcntSeatChoi/selectSeatList.do`

4. 좌석 선택 후 다음 단계  
   - 좌석 페이지에서 `options` 생성 후 `parent.fn_goNextPagePcntSeatChoi(options)` 호출
   - parent에서 `POST /on/oh/ohb/BokdMain/selectOccupSeat.do` 호출

---

## 2) 핵심 엔드포인트 실측

### 2.1 `POST /on/oh/ohb/SimpleBooking/selectBokdList.do`

- 목적:
  - 영화/극장/날짜 조합 기반 상영목록 조회
  - 영화 목록, 극장 목록, 상영 회차, 잔여좌석 동시 수신
- 주요 요청 필드 예시:
  - `arrMovieNo`, `playDe`
  - `brchNoListCnt`, `brchNo1`, `areaCd1`, `spclbYn1`, `theabKindCd1`
  - `sellChnlCd` (`ONLINE`)
- 주요 응답 필드:
  - `areaBrchList[].brchNo`, `brchNm`
  - `movieList[].movieNo`, `movieNm`, `movieStatCdNm`
  - `movieFormList[].playSchdlNo`
  - `movieFormList[].playStartTime`, `playEndTime`
  - `movieFormList[].restSeatCnt`, `totSeatCnt`

### 2.2 `POST /on/oh/ohb/SimpleBooking/selectBrchBokdUnablePopup.do`

- 목적: 극장 선택 시 예매 가능/팝업 상태 확인
- 응답 예시:
  - `brchBokdUnablePopup.bokdAbleAt` (`Y`/`N`)

### 2.3 `POST /on/oh/ohz/PcntSeatChoi/selectSeatList.do`

- 목적: 특정 회차 좌석 맵/좌석 메타 조회
- 주요 응답:
  - `seatListSD01[].seatUniqNo`
  - `seatListSD01[].seatZoneCd`, `seatClassCd`
  - `seatTicketAmtList[].ticketKindCd` (예: `TKA`, `TKY`)
  - `seatTicketAmtList[].clsReclineAmt` 등 좌석등급별 요금

### 2.4 `POST /on/oh/ohb/BokdMain/selectOccupSeat.do`

- 목적: 좌석 선점 충돌(이미 판매 진행중 여부) 체크
- 중요 포인트:
  - `playSchdlNo`만 전달하면 실패(500)
  - `seatOccupText` 포함하면 정상 응답 가능

---

## 3) 리플레이 검증 결과

검증일: 2026-03-03 (KST)

### A. 상영/잔여좌석 조회 리플레이

- 요청:
  - `playDe=20260304`
  - `arrMovieNo=25104500`
  - `brchNo1=1372` (강남)
- 결과:
  - HTTP 200
  - 응답에서 `playSchdlNo` 37개, `restSeatCnt` 37개 확인
  - 회차별 시작/종료 시각 + 남은좌석 수집 가능

### B. 좌석 선점 체크 리플레이

1) 실패 케이스
- payload: `{"playSchdlNo":"2603041372011"}`
- 결과: HTTP 500, `"좌석 정보가 없습니다."`

2) 성공 케이스
- payload 예시:
```json
{
  "playSchdlNo": "2603041372011",
  "brchNo": "1372",
  "bokdCnt": 1,
  "seatOccupText": "00100201,TKA,17000,MBX,GERN_ZONE,RECLINE_CLS,1",
  "totalAmt": 17000,
  "entrpMbCd": "",
  "tkeYn": "N"
}
```
- 결과: HTTP 200, `resultMap.occupSeatAt = "N"`

---

## 4) 근처 영화관(위치 기반) 가능성

### 확인 근거

- `POST /on/oh/ohc/Brch/infoPage.do` HTML 내 길찾기 링크에 좌표 포함:
  - 예: `...map.naver.com...lng=127.0264086&lat=37.498214...`
- 동일 HTML에 도로명주소 포함

### 구현 메모

- `selectBokdList`의 `areaBrchList`에서 `brchNo`를 확보
- `infoPage.do`를 통해 극장별 좌표를 수집/캐싱
- 사용자 좌표와 하버사인 거리 계산으로 근접순 정렬

---

## 5) 구현 판정

### 즉시 구현 가능

- `megabox_find_nearby_theaters`
  - 데이터: `selectBokdList.do` + `infoPage.do`
- `megabox_list_now_showing`
  - 데이터: `selectBokdList.do` (`movieList`, `movieFormList`)
- `megabox_get_remaining_seats`
  - 데이터: `selectBokdList.do` (`movieFormList[].restSeatCnt`)

### 조건부 구현

- `megabox_check_seat_occupancy`
  - `seatOccupText`를 정확히 생성해야 함
  - 좌석맵(`selectSeatList`)과 요금/권종 매핑 로직 필요

---

## 6) 다음 실측/구현 권장 순서

1. `selectBokdList.do` 기반 도구 2종 우선 구현
   - 상영목록/잔여좌석
2. `infoPage.do` 좌표 캐시 설계 후 근처극장 도구 구현
3. 좌석 선점 체크는 별도 단계로 분리
   - `seatOccupText` 생성 유틸을 먼저 고정
   - 실패/재시도 케이스(이미 선점됨) 메시지 표준화
