import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AuthScreen from "./pages/AuthScreen";
import Home from "./pages/Home";
import { useAuth } from "./_core/hooks/useAuth";

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading"><Loader2 size={22} className="animate-spin" /><span>Preparing your private journal…</span></div>;
  }

  return user ? <Home /> : <AuthScreen />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster position="bottom-right" />
          <AuthGate />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
