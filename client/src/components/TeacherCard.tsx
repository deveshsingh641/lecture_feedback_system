import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarRating } from "./StarRating";
import { MessageSquare, BookOpen, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export interface Teacher {
  id: string;
  name: string;
  department: string;
  subject: string;
  averageRating: number;
  totalFeedback: number;
}

interface TeacherCardProps {
  teacher: Teacher;
  onGiveFeedback?: (teacher: Teacher) => void;
  hasGivenFeedback?: boolean;
}

export function TeacherCard({ teacher, onGiveFeedback, hasGivenFeedback = false }: TeacherCardProps) {
  const [, navigate] = useLocation();

  return (
    <Card className="hover-elevate transition-all duration-200 animate-slideInUp" data-testid={`card-teacher-${teacher.id}`}>
      <CardHeader className="flex flex-row items-start gap-4 pb-2">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {teacher.name.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold leading-none" data-testid={`text-teacher-name-${teacher.id}`}>
            {teacher.name}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {teacher.department}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>{teacher.subject}</span>
        </div>
        <div className="flex items-center justify-between">
          <StarRating rating={teacher.averageRating} size="sm" showValue />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {teacher.totalFeedback} reviews
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          className="flex-1"
          onClick={() => onGiveFeedback?.(teacher)}
          disabled={hasGivenFeedback}
          data-testid={`button-feedback-${teacher.id}`}
        >
          {hasGivenFeedback ? "Feedback Submitted" : "Give Feedback"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(`/teacher/${teacher.id}`)}
          className="hover:bg-accent transition-colors"
          title="View teacher profile"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
