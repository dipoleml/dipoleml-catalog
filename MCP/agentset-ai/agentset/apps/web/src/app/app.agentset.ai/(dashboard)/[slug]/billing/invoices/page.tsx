import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

import OrganizationInvoicesClient from "./page.client";

export default function OrganizationInvoices() {
  return (
    <DashboardPageWrapper title="Billing - Invoices">
      <OrganizationInvoicesClient />
    </DashboardPageWrapper>
  );
}
