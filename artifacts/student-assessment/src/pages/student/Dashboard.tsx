import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useGetStudentDashboard, useListSessions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Trophy, Target, TrendingUp, BookOpen, Clock, ChevronRight, AlertCircle } from "lucide-react";

export default function StudentDashboard() {
  const { studentId, auth } = useAuth();
  const [, setLocation] = useLocation();

  const { data: dashboard, isLoading } = useGetStudentDashboard(
    studentId ?? 0,
    { query: { enabled: !!studentId } }
  );

  const { data: sessions } = useListSessions(
    { studentId: studentId ?? 0 },
    { query: { enabled: !!studentId } }
  );

  const statusColor = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    suspended: "bg-red-100 text-red-800",
  }[auth?.user?.status ?? "pending"];

  const trendData = dashboard?.improvementTrend.map((score, i) => ({ quiz: `Q${i + 1}`, score })) ?? [];

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, {auth?.user?.name?.split(" ")[0]}!</h1>
            <p className="text-muted-foreground">Grade {auth?.user?.grade} • Track your progress below</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}>
              {auth?.user?.status}
            </span>
            <Button onClick={() => setLocation("/student/quiz/start")}>
              <BookOpen className="w-4 h-4 mr-2" /> Take a Quiz
            </Button>
          </div>
        </div>

        {auth?.user?.status === "pending" && (
          <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-yellow-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Account Pending Approval</strong> — Your account is awaiting admin review. You may not be able to take quizzes until approved.
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Quizzes", value: dashboard?.totalSessions ?? 0, icon: BookOpen, color: "text-blue-500" },
            { label: "Avg. Score", value: `${dashboard?.avgScore ?? 0}%`, icon: Target, color: "text-green-500" },
            { label: "Best Score", value: `${dashboard?.highestScore ?? 0}%`, icon: Trophy, color: "text-yellow-500" },
            { label: "Sessions Done", value: sessions?.filter(s => s.status === "completed").length ?? 0, icon: TrendingUp, color: "text-purple-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-5">
                <Icon className={`w-6 h-6 ${color} mb-2`} />
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Score trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Score Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="quiz" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                  Complete some quizzes to see your trend!
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subject performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Subject Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(dashboard?.subjectPerformance ?? []).length > 0 ? (
                <div className="space-y-3">
                  {dashboard!.subjectPerformance.slice(0, 4).map((s) => (
                    <div key={s.subjectId}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium truncate">{s.subjectName}</span>
                        <span className="text-muted-foreground ml-2">{Math.round(s.avgScore)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div
                          className="h-2 bg-primary rounded-full transition-all"
                          style={{ width: `${s.avgScore}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">
                  No subject data yet. Take a quiz!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Recent Quizzes
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/student/quiz/start")}>
              Take a Quiz <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {(sessions ?? []).length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No quizzes taken yet. Start one now!
              </div>
            ) : (
              <div className="space-y-2">
                {sessions!.slice().reverse().slice(0, 5).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    onClick={() => s.status === "completed" ? setLocation(`/student/quiz/${s.id}/review`) : setLocation(`/student/quiz/${s.id}`)}
                  >
                    <div>
                      <div className="text-sm font-medium">{s.subjectName ?? "Quiz"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()} • Grade {s.grade} • {s.totalQuestions} questions
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.status === "completed" ? (
                        <span className={`text-sm font-bold ${(s.score ?? 0) >= 70 ? "text-green-600" : (s.score ?? 0) >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                          {s.score}%
                        </span>
                      ) : (
                        <Badge variant="secondary">In Progress</Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
