import { useState, useMemo, useEffect } from "react";
import { TeacherCard } from "@/components/TeacherCard";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Confetti } from "@/components/Confetti";
import { ExportButton } from "@/components/ExportButton";
import { AdvancedSearch, type SearchFilters } from "@/components/AdvancedSearch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Teacher } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentTeachers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const { data: teachers = [], isLoading: teachersLoading, error: teachersError } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
  });

  const { data: submittedTeacherIds = [] } = useQuery<string[]>({
    queryKey: ["/api/feedback/my-submissions"],
  });

  const { data: favoriteTeacherIds = [] } = useQuery<string[]>({
    queryKey: ["/api/favorites/my"],
  });

  useEffect(() => {
    if (teachersError) {
      console.error("Failed to fetch teachers:", teachersError);
      toast({
        title: "Failed to load teachers",
        description:
          teachersError instanceof Error
            ? teachersError.message
            : "Unable to fetch teachers. Please try again later.",
        variant: "destructive",
      });
    }
  }, [teachersError, toast]);

  const feedbackMutation = useMutation({
    mutationFn: async (data: {
      teacherId: string;
      rating: number;
      comment: string;
      anonymous?: boolean;
      doubt?: string;
    }) => {
      const res = await apiRequest("POST", "/api/feedback", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feedback/my-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity/recent"] });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      setFeedbackDialogOpen(false);
      toast({
        title: "🎉 Feedback submitted!",
        description: "Thank you for your feedback.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      const res = await apiRequest("POST", `/api/favorites/${teacherId}`);
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return res.json();
      }
      const text = await res.text();
      throw new Error(text && !text.startsWith("<") ? text : "Favorites API did not return valid JSON");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/my"] });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      const res = await apiRequest("DELETE", `/api/favorites/${teacherId}`);
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return res.json();
      }
      const text = await res.text();
      throw new Error(text && !text.startsWith("<") ? text : "Favorites API did not return valid JSON");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites/my"] });
    },
  });

  const departments = useMemo(
    () => Array.from(new Set(teachers.map((t) => t.department))),
    [teachers]
  );

  const filteredTeachers = useMemo(() => {
    let result = [...teachers];

    if (searchFilters) {
      if (searchFilters.query) {
        const query = searchFilters.query.toLowerCase();
        result = result.filter(
          (t) =>
            t.name.toLowerCase().includes(query) ||
            t.subject.toLowerCase().includes(query) ||
            t.department.toLowerCase().includes(query)
        );
      }

      if (searchFilters.department !== "all") {
        result = result.filter((t) => t.department === searchFilters.department);
      }

      if (searchFilters.minRating > 0 || searchFilters.maxRating < 5) {
        result = result.filter(
          (t) =>
            (t.averageRating || 0) >= searchFilters.minRating &&
            (t.averageRating || 0) <= searchFilters.maxRating
        );
      }

      if (searchFilters.minFeedback > 0) {
        result = result.filter((t) => (t.totalFeedback || 0) >= searchFilters.minFeedback);
      }

      result.sort((a, b) => {
        switch (searchFilters.sortBy) {
          case "rating-desc":
            return (b.averageRating || 0) - (a.averageRating || 0);
          case "rating-asc":
            return (a.averageRating || 0) - (b.averageRating || 0);
          case "feedback-desc":
            return (b.totalFeedback || 0) - (a.totalFeedback || 0);
          case "feedback-asc":
            return (a.totalFeedback || 0) - (b.totalFeedback || 0);
          case "name-asc":
            return a.name.localeCompare(b.name);
          case "name-desc":
            return b.name.localeCompare(a.name);
          default:
            return 0;
        }
      });
    }

    return result;
  }, [teachers, searchFilters]);

  const handleGiveFeedback = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setFeedbackDialogOpen(true);
  };

  const handleSubmitFeedback = (
    teacherId: string,
    rating: number,
    comment: string,
    anonymous: boolean,
    doubt?: string
  ) => {
    feedbackMutation.mutate({ teacherId, rating, comment, anonymous, doubt });
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
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
              {teachersError instanceof Error
                ? teachersError.message
                : "Unable to fetch teachers. Please check your connection and try again."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <Confetti active={showConfetti} />
      <div className="container px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-welcome">
            Browse Teachers
          </h1>
          <p className="text-muted-foreground mt-1">
            Find teachers and share detailed feedback
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:max-w-2xl">
              <AdvancedSearch
                onSearch={(filters) => setSearchFilters(filters)}
                departments={departments}
              />
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              <ExportButton data={filteredTeachers} type="teachers" filename="teachers-list" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <TeacherCard
              key={teacher.id}
              teacher={{
                id: teacher.id,
                name: teacher.name,
                department: teacher.department,
                subject: teacher.subject,
                averageRating: teacher.averageRating || 0,
                totalFeedback: teacher.totalFeedback || 0,
                officeHours: teacher.officeHours || "",
              }}
              onGiveFeedback={() => handleGiveFeedback(teacher)}
              hasGivenFeedback={submittedTeacherIds.includes(teacher.id)}
              isFavorite={favoriteTeacherIds.includes(teacher.id)}
              onToggleFavorite={() =>
                favoriteTeacherIds.includes(teacher.id)
                  ? removeFavoriteMutation.mutate(teacher.id)
                  : addFavoriteMutation.mutate(teacher.id)
              }
            />
          ))}
        </div>

        {filteredTeachers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground" data-testid="text-no-teachers">
              No teachers found matching your criteria.
            </p>
          </div>
        )}

        <FeedbackForm
          teacher={
            selectedTeacher
              ? {
                  id: selectedTeacher.id,
                  name: selectedTeacher.name,
                  department: selectedTeacher.department,
                  subject: selectedTeacher.subject,
                  averageRating: selectedTeacher.averageRating || 0,
                  totalFeedback: selectedTeacher.totalFeedback || 0,
                }
              : null
          }
          open={feedbackDialogOpen}
          onOpenChange={setFeedbackDialogOpen}
          onSubmit={handleSubmitFeedback}
          isSubmitting={feedbackMutation.isPending}
        />
      </div>
    </div>
  );
}
