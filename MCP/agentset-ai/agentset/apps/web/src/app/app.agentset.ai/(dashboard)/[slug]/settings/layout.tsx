import DashboardPageWrapper from "@/components/dashboard-page-wrapper";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardPageWrapper title="Settings">{children}</DashboardPageWrapper>
  );
}
