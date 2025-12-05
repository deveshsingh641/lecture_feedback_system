import { useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { FeedbackItem } from "@/components/FeedbackItem";
import { RatingChart } from "@/components/RatingChart";
import { SearchFilter } from "@/components/SearchFilter";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Star, TrendingUp, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import type { Feedback } from "@shared/schema";

interface FeedbackWithTeacher extends Feedback {
  teacherName?: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const { data: feedback = [], isLoading, error } = useQuery<FeedbackWithTeacher[]>({
    queryKey: ["/api/feedback/received"],
  });

  const totalFeedback = feedback.length;
  const averageRating = totalFeedback > 0 
    ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback 
    : 0;
  const uniqueStudents = new Set(feedback.map((f) => f.studentName)).size;

  const ratingDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    feedback.forEach(f => {
      if (f.rating >= 1 && f.rating <= 5) {
        counts[f.rating - 1]++;
      }
    });
    return [
      { rating: 1, count: counts[0] },
      { rating: 2, count: counts[1] },
      { rating: 3, count: counts[2] },
      { rating: 4, count: counts[3] },
      { rating: 5, count: counts[4] },
    ];
  }, [feedback]);

  const filteredFeedback = useMemo(() => {
    let result = [...feedback];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.studentName.toLowerCase().includes(query) ||
          (f.comment || "").toLowerCase().includes(query) ||
          (f.subject || "").toLowerCase().includes(query)
      );
    }

    if (filterRating) {
      result = result.filter((f) => f.rating >= filterRating);
    }

    result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      switch (sortBy) {
        case "recent":
          return dateB - dateA;
        case "oldest":
          return dateA - dateB;
        case "rating-high":
          return b.rating - a.rating;
        case "rating-low":
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

    return result;
  }, [feedback, searchQuery, sortBy, filterRating]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container px-4 md:px-6 py-8">
          <div className="mb-8">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container px-4 md:px-6 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Failed to load feedback</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "Unable to fetch feedback. Please check your connection and try again."}
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/feedback/received"] })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="container px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-welcome-teacher">Welcome, {user?.name || "Teacher"}</h1>
          <p className="text-muted-foreground mt-1">
            Track your feedback and performance analytics
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Feedback"
            value={totalFeedback}
            subtitle="All time"
            icon={MessageSquare}
          />
          <StatCard
            title="Average Rating"
            value={averageRating.toFixed(1)}
            subtitle="Out of 5 stars"
            icon={Star}
          />
          <StatCard
            title="Unique Students"
            value={uniqueStudents}
            subtitle="Who gave feedback"
            icon={Users}
          />
          <StatCard
            title="5-Star Ratings"
            value={ratingDistribution[4].count}
            subtitle={`${totalFeedback > 0 ? Math.round((ratingDistribution[4].count / totalFeedback) * 100) : 0}% of total`}
            icon={TrendingUp}
          />
        </div>

        <Tabs defaultValue="feedback" className="space-y-6">
          <TabsList>
            <TabsTrigger value="feedback" data-testid="tab-feedback">Feedback</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-6">
            <SearchFilter
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              filterRating={filterRating}
              onFilterRatingChange={setFilterRating}
              placeholder="Search feedback by student or content..."
            />

            <div className="space-y-4">
              {filteredFeedback.map((item) => (
                <FeedbackItem 
                  key={item.id} 
                  feedback={{
                    id: item.id,
                    studentName: item.studentName,
                    rating: item.rating,
                    comment: item.comment || "",
                    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
                    subject: item.subject || undefined,
                  }} 
                />
              ))}
            </div>

            {filteredFeedback.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground" data-testid="text-no-feedback">
                  {feedback.length === 0 
                    ? "No feedback received yet. Feedback from students will appear here." 
                    : "No feedback found matching your criteria."}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RatingChart data={ratingDistribution} />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ratingDistribution.slice().reverse().map((item) => (
                    <div key={item.rating} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm text-muted-foreground">{item.rating}-star ratings</span>
                      <span className="font-medium">
                        {item.count} ({totalFeedback > 0 ? Math.round((item.count / totalFeedback) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
