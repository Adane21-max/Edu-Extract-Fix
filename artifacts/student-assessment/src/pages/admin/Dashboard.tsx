import AdminLayout from "@/components/layout/AdminLayout";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Users, BookOpen, Target, ClipboardList, UserCheck, Clock, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useGetAdminDashboard();

  const subjectChartData = data?.subjectBreakdown.map(s => ({
    name: s.subjectName.length > 12 ? s.subjectName.slice(0, 12) + "…" : s.subjectName,
    avg: Math.round(s.avgScore),
    sessions: s.totalSessions,
  })) ?? [];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and management</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            { label: "Total Students", value: data?.totalStudents ?? 0, icon: Users, color: "text-blue-500", action: () => setLocation("/admin/students") },
            { label: "Pending Approvals", value: data?.pendingApprovals ?? 0, icon: Clock, color: "text-yellow-500", action: () => setLocation("/admin/students") },
            { label: "Approved Students", value: data?.approvedStudents ?? 0, icon: UserCheck, color: "text-green-500", action: () => setLocation("/admin/students") },
            { label: "Total Questions", value: data?.totalQuestions ?? 0, icon: BookOpen, color: "text-purple-500", action: () => setLocation("/admin/questions") },
            { label: "Total Sessions", value: data?.totalSessions ?? 0, icon: ClipboardList, color: "text-indigo-500", action: undefined },
          ].map(({ label, value, icon: Icon, color, action }) => (
            <Card key={label} className={action ? "cursor-pointer hover:shadow-md transition-shadow" : ""} onClick={action}>
              <CardContent className="pt-5">
                <Icon className={`w-6 h-6 ${color} mb-2`} />
                <div className="text-2xl font-bold">{isLoading ? "…" : value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Subject chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Subject Avg Scores</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subjectChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={subjectChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "Avg Score"]} />
                    <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No session data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent students */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Recent Registrations
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/students")}>
                View all <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(data?.recentStudents ?? []).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">Grade {s.grade} • {s.email}</div>
                    </div>
                    <Badge variant={s.status === "approved" ? "default" : s.status === "pending" ? "secondary" : "destructive"}>
                      {s.status}
                    </Badge>
                  </div>
                ))}
                {(!data?.recentStudents.length) && (
                  <p className="text-muted-foreground text-sm text-center py-4">No students yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/admin/students")}>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">Manage Students</div>
                <div className="text-xs text-muted-foreground">Approve, suspend, view profiles</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/admin/questions")}>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">Manage Questions</div>
                <div className="text-xs text-muted-foreground">Add, edit, delete quiz questions</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/admin/subjects")}>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">Manage Subjects</div>
                <div className="text-xs text-muted-foreground">Create subjects by grade</div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
