# mitmproxy 가이드 (iOS + macOS, HTTPS 포함)

작성일: 2026-03-08 (KST)  
대상: iOS 앱(예: 포켓CU) 트래픽 실측

## 1. 목적

이 문서는 macOS에서 `mitmproxy`를 사용해 iOS 앱 트래픽을 수집하고, HTTPS 요청/응답을 확인하는 방법을 설명합니다.

## 2. 사전 준비

- Mac과 iPhone이 같은 Wi-Fi 네트워크에 연결되어 있어야 합니다.
- macOS에 Homebrew가 설치되어 있어야 합니다.
- 분석 대상 앱이 최신 버전인지 확인합니다.

## 3. macOS에 mitmproxy 설치 및 실행

```bash
brew install --cask mitmproxy
mitmweb --listen-host 0.0.0.0 --listen-port 8080
```

- `mitmweb` 실행 후 브라우저 UI(기본 `http://127.0.0.1:8081`)에서 캡처 로그를 확인할 수 있습니다.
- Mac의 로컬 IP를 확인합니다.

```bash
ipconfig getifaddr en0
```

참고: 유선/다른 인터페이스 사용 시 IP 조회 명령을 환경에 맞게 조정하세요.

## 4. iOS에서 프록시 설정

1. iPhone에서 `설정 > Wi‑Fi > 현재 연결된 네트워크 > 프록시 구성`으로 이동합니다.
2. `수동` 선택 후 아래 입력:
- 서버: Mac의 로컬 IP (예: `192.168.0.10`)
- 포트: `8080`
3. 저장 후 Safari에서 `http://mitm.it` 접속
4. iOS용 인증서 프로파일을 설치
5. `설정 > 일반 > 정보 > 인증서 신뢰 설정`에서 mitmproxy 인증서를 신뢰로 활성화

주의: 5단계를 하지 않으면 HTTPS 복호화가 정상 동작하지 않습니다.

## 5. 앱 기반 트래픽 수집 절차

다음 순서로 수집하면 재현성이 높습니다.

1. `mitmweb` 실행 상태 확인
2. iOS 프록시/인증서 신뢰 상태 확인
3. 대상 앱 완전 종료 후 재실행
4. 앱 내 실제 사용자 시나리오 수행
- 예: 포켓CU에서 점포 선택 -> 상품 검색 -> 재고 조회 버튼 실행
5. `mitmweb`에서 도메인/경로 기준으로 요청 필터링
6. 핵심 요청을 저장
- URL, Method, Headers(민감정보 마스킹), Body, Response 샘플

권장 필터 예시:

- `~u cu.bgfretail.com`
- `~m POST`
- `~u inventory|stock|product|store`

## 6. 캡처 데이터 저장 방법

### A. mitmproxy 흐름 파일 저장

```bash
mitmdump -w cu-ios-capture-20260308.mitm
```

수집 후 `Ctrl+C`로 종료하면 파일이 저장됩니다.

### B. 저장 파일 다시 열기

```bash
mitmweb -r cu-ios-capture-20260308.mitm
```

## 7. 분석 시 체크리스트

- 재고 API 후보 URL/경로가 식별되는가?
- 필수 헤더(`Authorization`, 앱 버전, 디바이스 식별값 등)가 있는가?
- 로그인/비로그인 상태에서 응답 차이가 있는가?
- 점포 코드/상품 코드/수량 필드가 응답에 존재하는가?
- Cloudflare Worker에서 재현 가능한 요청 구조인가?

## 8. 자주 발생하는 실패 원인

### 1) HTTPS 요청이 안 보이거나 TLS 에러 발생

- iOS 인증서 신뢰 설정이 누락되었을 가능성이 큽니다.
- 프록시 IP/포트 설정 오타 여부를 확인하세요.

### 2) 특정 앱 요청만 복호화되지 않음

- 앱이 `certificate pinning`을 사용하는 경우가 많습니다.
- 이 경우 일반 MITM 프록시만으로는 복호화가 제한될 수 있습니다.

### 3) 요청 자체가 거의 안 보임

- 앱이 프록시 우회 경로 또는 비표준 네트워크 스택을 쓸 수 있습니다.
- 앱 재설치/재로그인 후 시나리오를 다시 수행해 비교하세요.

## 9. 보안 및 운영 주의사항

- 개인 계정 토큰, 전화번호, 주소 등 민감정보는 문서화 시 반드시 마스킹하세요.
- 실사용 계정 대신 테스트 계정 사용을 권장합니다.
- 사내/공용망 정책에 따라 트래픽 캡처가 제한될 수 있으니 정책을 확인하세요.

## 10. CU 재고 분석에 바로 적용하는 최소 실행안

1. `mitmweb` 실행
2. iOS 프록시 + 인증서 신뢰 완료
3. 포켓CU에서 `점포 선택 -> 상품 검색 -> 재고 조회` 수행
4. `cu.bgfretail.com` 또는 앱 API 도메인 요청 추출
5. 재고 관련 엔드포인트/헤더/파라미터를 `docs/cu-network-analysis-result.md`에 후속 기록

## 11. 전달 가능한 산출물 자동 생성

앱 트래픽을 분석자에게 바로 전달하려면 아래 문서를 사용하세요.

- `docs/cu-app-request-capture-guide.md`

위 문서에는 `mitmdump` 실행 명령과 함께, 아래 산출물을 자동 생성하는 방법이 포함되어 있습니다.

- `raw.mitm` (원본)
- `requests.jsonl` (마스킹된 요청/응답)
- `summary.json` (건수/시나리오 요약)
