import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";

interface ReplyFormProps {
  feedbackId: string;
  onSuccess?: () => void;
}

export function ReplyForm({ feedbackId, onSuccess }: ReplyFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const replyMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      const res = await apiRequest("POST", `/api/feedback/${feedbackId}/replies`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/feedback/${feedbackId}/replies`] });
      setContent("");
      toast({
        title: "Reply posted",
        description: "Your reply has been posted successfully.",
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to post reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter a reply message.",
        variant: "destructive",
      });
      return;
    }
    replyMutation.mutate({ content: content.trim() });
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      <div className="space-y-2">
        <Label htmlFor="reply-content">Your Reply</Label>
        <Textarea
          id="reply-content"
          placeholder="Write your reply..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px] resize-none"
          disabled={replyMutation.isPending}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={replyMutation.isPending || !content.trim()}
          size="sm"
        >
          <Send className="h-4 w-4 mr-2" />
          {replyMutation.isPending ? "Posting..." : "Post Reply"}
        </Button>
      </div>
    </form>
  );
}

