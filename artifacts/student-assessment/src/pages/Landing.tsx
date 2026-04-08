import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Brain, Trophy, Users, GraduationCap, ChevronRight } from "lucide-react";

export default function Landing() {
  const { auth, isStudent, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (auth && isStudent) setLocation("/student/dashboard");
    else if (auth && isAdmin) setLocation("/admin/dashboard");
  }, [auth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <div>
            <div className="text-white font-bold text-lg leading-tight">Ada21Tech</div>
            <div className="text-blue-300 text-xs">Assessment Platform</div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10" onClick={() => setLocation("/student/login")}>
            Student Login
          </Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => setLocation("/admin/login")}>
            Admin
          </Button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-blue-200 text-sm mb-8">
          <Brain className="w-4 h-4" />
          AI-Powered Learning for Ethiopian Students
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Master Your
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400"> Grades 6–12</span>
          <br />Exams with AI
        </h1>

        <p className="text-xl text-blue-200 mb-10 max-w-2xl">
          Practice with curated questions, get instant AI feedback, and track your progress across all subjects. Built for Ethiopian national exam preparation.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg h-auto"
            onClick={() => setLocation("/student/register")}>
            Start Free Trial <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
          <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg h-auto"
            onClick={() => setLocation("/student/login")}>
            Sign In
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 w-full">
          {[
            { icon: BookOpen, label: "Multi-Subject", desc: "All core subjects" },
            { icon: Brain, label: "AI Feedback", desc: "Gemini-powered insights" },
            { icon: Trophy, label: "Score Tracking", desc: "See your progress" },
            { icon: Users, label: "Admin Panel", desc: "Managed enrollment" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:bg-white/10 transition-colors">
              <Icon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <div className="text-white font-semibold">{label}</div>
              <div className="text-blue-300 text-sm mt-1">{desc}</div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
