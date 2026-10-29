"""
HTTP Client with Retry Logic

This module creates an HTTP client that automatically retries failed requests.
It handles common issues like rate limits, server errors, and network problems.

What it does:
- Retries when servers return errors (429, 502, 503, 504)
- Waits the right amount of time between retries
- Respects "Retry-After" headers from servers
- Falls back to exponential backoff if no header is given
- Tries up to 5 times before giving up

This is useful when calling APIs that might be temporarily unavailable.
"""

from httpx import AsyncClient, HTTPStatusError
from pydantic_ai.retries import AsyncTenacityTransport, RetryConfig, wait_retry_after
from tenacity import retry_if_exception_type, stop_after_attempt, wait_exponential


def create_retrying_client() -> AsyncClient:
    """
    Create an HTTP client that automatically retries failed requests.

    Returns:
        AsyncClient: An HTTP client configured with retry logic that will:
        - Retry on server errors (429, 502, 503, 504) and connection issues
        - Wait according to server "Retry-After" headers
        - Use exponential backoff when no retry header is present
        - Try up to 5 times before giving up
        - Wait maximum 60 seconds between retries, 300 seconds total

    Example:
        client = create_retrying_client()
        response = await client.get("https://api.example.com/data")
    """

    def should_retry_status(response):
        """
        Check if we should retry based on HTTP status code.

        Args:
            response: HTTP response object

        Raises:
            HTTPStatusError: When response has a retryable status code
        """
        # Check for common retryable errors:
        # 502: Bad Gateway (server temporarily unavailable)
        # 503: Service Unavailable (server overloaded)
        # 504: Gateway Timeout (server took too long to respond)
        if response.status_code in (502, 503, 504):
            response.raise_for_status()  # This will raise HTTPStatusError for retry

    # Create the transport layer with retry logic
    transport = AsyncTenacityTransport(
        config=RetryConfig(
            # What errors to retry on:
            # - HTTPStatusError: For 4xx/5xx HTTP errors
            # - ConnectionError: For network connection issues
            retry=retry_if_exception_type((HTTPStatusError, ConnectionError)),
            # How long to wait between retries:
            # - First checks for "Retry-After" header from server
            # - If no header, uses exponential backoff (1s, 2s, 4s, etc.)
            # - Maximum wait: 60s between attempts, 300s total
            wait=wait_retry_after(
                fallback_strategy=wait_exponential(multiplier=1, max=60),
                max_wait=300,
            ),
            # When to stop trying:
            stop=stop_after_attempt(5),  # Give up after 5 attempts
            # What to do when all retries fail:
            reraise=True,  # Raise the last exception so caller knows it failed
        ),
        # Function to check if response status should trigger a retry:
        validate_response=should_retry_status,
    )
    # Return the configured HTTP client
    return AsyncClient(transport=transport)
