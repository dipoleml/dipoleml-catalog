/**
 * Pull whatever explanation the API put in the error body.
 *
 * Without this the caller only ever saw the status line, so a 422 "input exceeds
 * the maximum length" was indistinguishable from any other 422 and the model had
 * nothing to act on. Bounded, and never throws.
 */
async function readErrorDetail(response: Response): Promise<string> {
	try {
		const body = (await response.text()).slice(0, 500).trim();
		if (!body) return "";

		try {
			const parsed = JSON.parse(body) as Record<string, any>;
			const detail =
				parsed?.detail ??
				parsed?.message ??
				parsed?.error?.message ??
				(typeof parsed?.error === "string" ? parsed.error : undefined);
			if (detail) return typeof detail === "string" ? detail : JSON.stringify(detail);
		} catch {
			// not JSON, fall through to the raw body
		}

		return body;
	} catch {
		return "";
	}
}

const AUTH_FAILED_MESSAGE = "Authentication failed. Please set your API key in the Jina AI MCP settings. You can get a free API key by visiting https://jina.ai and signing up for an account.";
const OUT_OF_QUOTA_MESSAGE = "This key is out of quota. Please top up this key at https://jina.ai";
const RATE_LIMITED_MESSAGE = "Rate limit exceeded. Please upgrade your API key to get higher rate limits. Visit https://jina.ai to manage your subscription and increase your usage limits.";

/** Statuses about the caller's key rather than the request, answered with a fixed message */
const ACCOUNT_ERROR_MESSAGES: Record<number, string> = {
	401: AUTH_FAILED_MESSAGE,
	402: OUT_OF_QUOTA_MESSAGE,
	429: RATE_LIMITED_MESSAGE,
};

/**
 * Describe why a Jina API call failed, in words a model can act on.
 *
 * Shared by handleApiError and the search tools, which return per-query errors
 * as strings. Those used to carry only the status line ("Unauthorized"), so an
 * expired key or an exhausted quota looked like any other failure.
 */
export async function describeApiError(response: Response): Promise<string> {
	const accountError = ACCOUNT_ERROR_MESSAGES[response.status];
	if (accountError) return accountError;

	const detail = await readErrorDetail(response);
	return `${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`;
}

/**
 * Utility function to handle common API errors for Jina AI services
 * Returns a standardized error response object for MCP tools
 */
export async function handleApiError(response: Response, context: string = "API request") {
	return {
		content: [
			{
				type: "text" as const,
				text: ACCOUNT_ERROR_MESSAGES[response.status]
					?? `Error: ${context} failed - ${await describeApiError(response)}`,
			},
		],
		isError: true,
	};
}

/**
 * Check if bearer token is available and return appropriate error message if not
 */
export function checkBearerToken(bearerToken: string | undefined) {
	if (!bearerToken) {
		return {
			content: [
				{
					type: "text" as const,
					text: "Please set your API key in the Jina AI MCP settings. You can get a free API key by visiting https://jina.ai and signing up for an account.",
				},
			],
			isError: true,
		};
	}
	return null; // No error, token is available
}
