import { TeacherCard, type Teacher } from "../TeacherCard";

const mockTeacher: Teacher = {
  id: "1",
  name: "Shweta Kaushik",
  department: "Computer Science",
  subject: "Web Technology",
  averageRating: 4.5,
  totalFeedback: 42,
};

export default function TeacherCardExample() {
  return (
    <div className="max-w-sm">
      <TeacherCard
        teacher={mockTeacher}
        onGiveFeedback={(t) => console.log("Give feedback to:", t.name)}
      />
    </div>
  );
}
