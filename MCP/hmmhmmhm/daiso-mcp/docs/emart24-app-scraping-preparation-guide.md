# 이마트24 앱 스크래핑 준비 가이드 (mitmproxy 기반)

작성일: 2026-03-08 (KST)  
대상: iOS 이마트24 앱(패키지 정보: `kr.co.emart24.everse`)

## 1. 목적

이 문서는 이마트24 앱 트래픽을 실측해, 스크래핑 가능 데이터를 식별하기 위한
"캡처 준비 -> 수집 -> 1차 분석" 절차를 제공합니다.

핵심 산출물:

- `raw.mitm`: 원본 mitmproxy 플로우 파일
- `requests.jsonl`: 민감정보 마스킹된 요청/응답 레코드
- `summary.json`: 시나리오/건수 요약

## 2. 선행 문서

- 기본 MITM 세팅: `docs/mitmproxy-guide.md`
- 기존 CU 앱 캡처 레퍼런스: `docs/cu-app-request-capture-guide.md`
- 이마트24 웹 선행 분석: `docs/emart24-network-analysis-result.md`

## 3. 사전 준비

1. Mac/iPhone 동일 Wi-Fi 연결
2. iOS 프록시 수동 설정 및 mitm 인증서 신뢰 완료
3. `mitmproxy` 설치 확인
4. 이마트24 앱 최신 버전 설치 및 로그인 상태 준비
5. 캡처 시나리오 사전 정의

권장 시나리오:

- 앱 실행
- 점포 선택 또는 내 주변 매장 진입
- 상품 검색
- 예약픽업/오늘픽업/재고 표시 화면 진입
- 상품 상세에서 수량/재고 관련 텍스트 확인

## 4. 수집 명령

프로젝트 루트에서 아래를 실행합니다.

```bash
mkdir -p captures/emart24-20260308
mitmdump \
  --listen-host 0.0.0.0 \
  --listen-port 8080 \
  -s scripts/mitmproxy/emart24_capture_export.py \
  --set emart24_capture_dir=captures/emart24-20260308 \
  --set emart24_capture_scenario='앱 로그인 후 점포 선택, 상품 검색, 예약픽업 진입' \
  --set emart24_capture_hosts='emart24.co.kr,abr.ge' \
  -w captures/emart24-20260308/raw.mitm
```

수집 종료는 `Ctrl+C`로 합니다.

참고:

- 첫 캡처에서는 호스트 필터를 좁게 시작하고, 누락이 의심되면 확장합니다.
- 필요 시 `--set emart24_capture_hosts='emart24.co.kr,abr.ge,app-measurement.com,googleapis.com'`처럼 확대해 재수집합니다.

## 5. 생성 파일 설명

### A. requests.jsonl

- 한 줄당 1개 요청/응답 레코드(JSON)
- 포함 정보:
  - 요청: method, host, path, query, headers, body preview
  - 응답: statusCode, headers, body preview
- 기본 마스킹:
  - 헤더: `Authorization`, `Cookie`, `Set-Cookie`, 토큰 계열
  - 쿼리: `token`, `password`, `session`, `jwt` 계열

### B. summary.json

- 시나리오명
- 대상 호스트 목록
- 전체/매칭/스킵 건수
- 산출물 경로

### C. raw.mitm

- 원본 플로우 파일
- 필요 시 `mitmweb -r captures/emart24-20260308/raw.mitm`로 재열람

## 6. 1차 분석 명령

```bash
# 총 캡처 건수
wc -l captures/emart24-20260308/requests.jsonl

# 호스트 분포
jq -r '.request.host' captures/emart24-20260308/requests.jsonl | sort | uniq -c | sort -nr

# 경로 분포 상위
jq -r '.request.path' captures/emart24-20260308/requests.jsonl | sort | uniq -c | sort -nr | head -30

# 재고/매장/상품 관련 후보 빠르게 확인
rg -n 'stock|inventory|goods|product|pickup|store|매장|재고|상품' captures/emart24-20260308/requests.jsonl

# 상태코드 분포
jq -r '.response.statusCode // "NA"' captures/emart24-20260308/requests.jsonl | sort | uniq -c
```

## 7. 스크래핑 가능 데이터 판정 기준

### A. 즉시 구현 가능

- 비인증 또는 약한 인증으로 재현 가능한 매장/상품 API 식별
- 요청 최소조건(헤더/파라미터) 확인 완료
- 응답에 안정적인 식별 필드 존재

### B. 조건부 구현 가능

- 앱 토큰/세션 필요하지만 재현 가능
- 주기 갱신 토큰 처리 전략 필요

### C. 보류

- certificate pinning 또는 강한 기기결합으로 복호화/재현 불가
- 응답이 암호화되어 의미 필드 해석 불가

## 8. 실패 시 점검

1. HTTPS 요청이 거의 안 보임

- iOS 인증서 신뢰 설정 재확인
- 프록시 IP/포트 오타 확인

2. 앱 핵심 요청만 누락

- certificate pinning 가능성 점검
- Android 동일 시나리오 비교 캡처

3. 요청은 보이는데 의미 있는 데이터가 없음

- 시나리오를 더 구체화해 재수집(상품 상세, 장바구니, 픽업 확정 직전 단계)

## 9. 후속 문서화 규칙

실측 후 아래 순서로 문서를 업데이트합니다.

1. `docs/emart24-network-analysis-result.md`에 "앱 실측 섹션" 추가
2. 재현 가능한 엔드포인트를 `curl` 예시와 함께 기록
3. 구현 판정을 A/B/C로 업데이트
4. 필요 시 `docs/emart24-app-scraping-replay-guide.md` 신규 작성
