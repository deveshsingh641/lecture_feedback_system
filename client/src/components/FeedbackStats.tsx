import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "./StatCard";
import { TrendingUp, TrendingDown, MessageSquare, Star, Users, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Teacher } from "@shared/schema";

export function FeedbackStats({ className }: { className?: string }) {
  const { data: teachers = [], isLoading } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const totalTeachers = teachers.length;
  const totalFeedback = teachers.reduce((sum, t) => sum + (t.totalFeedback || 0), 0);
  const avgRating = teachers.length > 0
    ? teachers.reduce((sum, t) => sum + (t.averageRating || 0), 0) / teachers.length
    : 0;
  const topRatedCount = teachers.filter((t) => (t.averageRating || 0) >= 4.5).length;
  const totalStudents = new Set(
    teachers.flatMap((t) => Array(t.totalFeedback || 0).fill(t.id))
  ).size;

  // Calculate trends (simplified - in production, compare with previous period)
  const positiveTrend = teachers.filter((t) => (t.averageRating || 0) >= 4).length;
  const positiveTrendPercent = totalTeachers > 0
    ? ((positiveTrend / totalTeachers) * 100).toFixed(1)
    : "0";

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      <StatCard
        title="Total Teachers"
        value={totalTeachers}
        subtitle="Active on platform"
        icon={Users}
      />
      <StatCard
        title="Total Feedback"
        value={totalFeedback}
        subtitle="Submissions collected"
        icon={MessageSquare}
      />
      <StatCard
        title="Average Rating"
        value={avgRating.toFixed(1)}
        subtitle={`${positiveTrendPercent}% rated 4+ stars`}
        icon={Star}
      />
      <StatCard
        title="Top Rated"
        value={topRatedCount}
        subtitle="Teachers with 4.5+ stars"
        icon={Award}
      />
    </div>
  );
}

