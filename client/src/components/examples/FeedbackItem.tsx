import { FeedbackItem, type Feedback } from "../FeedbackItem";

const mockFeedback: Feedback = {
  id: "1",
  studentName: "Alex Johnson",
  rating: 5,
  comment: "Excellent teaching methodology! The concepts were explained very clearly and the practical examples helped a lot in understanding the subject matter.",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  subject: "Web Technology",
};

export default function FeedbackItemExample() {
  return (
    <div className="max-w-md">
      <FeedbackItem feedback={mockFeedback} />
    </div>
  );
}
