import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { FeedbackTemplates } from "./FeedbackTemplates";
import { Confetti } from "./Confetti";
import { BookOpen } from "lucide-react";

export interface TeacherData {
  id: string;
  name: string;
  department: string;
  subject: string;
  averageRating: number;
  totalFeedback: number;
}

interface FeedbackFormProps {
  teacher: TeacherData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (teacherId: string, rating: number, comment: string) => void;
  isSubmitting?: boolean;
}

export function FeedbackForm({ teacher, open, onOpenChange, onSubmit, isSubmitting = false }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!open) {
      setRating(0);
      setComment("");
      setShowConfetti(false);
    }
  }, [open]);

  const handleTemplateSelect = (template: string) => {
    setComment(template);
  };

  const handleSubmit = () => {
    if (!teacher || rating === 0) return;
    onSubmit(teacher.id, rating, comment);
  };

  const handleClose = () => {
    setRating(0);
    setComment("");
    onOpenChange(false);
  };

  if (!teacher) return null;

  return (
    <>
      <Confetti 
        active={showConfetti} 
        onComplete={() => {
          setTimeout(() => setShowConfetti(false), 1000);
        }} 
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title-feedback">Submit Feedback</DialogTitle>
          <DialogDescription>
            Share your experience with this course
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium" data-testid="text-teacher-feedback-name">{teacher.name}</span>
            <Badge variant="secondary">{teacher.department}</Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{teacher.subject}</span>
          </div>
        </div>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Your Rating</Label>
            <div className="flex justify-center py-2">
              <StarRating
                rating={rating}
                size="lg"
                interactive
                onRatingChange={setRating}
              />
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground" data-testid="text-rating-label">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="comment">Your Feedback (Optional)</Label>
              <div className="flex items-center gap-2">
                <FeedbackTemplates onSelectTemplate={handleTemplateSelect} />
                <span className="text-xs text-muted-foreground">
                  {comment.length}/500
                </span>
              </div>
            </div>
            <Textarea
              id="comment"
              placeholder="Share your thoughts about the teaching style, course content, and overall experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              className="min-h-[120px] resize-none"
              data-testid="input-feedback-comment"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-feedback">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            data-testid="button-submit-feedback"
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
