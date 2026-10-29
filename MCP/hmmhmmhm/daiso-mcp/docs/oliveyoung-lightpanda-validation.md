# 올리브영 x Lightpanda 검증 기록

작성일: 2026-03-03 (KST)

## 목적
- `https://github.com/lightpanda-io/browser` 기반으로 올리브영 데이터 수집이 가능한지 실측 검증
- 대상 API:
  - `POST /oystore/api/storeFinder/find-store`
  - `POST /oystore/api/stock/product-search-v3`

## 검증 환경
- OS: macOS (Darwin arm64)
- Node.js: v25.2.1
- 패키지:
  - `@lightpanda/browser@1.1.0`
  - `playwright@1.58.2`

## 검증 방법
1. `@lightpanda/browser` 설치 후 CDP 서버 실행
2. Playwright `connectOverCDP`로 Lightpanda 제어
3. 올리브영 메인 접속 후 챌린지 페이지 여부 확인
4. 브라우저 컨텍스트에서 API 2종 직접 호출
5. 동일 시나리오 3회 반복
6. `lightpanda.fetch()` 단독 호출 결과도 확인

## 실행 명령
- `node /tmp/lightpanda-test/test-oliveyoung-loop.mjs`
- `node -e "import('@lightpanda/browser')...lightpanda.fetch('https://www.oliveyoung.co.kr/')..."`

## 결과 요약

### 1) CDP + Playwright 반복 3회
- 3회 모두 동일 결과
- `navigator.userAgent`: `Lightpanda/1.0`
- 본문에 아래 차단 문구 확인:
  - `Just a moment...`
  - `Enable JavaScript and cookies to continue`
  - `Browser not supported`
  - `안전하고 원활한 올리브영 이용을 위해 접속 정보를 확인 중`
- API 호출 결과:
  - `find-store`: HTTP `403`
  - `product-search-v3`: HTTP `403`

### 2) `lightpanda.fetch()` 단독 호출
- 챌린지/차단 키워드 모두 포함 확인
- 정상 서비스 페이지가 아닌 보안 검증 페이지 반환

## 추가 관찰
- Lightpanda CDP + Playwright 조합에서 컨텍스트 확장 시 `Duplicate target` 오류가 간헐적으로 발생
- 현재 패키지 옵션만으로는 UA를 Chrome 계열로 안정적으로 위장/전환하기 어려움

## 판정
- **현 시점 판정: Lightpanda 단독으로 올리브영 데이터 수집은 사실상 불가**
- 근거:
  - 초기 진입에서 보안 검증/브라우저 미지원 페이지로 고정
  - 핵심 API 2종이 반복적으로 `403` 반환

## 권장 방향
- 올리브영 수집은 기존 실측 성공 경로(Playwright + 일반 Chromium 세션) 유지
- Lightpanda는 올리브영이 아닌, 차단 정책이 약한 대상에서만 후보로 검토
