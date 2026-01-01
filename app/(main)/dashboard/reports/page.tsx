import { MyReportsContent } from "@/components/forum/my-reports-content";
import { MyAccountActionsContent } from "@/components/forum/my-account-actions-content";

export default function ReportsPage() {
  return (
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-8">
      <MyReportsContent />
      <MyAccountActionsContent />
    </div>
  );
}

