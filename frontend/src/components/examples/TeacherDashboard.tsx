import TeacherDashboard from "@/pages/TeacherDashboard";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function TeacherDashboardExample() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TeacherDashboard />
      </AuthProvider>
    </ThemeProvider>
  );
}
