/**
 * 서비스 프로바이더 인터페이스
 *
 * 모든 서비스(다이소, CU, CGV 등)가 구현해야 하는 계약입니다.
 */

import type { ServiceMetadata, ToolRegistration } from './types.js';

/**
 * 서비스 프로바이더 인터페이스
 *
 * 새로운 서비스를 추가하려면 이 인터페이스를 구현하세요.
 *
 * @example
 * ```typescript
 * class DaisoService implements ServiceProvider {
 *   readonly metadata = { id: 'daiso', name: '다이소', version: '1.0.0' };
 *
 *   getTools(): ToolRegistration[] {
 *     return [
 *       { name: 'daiso_search_products', ... },
 *       { name: 'daiso_find_stores', ... },
 *     ];
 *   }
 * }
 * ```
 */
export interface ServiceProvider {
  /** 서비스 메타데이터 (읽기 전용) */
  readonly metadata: ServiceMetadata;

  /**
   * 서비스가 제공하는 도구 목록 반환
   * 각 도구의 name은 서비스 ID 접두사를 포함해야 합니다.
   * 예: daiso_search_products, cu_find_stores
   */
  getTools(): ToolRegistration[];

  /**
   * 서비스 초기화 (선택사항)
   * 서버 시작 시 한 번 호출됩니다.
   * 캐시 워밍, 연결 설정 등에 사용할 수 있습니다.
   */
  initialize?(): Promise<void>;

  /**
   * 서비스 종료 (선택사항)
   * 서버 종료 시 호출됩니다.
   * 연결 해제, 리소스 정리 등에 사용할 수 있습니다.
   */
  cleanup?(): Promise<void>;
}

/**
 * 서비스 팩토리 함수 타입
 * 서비스 인스턴스를 생성하는 함수
 */
export type ServiceFactory = () => ServiceProvider;
