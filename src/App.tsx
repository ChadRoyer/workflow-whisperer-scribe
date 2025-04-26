
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react"; // Fix: Import useEffect from React instead of react-router-dom
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Modified ProtectedRoute to use useEffect for navigation
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { userInfo, session } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!userInfo && !session) {
      console.log("No user info or session found, redirecting to auth");
      navigate('/auth', { replace: true });
    } else {
      console.log("User info or session found, rendering protected route", userInfo);
    }
  }, [userInfo, session, navigate]);
  
  // Return children regardless, the useEffect will handle the redirect
  return <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
