import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FolderOpen,
  LogOut,
  GraduationCap,
  Menu,
  X,
  DollarSign,
  Megaphone,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/students", icon: Users, label: "Students" },
  { href: "/admin/subjects", icon: FolderOpen, label: "Subjects" },
  { href: "/admin/questions", icon: BookOpen, label: "Questions" },
  { href: "/admin/grade-prices", icon: DollarSign, label: "Grade Pricing" },
  { href: "/admin/announcements", icon: Megaphone, label: "Announcements" },
  { href: "/admin/free-trial-questions", icon: FlaskConical, label: "Free Trial Qs" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white w-5 h-5" />
            </div>
            <div>
              <div className="text-sidebar-foreground font-bold text-sm">Ada21Tech</div>
              <div className="text-sidebar-foreground/50 text-xs">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, icon: Icon, label }) => (
            <button
              key={href}
              onClick={() => { setLocation(href); setMobileOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                location.startsWith(href)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/60 hover:text-destructive hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3 md:hidden">
          <Button size="icon" variant="ghost" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <GraduationCap className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">Admin Panel</span>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
