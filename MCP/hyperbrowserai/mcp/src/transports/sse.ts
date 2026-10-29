import express from "express";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  BearerAuthMiddlewareOptions,
  requireBearerAuth,
} from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { NAME, VERSION } from "../common";
import setupServer from "./setup_server";

const DEFAULT_CLIENT_ID = "hyperbrowser-server-client";
const DEFAULT_SCOPES: string[] = ["mcp:tools"]; // Define any default scopes for the static token if needed
const API_KEY_VALIDATION_CACHE_DURATION_MS = 5 * 60 * 1000; // Cache validation for 5 minutes

interface CachedApiKeyInfo {
  validatedAt: number;
  // We could store user details from /api/me here if needed in AuthInfo.extra
  // For now, just knowing it's valid is enough.
}

class MyTokenVerifier implements OAuthTokenVerifier {
  private validatedApiKeysCache = new Map<string, CachedApiKeyInfo>();

  async verifyAccessToken(apiKey: string): Promise<AuthInfo> {
    if (!apiKey) {
      throw new Error("API key is missing");
    }

    // Check cache first
    const cachedInfo = this.validatedApiKeysCache.get(apiKey);
    if (
      cachedInfo &&
      Date.now() - cachedInfo.validatedAt < API_KEY_VALIDATION_CACHE_DURATION_MS
    ) {
      return {
        token: apiKey, // Still use the original API key as the token
        clientId: DEFAULT_CLIENT_ID,
        scopes: DEFAULT_SCOPES,
        extra: {
          isSSE: true,
          // any other details from /api/me if stored in CachedApiKeyInfo
        },
      };
    }

    // If not in cache or stale, validate with /api/me
    try {
      const response = await axios.request({
        method: "get",
        maxBodyLength: Infinity,
        url: "https://app.hyperbrowser.ai/api/me",
        headers: {
          "x-api-key": apiKey,
        },
      });

      if (response.status === 200) {
        // Store in cache
        this.validatedApiKeysCache.set(apiKey, { validatedAt: Date.now() });

        return {
          token: apiKey, // Use the original API key
          clientId: DEFAULT_CLIENT_ID,
          scopes: DEFAULT_SCOPES,
          extra: {
            isSSE: true,
            // Potentially add user details from response.data if needed
            // userId: response.data.id,
          },
        };
      } else {
        // Should not happen if axios throws on non-2xx, but as a safeguard
        this.validatedApiKeysCache.delete(apiKey); // Remove if validation fails
        throw new Error(
          `API key validation failed with status: ${response.status}`
        );
      }
    } catch (error: any) {
      this.validatedApiKeysCache.delete(apiKey); // Ensure removal on any error during validation
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          `Invalid API key or validation service error (Status: ${error.response.status})`
        );
      } else {
        throw new Error("Error during API key validation");
      }
    }
  }
}

function setupSSE(app: express.Application, server: McpServer) {
  setupServer(server);

  console.log("Setting up SSE server");

  let transport: SSEServerTransport;

  const authOptions: BearerAuthMiddlewareOptions = {
    verifier: new MyTokenVerifier(),
  };

  // Check for command-line flags to determine if auth should be enabled
  const enableAuth = process.argv.includes("--sse") && process.argv.includes("--serve");

  if (enableAuth) {
    console.log("SSE Authentication is ENABLED (flags --sse and --serve are present).");
    app.get("/sse", requireBearerAuth(authOptions), async (req, res) => {
      transport = new SSEServerTransport("/messages", res);
      await server.connect(transport);
    });

    app.post("/messages", requireBearerAuth(authOptions), async (req, res) => {
      if (!transport) {
        res.status(400).send("No transport found");
        return;
      }
      await transport.handlePostMessage(req, res);
    });
  } else {
    console.log("SSE Authentication is DISABLED (flags --sse and --serve are not both present).");
    app.get("/sse", async (req, res) => {
      transport = new SSEServerTransport("/messages", res);
      await server.connect(transport);
    });

    app.post("/messages", async (req, res) => {
      if (!transport) {
        res.status(400).send("No transport found");
        return;
      }
      await transport.handlePostMessage(req, res);
    });
  }
}

export async function createSSEServer() {
  const app = express();
  const server = new McpServer(
    {
      name: NAME,
      version: VERSION,
    },
    {
      capabilities: {
        resources: {},
      },
    }
  );

  setupSSE(app, server);

  return app;
}
