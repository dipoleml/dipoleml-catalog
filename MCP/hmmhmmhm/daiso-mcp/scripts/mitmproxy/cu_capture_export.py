"""
CU 앱 요청 캡처 결과를 전달 가능한 JSONL/요약 파일로 저장하는 mitmproxy 애드온.

사용 예시:
  mitmdump -s scripts/mitmproxy/cu_capture_export.py \
    --set cu_capture_dir=captures/cu-20260308 \
    --set cu_capture_scenario='로그인 후 재고조회' \
    -w captures/cu-20260308/raw.mitm
"""

from __future__ import annotations

import base64
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict
from urllib.parse import parse_qsl, urlparse

from mitmproxy import ctx, http


SENSITIVE_HEADER_KEYS = {
    'authorization',
    'proxy-authorization',
    'cookie',
    'set-cookie',
    'x-auth-token',
    'x-access-token',
    'x-refresh-token',
}

SENSITIVE_PARAM_KEYS = {
    'token',
    'access_token',
    'refresh_token',
    'authorization',
    'password',
    'passwd',
    'session',
    'sid',
    'jwt',
}


class CuCaptureExportAddon:
    def __init__(self) -> None:
        self.total_flows = 0
        self.matched_flows = 0
        self.skipped_flows = 0

    def load(self, loader):
        loader.add_option(
            name='cu_capture_dir',
            typespec=str,
            default='captures/cu-latest',
            help='CU 캡처 산출물 저장 디렉토리',
        )
        loader.add_option(
            name='cu_capture_scenario',
            typespec=str,
            default='미지정',
            help='수집 시나리오 설명',
        )
        loader.add_option(
            name='cu_capture_hosts',
            typespec=str,
            default='cu.bgfretail.com,pocketcu.co.kr',
            help='캡처 대상 호스트 목록(콤마 구분)',
        )

    def running(self):
        output_dir = self._output_dir()
        output_dir.mkdir(parents=True, exist_ok=True)
        self._requests_path().write_text('', encoding='utf-8')
        ctx.log.info(f'[cu-capture] 출력 디렉토리 초기화: {output_dir}')

    def response(self, flow: http.HTTPFlow):
        self.total_flows += 1

        if not flow.request:
            self.skipped_flows += 1
            return

        if not self._is_target_host(flow.request.pretty_host):
            self.skipped_flows += 1
            return

        record = {
            'capturedAt': self._iso_utc_now(),
            'request': self._serialize_request(flow.request),
            'response': self._serialize_response(flow.response),
        }

        with self._requests_path().open('a', encoding='utf-8') as fp:
            fp.write(json.dumps(record, ensure_ascii=False) + '\n')

        self.matched_flows += 1

    def done(self):
        summary = {
            'generatedAt': self._iso_utc_now(),
            'scenario': ctx.options.cu_capture_scenario,
            'targetHosts': self._target_hosts(),
            'counts': {
                'totalFlows': self.total_flows,
                'matchedFlows': self.matched_flows,
                'skippedFlows': self.skipped_flows,
            },
            'files': {
                'requestsJsonl': str(self._requests_path()),
            },
        }
        summary_path = self._summary_path()
        summary_path.write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + '\n',
            encoding='utf-8',
        )
        ctx.log.info(f'[cu-capture] 요약 파일 생성: {summary_path}')

    def _output_dir(self) -> Path:
        return Path(ctx.options.cu_capture_dir).expanduser()

    def _requests_path(self) -> Path:
        return self._output_dir() / 'requests.jsonl'

    def _summary_path(self) -> Path:
        return self._output_dir() / 'summary.json'

    def _target_hosts(self) -> list[str]:
        hosts = [item.strip().lower() for item in ctx.options.cu_capture_hosts.split(',')]
        return [item for item in hosts if item]

    def _is_target_host(self, host: str) -> bool:
        host_lower = host.lower()
        return any(host_lower == target or host_lower.endswith(f'.{target}') for target in self._target_hosts())

    def _serialize_request(self, request: http.Request) -> Dict:
        parsed_url = urlparse(request.pretty_url)
        masked_query = self._mask_query(parsed_url.query)

        content_type = request.headers.get('content-type', '')
        body = self._serialize_body(request.raw_content, content_type)

        return {
            'method': request.method,
            'scheme': request.scheme,
            'host': request.pretty_host,
            'port': request.port,
            'path': request.path,
            'urlWithoutQuery': f'{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}',
            'query': masked_query,
            'headers': self._mask_headers(dict(request.headers.items(multi=True))),
            'body': body,
        }

    def _serialize_response(self, response: http.Response | None) -> Dict | None:
        if response is None:
            return None

        content_type = response.headers.get('content-type', '')
        body = self._serialize_body(response.raw_content, content_type)

        return {
            'statusCode': response.status_code,
            'headers': self._mask_headers(dict(response.headers.items(multi=True))),
            'body': body,
        }

    def _mask_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        masked: Dict[str, str] = {}
        for key, value in headers.items():
            if key.lower() in SENSITIVE_HEADER_KEYS:
                masked[key] = '__REDACTED__'
            else:
                masked[key] = value
        return masked

    def _mask_query(self, raw_query: str) -> Dict[str, str]:
        params = parse_qsl(raw_query, keep_blank_values=True)
        masked: Dict[str, str] = {}
        for key, value in params:
            if key.lower() in SENSITIVE_PARAM_KEYS:
                masked[key] = '__REDACTED__'
            else:
                masked[key] = value
        return masked

    def _serialize_body(self, raw_content: bytes | None, content_type: str) -> Dict:
        if not raw_content:
            return {
                'encoding': 'none',
                'contentType': content_type,
                'size': 0,
                'preview': '',
            }

        size = len(raw_content)
        if self._is_text_content(content_type):
            preview_text = raw_content.decode('utf-8', errors='replace')
            return {
                'encoding': 'utf-8',
                'contentType': content_type,
                'size': size,
                'preview': preview_text[:5000],
            }

        b64 = base64.b64encode(raw_content).decode('ascii')
        return {
            'encoding': 'base64',
            'contentType': content_type,
            'size': size,
            'preview': b64[:5000],
        }

    def _is_text_content(self, content_type: str) -> bool:
        if not content_type:
            return False

        lowered = content_type.lower()
        if lowered.startswith('text/'):
            return True

        text_like_tokens = ['application/json', 'application/javascript', 'application/xml']
        return any(token in lowered for token in text_like_tokens)

    def _iso_utc_now(self) -> str:
        return datetime.now(timezone.utc).isoformat()


addons = [CuCaptureExportAddon()]
