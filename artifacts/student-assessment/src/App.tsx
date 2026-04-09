import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import StudentLogin from "@/pages/student/Login";
import StudentRegister from "@/pages/student/Register";
import StudentDashboard from "@/pages/student/Dashboard";
import QuizStart from "@/pages/student/QuizStart";
import QuizActive from "@/pages/student/QuizActive";
import QuizReview from "@/pages/student/QuizReview";
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminStudents from "@/pages/admin/Students";
import AdminQuestions from "@/pages/admin/Questions";
import AdminQuestionNew from "@/pages/admin/QuestionNew";
import AdminQuestionBulk from "@/pages/admin/QuestionBulk";
import AdminSubjects from "@/pages/admin/Subjects";
import AdminGradePrices from "@/pages/admin/GradePrices";
import AdminAnnouncements from "@/pages/admin/Announcements";
import AdminFreeTrialQuestions from "@/pages/admin/FreeTrialQuestions";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function RequireStudent({ children }: { children: React.ReactNode }) {
  const { auth, isStudent } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!auth) setLocation("/student/login");
    else if (!isStudent) setLocation("/admin/login");
  }, [auth, isStudent]);
  if (!auth || !isStudent) return null;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { auth, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!auth) setLocation("/admin/login");
    else if (!isAdmin) setLocation("/student/login");
  }, [auth, isAdmin]);
  if (!auth || !isAdmin) return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />

      <Route path="/student/login" component={StudentLogin} />
      <Route path="/student/register" component={StudentRegister} />

      <Route path="/student/dashboard">
        <RequireStudent><StudentDashboard /></RequireStudent>
      </Route>
      <Route path="/student/quiz/start">
        <RequireStudent><QuizStart /></RequireStudent>
      </Route>
      <Route path="/student/quiz/:sessionId/review">
        {(_params) => (
          <RequireStudent><QuizReview /></RequireStudent>
        )}
      </Route>
      <Route path="/student/quiz/:sessionId">
        {(_params) => (
          <RequireStudent><QuizActive /></RequireStudent>
        )}
      </Route>

      <Route path="/admin/login" component={AdminLogin} />

      <Route path="/admin/dashboard">
        <RequireAdmin><AdminDashboard /></RequireAdmin>
      </Route>
      <Route path="/admin/students">
        <RequireAdmin><AdminStudents /></RequireAdmin>
      </Route>
      <Route path="/admin/questions/bulk">
        <RequireAdmin><AdminQuestionBulk /></RequireAdmin>
      </Route>
      <Route path="/admin/questions/new">
        <RequireAdmin><AdminQuestionNew /></RequireAdmin>
      </Route>
      <Route path="/admin/questions">
        <RequireAdmin><AdminQuestions /></RequireAdmin>
      </Route>
      <Route path="/admin/subjects">
        <RequireAdmin><AdminSubjects /></RequireAdmin>
      </Route>
      <Route path="/admin/grade-prices">
        <RequireAdmin><AdminGradePrices /></RequireAdmin>
      </Route>
      <Route path="/admin/announcements">
        <RequireAdmin><AdminAnnouncements /></RequireAdmin>
      </Route>
      <Route path="/admin/free-trial-questions">
        <RequireAdmin><AdminFreeTrialQuestions /></RequireAdmin>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
