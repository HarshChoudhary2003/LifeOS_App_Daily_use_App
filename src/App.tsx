import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Habits from "./pages/Habits";
import Expenses from "./pages/Expenses";
import Analytics from "./pages/Analytics";
import Notes from "./pages/Notes";
import Decisions from "./pages/Decisions";
import LifeCoach from "./pages/LifeCoach";
import Wellness from "./pages/Wellness";
import Teams from "./pages/Teams";
import PublicProfile from "./pages/PublicProfile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              }
            />
            <Route
              path="/tasks"
              element={
                <AppLayout>
                  <Tasks />
                </AppLayout>
              }
            />
            <Route
              path="/habits"
              element={
                <AppLayout>
                  <Habits />
                </AppLayout>
              }
            />
            <Route
              path="/expenses"
              element={
                <AppLayout>
                  <Expenses />
                </AppLayout>
              }
            />
            <Route
              path="/analytics"
              element={
                <AppLayout>
                  <Analytics />
                </AppLayout>
              }
            />
            <Route
              path="/notes"
              element={
                <AppLayout>
                  <Notes />
                </AppLayout>
              }
            />
            <Route
              path="/decisions"
              element={
                <AppLayout>
                  <Decisions />
                </AppLayout>
              }
            />
            <Route
              path="/coach"
              element={
                <AppLayout>
                  <LifeCoach />
                </AppLayout>
              }
            />
            <Route
              path="/wellness"
              element={
                <AppLayout>
                  <Wellness />
                </AppLayout>
              }
            />
            <Route
              path="/settings"
              element={
                <AppLayout>
                  <Settings />
                </AppLayout>
              }
            />
            <Route
              path="/teams"
              element={
                <AppLayout>
                  <Teams />
                </AppLayout>
              }
            />
            <Route path="/u/:username" element={<PublicProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
