import { useState } from "react";
import { FeedbackForm } from "../FeedbackForm";
import { Button } from "@/components/ui/button";
import type { Teacher } from "../TeacherCard";

const mockTeacher: Teacher = {
  id: "1",
  name: "Tripti Pandey",
  department: "Computer Science",
  subject: "Machine Learning Techniques",
  averageRating: 4.2,
  totalFeedback: 28,
};

export default function FeedbackFormExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4">
      <Button onClick={() => setOpen(true)}>Open Feedback Form</Button>
      <FeedbackForm
        teacher={mockTeacher}
        open={open}
        onOpenChange={setOpen}
        onSubmit={(id, rating, comment) => {
          console.log("Submitted:", { id, rating, comment });
        }}
      />
    </div>
  );
}
