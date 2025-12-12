import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  {
    id: "positive",
    title: "Positive Feedback",
    template: "I really enjoyed this course. The teaching style was clear and engaging. The instructor was always available to help and provided excellent resources.",
  },
  {
    id: "constructive",
    title: "Constructive Feedback",
    template: "The course content was good, but I think it could benefit from more practical examples. The instructor was knowledgeable and approachable.",
  },
  {
    id: "detailed",
    title: "Detailed Feedback",
    template: "This course exceeded my expectations. The instructor's explanations were thorough, the assignments were relevant, and the feedback on my work was helpful. I particularly appreciated the real-world examples.",
  },
  {
    id: "appreciation",
    title: "Appreciation",
    template: "Thank you for being such a dedicated teacher. Your passion for the subject is evident, and it made learning enjoyable. I learned a lot from this course.",
  },
  {
    id: "improvement",
    title: "Suggestions for Improvement",
    template: "The course was informative, but I would suggest adding more interactive activities. The instructor was great at explaining complex topics in simple terms.",
  },
];

interface FeedbackTemplatesProps {
  onSelectTemplate: (template: string) => void;
  className?: string;
}

export function FeedbackTemplates({ onSelectTemplate, className }: FeedbackTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn("gap-2", className)}
      >
        <Sparkles className="h-4 w-4" />
        Use Template
      </Button>
    );
  }

  return (
    <Card className={cn("animate-scaleIn", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Feedback Templates
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {TEMPLATES.map((template) => (
          <Button
            key={template.id}
            variant="outline"
            className="w-full text-left justify-start h-auto py-3 px-4"
            onClick={() => {
              onSelectTemplate(template.template);
              setIsOpen(false);
            }}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="font-medium text-sm">{template.title}</span>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {template.template}
              </span>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

