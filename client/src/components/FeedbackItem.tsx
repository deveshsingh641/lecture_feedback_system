import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { FeedbackThread } from "./FeedbackThread";
import { formatDistanceToNow } from "date-fns";
import { Reply } from "lucide-react";

export interface Feedback {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  subject?: string;
}

interface FeedbackItemProps {
  feedback: Feedback;
  showReplies?: boolean;
}

export function FeedbackItem({ feedback, showReplies = true }: FeedbackItemProps) {
  const [showThread, setShowThread] = useState(false);

  return (
    <Card className="hover-elevate" data-testid={`feedback-item-${feedback.id}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
              {feedback.studentName.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-medium text-sm">{feedback.studentName}</p>
                {feedback.subject && (
                  <p className="text-xs text-muted-foreground">{feedback.subject}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <StarRating rating={feedback.rating} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(feedback.createdAt, { addSuffix: true })}
                </span>
              </div>
            </div>
            {feedback.comment && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feedback.comment}
              </p>
            )}
            {showReplies && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowThread(!showThread)}
                className="mt-2"
              >
                <Reply className="h-4 w-4 mr-2" />
                {showThread ? "Hide Replies" : "View Replies"}
              </Button>
            )}
          </div>
        </div>
        {showReplies && showThread && (
          <FeedbackThread feedbackId={feedback.id} />
        )}
      </CardContent>
    </Card>
  );
}
