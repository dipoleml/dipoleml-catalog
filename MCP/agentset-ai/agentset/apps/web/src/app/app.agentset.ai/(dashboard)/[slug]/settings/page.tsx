import { constructMetadata } from "@/lib/metadata";

import SettingsPage from "./page.client";

export const metadata = constructMetadata({ title: "Settings" });

export default function GeneralSettingsPage() {
  return <SettingsPage />;
}
