import type { DomainResponse } from "@/types/vercel";
import { env } from "@/env";

import { callVercelApi } from "./utils";

export const verifyDomain = async (domain: string) => {
  return callVercelApi<DomainResponse>(
    `/v9/projects/${env.VERCEL_PROJECT_ID}/domains/${domain.toLowerCase()}/verify`,
    "POST",
  );
};
