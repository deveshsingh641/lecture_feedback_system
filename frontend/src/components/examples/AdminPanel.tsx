import AdminPanel from "@/pages/AdminPanel";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function AdminPanelExample() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminPanel />
      </AuthProvider>
    </ThemeProvider>
  );
}
