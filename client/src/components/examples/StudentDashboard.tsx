import StudentDashboard from "@/pages/StudentDashboard";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function StudentDashboardExample() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StudentDashboard />
      </AuthProvider>
    </ThemeProvider>
  );
}
