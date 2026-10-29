import DashboardPageWrapper from "@/components/dashboard-page-wrapper";
import { constructMetadata } from "@/lib/metadata";

import PaymentMethods from "./_components/payment-methods";
import PlanUsage from "./_components/usage";

export const metadata = constructMetadata({ title: "Billing" });

export default function BillingSettingsPage() {
  return (
    <DashboardPageWrapper title="Billing">
      <PlanUsage />
      <PaymentMethods />
    </DashboardPageWrapper>
  );
}
