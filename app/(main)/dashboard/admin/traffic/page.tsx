import { TrafficAnalyticsContent } from "@/components/admin/traffic-analytics-content";

export const metadata = {
  title: "Traffic Analytics | Admin | what2watch",
  description: "View website traffic analytics, visitor breakdowns, and traffic sources",
};

export default function TrafficAnalyticsPage() {
  return (
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <TrafficAnalyticsContent />
    </div>
  );
}

