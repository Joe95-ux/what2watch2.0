import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import Navbar from "@/components/navbar/navbar";

export default function DashboardPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex">
        <DashboardLayout>
          <main className="flex-1">{children}</main>
        </DashboardLayout>
      </div>
    </div>
  );
}

