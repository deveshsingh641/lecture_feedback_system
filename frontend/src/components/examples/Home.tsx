import Home from "@/pages/Home";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function HomeExample() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Home />
      </AuthProvider>
    </ThemeProvider>
  );
}
