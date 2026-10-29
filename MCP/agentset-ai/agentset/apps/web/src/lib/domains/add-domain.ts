import { env } from "@/env";

import { callVercelApi } from "./utils";

export const addDomainToVercel = async (domain: string) => {
  return callVercelApi<{
    error?: { code: string; message: string };
  }>(`/v10/projects/${env.VERCEL_PROJECT_ID}/domains`, "POST", {
    name: domain.toLowerCase(),
  });
};
