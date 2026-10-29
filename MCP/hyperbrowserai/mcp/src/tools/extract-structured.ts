import {
  CallToolResult,
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { getClient } from "../utils";
import { extractStructuredDataToolParamSchemaType } from "./tool-types";

export async function extractStructuredDataTool(
  params: extractStructuredDataToolParamSchemaType,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): Promise<CallToolResult> {
  const { urls, sessionOptions, prompt, schema } = params;

  let apiKey: string | undefined = undefined;
  if (extra.authInfo && extra.authInfo.extra?.isSSE) {
    apiKey = extra.authInfo.token;
  }

  try {
    const client = await getClient({ hbApiKey: apiKey });
    const result = await client.extract.startAndWait({
      urls,
      sessionOptions,
      prompt,
      schema,
    });

    if (result.error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: result.error,
          },
        ],
      };
    }

    const response: CallToolResult = {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.data, null, 2),
        },
      ],
      isError: false,
    };

    return response;
  } catch (error) {
    return {
      content: [{ type: "text", text: `${error}` }],
      isError: true,
    };
  }
}

export const extractStructuredDataToolName = "extract_structured_data";
export const extractStructuredDataToolDescription =
  "Extract structured data from a webpage. This tool allows you to extract structured data from a webpage using a schema.";
