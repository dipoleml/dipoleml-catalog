import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import OrganizationBillingUpgradePageClient from "./page.client";

export default function OrganizationBillingUpgrade() {
  return (
    <DashboardPageWrapper title="Billing - Upgrade">
      {/* className="mx-auto grid w-full max-w-screen-lg gap-8 px-3 lg:px-10" */}
      <OrganizationBillingUpgradePageClient />
    </DashboardPageWrapper>
  );
}
