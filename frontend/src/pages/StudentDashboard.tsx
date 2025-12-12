import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { FeedbackStats } from "@/components/FeedbackStats";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Teacher } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hideReminder, setHideReminder] = useState(false);
  const [studyGoals, setStudyGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");

  const { data: teachers = [], isLoading: teachersLoading, error: teachersError } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: submittedTeacherIds = [], error: submissionsError } = useQuery<string[]>({
    queryKey: ["/api/feedback/my-submissions"],
  });

  const { data: myDoubts = [] } = useQuery<{
    id: string;
    teacherId: string;
    studentId: string;
    studentName: string;
    question: string;
    answer?: string | null;
    status: string;
    createdAt?: string;
    answeredAt?: string | null;
  }[]>({
    queryKey: ["/api/doubts/my"],
  });

  const { data: reminderStatus } = useQuery<{
    needsReminder: boolean;
    lastFeedbackDate: string | null;
    daysSinceLastFeedback: number | null;
  }>({
    queryKey: ["/api/feedback/reminder-status"],
    enabled: !!user && user.role === "student",
  });

  const { data: favoriteTeacherIds = [] } = useQuery<string[]>({
    queryKey: ["/api/favorites/my"],
  });

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("student-study-goals") : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setStudyGoals(parsed.filter((g) => typeof g === "string"));
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    if (teachersError) {
      console.error("Failed to fetch teachers:", teachersError);
      toast({
        title: "Failed to load teachers",
        description: teachersError instanceof Error ? teachersError.message : "Unable to fetch teachers. Please try again later.",
        variant: "destructive",
      });
    }
  }, [teachersError, toast]);

  const departments = useMemo(() => 
    Array.from(new Set(teachers.map((t) => t.department))),
    [teachers]
  );

  const totalFeedbackGiven = submittedTeacherIds.length;
  const averageRating = teachers.length > 0 
    ? teachers.reduce((sum, t) => sum + (t.averageRating || 0), 0) / teachers.length 
    : 0;

  if (teachersLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container px-4 md:px-6 py-8">
          <div className="mb-8">
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div id="teachers-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>

        {/* My Study Goals */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
          <div className="rounded-xl border border-primary/20 bg-background/60 px-4 py-3">
            <p className="text-sm font-semibold mb-1">My Study Goals</p>
            {studyGoals.length === 0 ? (
              <p className="text-xs text-muted-foreground mb-2">
                Add a few small goals to stay on track (for example: "Ask 2 doubts every week" or "Review notes before class").
              </p>
            ) : (
              <ul className="list-disc pl-4 space-y-1 mb-2">
                {studyGoals.map((goal, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground">
                    {goal}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Add a new goal..."
                className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = newGoal.trim();
                  if (!trimmed) return;
                  const updated = [...studyGoals, trimmed].slice(0, 10);
                  setStudyGoals(updated);
                  setNewGoal("");
                  try {
                    if (typeof window !== "undefined") {
                      localStorage.setItem("student-study-goals", JSON.stringify(updated));
                    }
                  } catch {
                    // ignore localStorage errors
                  }
                }}
                className="px-2 py-1 rounded-md bg-primary text-[11px] text-primary-foreground hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-background/60 px-4 py-3 text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Tip</p>
            <p>
              Combine your goals with the Doubt Wall: whenever you feel stuck, write a clear doubt for your teacher. Small, frequent questions usually
              lead to better understanding than waiting until exams.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (teachersError) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background">
        <div className="container px-4 md:px-6 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Failed to load data</h2>
            <p className="text-muted-foreground mb-4">
              {teachersError instanceof Error ? teachersError.message : "Unable to fetch teachers. Please check your connection and try again."}
            </p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/teachers"] })}
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
          <h1 className="text-3xl font-bold" data-testid="text-welcome">Welcome, {user?.name || "Student"}</h1>
          <p className="text-muted-foreground mt-1">
            Browse teachers and share your feedback
          </p>
        </div>

        {reminderStatus && reminderStatus.needsReminder && !hideReminder && (
          <div className="mb-6 p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-semibold">Have you shared feedback recently?</p>
              <p className="text-sm mt-1">
                {reminderStatus.daysSinceLastFeedback === null
                  ? "You haven't submitted any feedback yet. Your opinions help improve teaching quality."
                  : `It's been ${reminderStatus.daysSinceLastFeedback} day${
                      (reminderStatus.daysSinceLastFeedback || 0) === 1 ? "" : "s"
                    } since your last feedback. Take a moment to share your thoughts.`}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-3 py-2 text-sm rounded-md border border-amber-300 bg-white hover:bg-amber-100"
                onClick={() => setHideReminder(true)}
              >
                Dismiss
              </button>
              <a
                href="#teachers-list"
                className="px-3 py-2 text-sm rounded-md bg-amber-500 text-white hover:bg-amber-600"
              >
                Give Feedback
              </a>
            </div>
          </div>
        )}

        {/* Feedback Statistics */}
        <FeedbackStats className="mb-8" />

        {/* Overview cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-primary/20 bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Teachers available</p>
            <p className="text-2xl font-semibold mt-1">{teachers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Across {departments.length} department{departments.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="rounded-xl border border-primary/20 bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Feedback given</p>
            <p className="text-2xl font-semibold mt-1">{totalFeedbackGiven}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Number of teachers you have rated
            </p>
          </div>

          <div className="rounded-xl border border-primary/20 bg-background/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Favourites</p>
            <p className="text-2xl font-semibold mt-1">{favoriteTeacherIds.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Quick access from the Favourites tab
            </p>
          </div>
        </div>

        {/* Quick navigation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link href="/student/teachers">
            <a className="block rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 hover:border-primary/60 hover:bg-primary/10 transition-colors">
              <p className="text-sm font-semibold">Go to Teachers</p>
              <p className="text-xs text-muted-foreground mt-1">
                Browse all teachers and give detailed feedback
              </p>
            </a>
          </Link>
          <Link href="/favorites">
            <a className="block rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 hover:border-primary/60 hover:bg-primary/10 transition-colors">
              <p className="text-sm font-semibold">View Favourites</p>
              <p className="text-xs text-muted-foreground mt-1">
                See teachers you have marked as favourites
              </p>
            </a>
          </Link>
        </div>

        {/* My Doubts history */}
        {myDoubts.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold mb-3">My Doubts</h2>
            <div className="space-y-3">
              {myDoubts.map((doubt) => (
                <div
                  key={doubt.id}
                  className="rounded-lg border border-primary/20 bg-background/60 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium">{doubt.question}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {doubt.status === "answered" ? "Answered" : "Open"}
                    </span>
                  </div>
                  {doubt.answer && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Teacher's answer: {doubt.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
