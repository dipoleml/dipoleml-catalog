# CU 앱 요청 수집/전달 가이드 (mitmproxy 기반)

작성일: 2026-03-08 (KST)
대상: 포켓CU 앱 스크래핑 분석용 요청 전달

## 1. 목적

이 문서는 사용자가 포켓CU 앱 트래픽을 수집한 뒤, 분석자가 바로 재현 가능한 형태로 전달할 수 있게 구성한 절차입니다.

핵심 산출물:
- `raw.mitm`: 원본 mitmproxy 플로우 파일
- `requests.jsonl`: 민감정보 마스킹된 요청/응답 레코드
- `summary.json`: 시나리오/건수 요약

## 2. 사전 준비

1. Mac/iPhone 동일 Wi-Fi 연결
2. iOS 프록시 및 인증서 신뢰 설정 완료
3. `mitmproxy` 설치
4. 대상 시나리오 정의

권장 시나리오 예시:
- 로그인 상태에서 점포 선택
- 상품 검색
- 재고조회 버튼 실행

## 3. 수집 명령

프로젝트 루트에서 아래를 실행합니다.

```bash
mkdir -p captures/cu-20260308
mitmdump \
  --listen-host 0.0.0.0 \
  --listen-port 8080 \
  -s scripts/mitmproxy/cu_capture_export.py \
  --set cu_capture_dir=captures/cu-20260308 \
  --set cu_capture_scenario='로그인 후 강남구 점포에서 상품 재고조회' \
  --set cu_capture_hosts='cu.bgfretail.com,pocketcu.co.kr' \
  -w captures/cu-20260308/raw.mitm
```

수집이 끝나면 `Ctrl+C`로 종료합니다.

## 4. 생성 파일 설명

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
- 대상 호스트
- 전체/매칭/스킵 건수
- 산출물 경로

### C. raw.mitm

- 원본 플로우 파일
- 필요 시 분석자가 `mitmweb -r`로 재열람

## 5. 전달 패키지 구성

아래 파일만 전달하면 됩니다.

```text
captures/cu-20260308/
├── raw.mitm
├── requests.jsonl
└── summary.json
```

전달 전 확인:
- 개인정보(전화번호/주소/멤버십 번호)가 본문 preview에 남아 있지 않은지
- 테스트 계정 사용 여부

## 6. 분석자가 바로 쓰는 확인 명령

```bash
# 요청 개수 확인
wc -l captures/cu-20260308/requests.jsonl

# 재고 관련 경로 빠르게 탐색
rg -n 'stock|inventory|goods|product|재고' captures/cu-20260308/requests.jsonl

# HTTP 상태코드 분포 확인
jq -r '.response.statusCode // "NA"' captures/cu-20260308/requests.jsonl | sort | uniq -c
```

## 7. 실패 시 점검

1. HTTPS가 안 보임
- iOS 인증서 신뢰 설정 재확인

2. 트래픽이 거의 없음
- 앱 완전 종료 후 재실행
- 프록시 IP/포트 재확인

3. 특정 요청만 안 보임
- 앱 certificate pinning 가능성
- 동일 시나리오를 Android에서도 비교 수집

## 8. 기존 문서와의 연결

- 기본 MITM 세팅: `docs/mitmproxy-guide.md`
- CU 웹 실측 결과: `docs/cu-network-analysis-result.md`
- CU 스크래핑 재현: `docs/cu-app-scraping-replay-guide.md`

이 문서는 위 두 문서를 바탕으로, "분석 가능한 전달 포맷"까지 포함한 실행 가이드입니다.
