import type { Metadata } from "next";
import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import PageClient from "./page.client";

export const metadata: Metadata = {
  title: "Profile | General",
};

export default function ProfilePage() {
  return (
    <DashboardPageWrapper title="Profile" requireOrg={false}>
      <PageClient />
    </DashboardPageWrapper>
  );
}
