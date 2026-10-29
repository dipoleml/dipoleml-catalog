import type { DomainConfigResponse } from "@/types/vercel";

import { callVercelApi } from "./utils";

export const getConfigResponse = async (domain: string) => {
  return callVercelApi<DomainConfigResponse>(
    `/v6/domains/${domain.toLowerCase()}/config`,
    "GET",
  );
};
