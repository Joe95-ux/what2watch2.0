import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { MyReportsContent } from "@/components/forum/my-reports-content";

export default function ForumReportsPage() {
  return (
    <DashboardLayout>
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <MyReportsContent />
      </div>
    </DashboardLayout>
  );
}

