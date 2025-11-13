import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function DashboardPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      <main className="flex-1">{children}</main>
    </DashboardLayout>
  );
}

