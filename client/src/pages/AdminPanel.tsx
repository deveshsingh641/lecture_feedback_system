import { useState, useMemo, useEffect } from "react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, MessageSquare, Star, Plus, GraduationCap, AlertTriangle, ShieldAlert } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Teacher } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPanel() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [slaDays] = useState(5);
  const [overdueDeptFilter, setOverdueDeptFilter] = useState<string>("all");
  const [overdueTeacherFilter, setOverdueTeacherFilter] = useState<string>("all");

  const { data: teachers = [], isLoading, error } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: overdueDoubts = [] } = useQuery<{
    id: string;
    teacherId: string;
    studentName: string;
    question: string;
    status: string;
    createdAt: string | null;
    answeredAt: string | null;
    teacherName: string | null;
    department: string | null;
  }[]>({
    queryKey: ["/api/admin/doubts/overdue", slaDays],
  });

  const { data: flaggedFeedback = [] } = useQuery<{
    id: string;
    teacherId: string;
    studentId: string;
    studentName: string;
    rating: number;
    comment: string | null;
    subject: string | null;
    createdAt: string | null;
    teacherName: string | null;
    department: string | null;
  }[]>({
    queryKey: ["/api/admin/feedback/flagged"],
  });

  const overdueDepartments = useMemo(
    () => Array.from(new Set(overdueDoubts.map((d) => d.department).filter((d): d is string => !!d))),
    [overdueDoubts]
  );

  const overdueTeachers = useMemo(
    () => Array.from(new Set(overdueDoubts.map((d) => d.teacherName).filter((t): t is string => !!t))),
    [overdueDoubts]
  );

  const filteredOverdueDoubts = useMemo(
    () =>
      overdueDoubts.filter((d) => {
        const matchesDept =
          overdueDeptFilter === "all" || !d.department || d.department === overdueDeptFilter;
        const matchesTeacher =
          overdueTeacherFilter === "all" || !d.teacherName || d.teacherName === overdueTeacherFilter;
        return matchesDept && matchesTeacher;
      }),
    [overdueDoubts, overdueDeptFilter, overdueTeacherFilter]
  );

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch teachers:", error);
      toast({
        title: "Failed to load teachers",
        description: error instanceof Error ? error.message : "Unable to fetch teachers. Please try again later.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const departments = useMemo(() => 
    Array.from(new Set(teachers.map((t) => t.department))),
    [teachers]
  );

  const filteredTeachers = useMemo(() => {
    let result = [...teachers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.subject.toLowerCase().includes(query)
      );
    }

    if (selectedDepartment && selectedDepartment !== "all") {
      result = result.filter((t) => t.department === selectedDepartment);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "rating-high":
          return (b.averageRating || 0) - (a.averageRating || 0);
        case "rating-low":
          return (a.averageRating || 0) - (b.averageRating || 0);
        case "feedback-most":
          return (b.totalFeedback || 0) - (a.totalFeedback || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [teachers, searchQuery, sortBy, selectedDepartment]);

  const totalFeedback = teachers.reduce((sum, t) => sum + (t.totalFeedback || 0), 0);
  const averageRating = teachers.length > 0 
    ? teachers.reduce((sum, t) => sum + (t.averageRating || 0), 0) / teachers.length 
    : 0;

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/feedback/${feedbackId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback/flagged"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      toast({
        title: "Feedback removed",
        description: "The selected feedback has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container px-4 md:px-6 py-8">
          <div className="mb-8">
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container px-4 md:px-6 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Failed to load teachers</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "Unable to fetch teachers. Please check your connection and try again."}
            </p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/teachers"] })}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="container px-4 md:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage teachers and monitor feedback
            </p>
          </div>
          <Button asChild data-testid="button-add-teacher">
            <a href="/admin/teachers">
              <Plus className="mr-2 h-4 w-4" />
              Manage Teachers
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Teachers"
            value={teachers.length}
            subtitle="Active in system"
            icon={GraduationCap}
          />
          <StatCard
            title="Total Feedback"
            value={totalFeedback}
            subtitle="All time"
            icon={MessageSquare}
          />
          <StatCard
            title="Avg. Rating"
            value={averageRating.toFixed(1)}
            subtitle="Across all teachers"
            icon={Star}
          />
          <StatCard
            title="Departments"
            value={departments.length}
            subtitle="Active"
            icon={Users}
          />
        </div>

        {/* Doubt SLA monitoring & moderation overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Overdue Doubts
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Open for more than {slaDays} day{slaDays === 1 ? "" : "s"}
                </p>
              </div>
              <span className="text-2xl font-semibold">{overdueDoubts.length}</span>
            </CardHeader>
            <CardContent>
              {overdueDoubts.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No overdue doubts at the moment.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-3 text-[11px]">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Dept:</span>
                      <select
                        className="border border-border bg-background rounded px-1 py-0.5 text-[11px]"
                        value={overdueDeptFilter}
                        onChange={(e) => setOverdueDeptFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        {overdueDepartments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Teacher:</span>
                      <select
                        className="border border-border bg-background rounded px-1 py-0.5 text-[11px]"
                        value={overdueTeacherFilter}
                        onChange={(e) => setOverdueTeacherFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        {overdueTeachers.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredOverdueDoubts.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No overdue doubts for the selected filters.
                    </p>
                  ) : (
                    <div className="space-y-2 text-xs max-h-56 overflow-y-auto">
                      {filteredOverdueDoubts.map((doubt) => (
                        <div
                          key={doubt.id}
                          className="rounded-md border border-amber-300/60 bg-amber-50/80 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-medium">{doubt.studentName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {doubt.teacherName || "Unknown"} · {doubt.department || "N/A"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {doubt.question}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-500" />
                  Moderation Queue
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Feedback flagged for abusive language
                </p>
              </div>
              <span className="text-2xl font-semibold">{flaggedFeedback.length}</span>
            </CardHeader>
            <CardContent>
              {flaggedFeedback.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No flagged feedback at the moment.
                </p>
              ) : (
                <div className="space-y-2 text-xs max-h-56 overflow-y-auto">
                  {flaggedFeedback.map((fb) => (
                    <div
                      key={fb.id}
                      className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {fb.studentName} → {fb.teacherName || "Unknown"}
                        </p>
                        <p className="text-[10px] text-muted-foreground mb-1">
                          {fb.subject || "General"} · Rating {fb.rating}/5
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {fb.comment}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] text-destructive border-destructive/40 hover:bg-destructive/10"
                        onClick={() => deleteFeedbackMutation.mutate(fb.id)}
                        disabled={deleteFeedbackMutation.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
