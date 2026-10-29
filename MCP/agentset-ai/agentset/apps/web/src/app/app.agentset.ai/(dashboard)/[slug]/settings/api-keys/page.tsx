import { constructMetadata } from "@/lib/metadata";

import ApiKeysPage from "./page.client";

export const metadata = constructMetadata({ title: "API Keys" });

export default function ApiKeysPageServer() {
  return <ApiKeysPage />;
}
