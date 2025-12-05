import { StatCard } from "../StatCard";
import { MessageSquare, Star, Users } from "lucide-react";

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Total Feedback"
        value={156}
        subtitle="Across all subjects"
        icon={MessageSquare}
        trend={{ value: 12, isPositive: true }}
      />
      <StatCard
        title="Average Rating"
        value="4.5"
        subtitle="Out of 5 stars"
        icon={Star}
      />
      <StatCard
        title="Total Students"
        value={89}
        subtitle="Who gave feedback"
        icon={Users}
        trend={{ value: 5, isPositive: true }}
      />
    </div>
  );
}
