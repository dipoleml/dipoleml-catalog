/**
 * OpenAPI YAML 변환 유틸리티
 */

/**
 * JSON을 YAML로 변환 (간단한 구현)
 */
export function jsonToYaml(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);

  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'boolean' || typeof obj === 'number') {
    return String(obj);
  }

  if (typeof obj === 'string') {
    // 여러 줄 문자열 처리
    if (obj.includes('\n')) {
      const lines = obj.split('\n');
      return '|\n' + lines.map((line) => spaces + '  ' + line).join('\n');
    }

    // 특수 문자가 포함된 경우 따옴표로 감싸기
    if (
      obj.includes(':') ||
      obj.includes('#') ||
      obj.includes("'") ||
      obj.includes('"') ||
      obj.includes('\\')
    ) {
      return JSON.stringify(obj);
    }

    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }

    return obj.map((item) => `\n${spaces}- ${jsonToYaml(item, indent + 1).trimStart()}`).join('');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      return '{}';
    }

    return entries
      .map(([key, value]) => {
        const yamlValue = jsonToYaml(value, indent + 1);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `\n${spaces}${key}:${yamlValue}`;
        }
        if (Array.isArray(value)) {
          return `\n${spaces}${key}:${yamlValue}`;
        }
        return `\n${spaces}${key}: ${yamlValue}`;
      })
      .join('');
  }

  return String(obj);
}

// 테스트에서 YAML 변환 분기 검증을 위해 노출
export const __testOnlyJsonToYaml = jsonToYaml;
