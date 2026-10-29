export interface DomainResponse {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification: {
    value: string;
    type: string;
    domain: string;
    reason: string;
  }[];
  redirect?: string;
  redirectStatusCode?: 307 | 301 | 302 | 308;
  gitBranch?: string;
  updatedAt?: number;
  createdAt?: number;
}

export interface DomainConfigResponse {
  configuredBy?: ("CNAME" | "A" | "http") | null;
  acceptedChallenges?: ("dns-01" | "http-01")[];
  misconfigured: boolean;
  conflicts?: {
    type: string;
    name: string;
    value: string;
    reason: string;
  }[];
}
