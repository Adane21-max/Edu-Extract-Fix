import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListSubjects, useListSessions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, AlertCircle, CheckCircle2, LockKeyhole, PlayCircle, ChevronLeft, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionTypeInfo {
  questionType: string;
  rawType: string | null;
  count: number;
}

export default function QuizStart() {
  const { auth, studentId } = useAuth();
  const [, setLocation] = useLocation();
  const grade = auth?.user?.grade ?? "";
  const status = auth?.user?.status ?? "pending";

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [questionTypes, setQuestionTypes] = useState<QuestionTypeInfo[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const { data: subjects } = useListSubjects();
  const { data: sessions } = useListSessions(
    { studentId: studentId ?? 0 },
    { query: { enabled: !!studentId } }
  );

  const filtered = subjects?.filter((s) => s.grade === grade && s.questionCount > 0) ?? [];
  const selectedSubject = filtered.find(s => s.id === selectedSubjectId);

  const completedKeys = new Set<string>(
    (sessions ?? [])
      .filter(s => s.status === "completed")
      .map(s => `${s.subjectId}__${(s as { questionType?: string | null }).questionType ?? "null"}`)
  );

  const inProgressMap = new Map<string, number>(
    (sessions ?? [])
      .filter(s => s.status === "in_progress")
      .map(s => [`${s.subjectId}__${(s as { questionType?: string | null }).questionType ?? "null"}`, s.id])
  );

  useEffect(() => {
    if (!selectedSubjectId || !grade) {
      setQuestionTypes([]);
      return;
    }
    setLoadingTypes(true);
    setError("");
    fetch(`/api/questions/types?subjectId=${selectedSubjectId}&grade=${grade}`)
      .then(r => r.json())
      .then((data: QuestionTypeInfo[]) => setQuestionTypes(data))
      .catch(() => setError("Failed to load question types"))
      .finally(() => setLoadingTypes(false));
  }, [selectedSubjectId, grade]);

  const handleStart = async (type: QuestionTypeInfo) => {
    if (!studentId || !selectedSubjectId) return;
    setError("");
    setStarting(true);
    try {
      const resp = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          subjectId: selectedSubjectId,
          grade,
          questionType: type.rawType,
        }),
      });
      const data = await resp.json() as { session?: { id?: number }; sessionId?: number; error?: string };
      if (!resp.ok) {
        if (resp.status === 409 && data.sessionId) {
          setLocation(`/student/quiz/${data.sessionId}/review`);
          return;
        }
        setError(data.error ?? "Could not start quiz.");
        return;
      }
      if (data.session?.id) {
        setLocation(`/student/quiz/${data.session.id}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  if (status !== "approved") {
    return (
      <StudentLayout>
        <div className="max-w-lg mx-auto mt-12">
          <Card className="border-yellow-300 bg-yellow-50">
            <CardContent className="py-8 px-6 text-center space-y-4">
              <ShieldAlert className="w-12 h-12 text-yellow-500 mx-auto" />
              <div>
                <h2 className="text-xl font-bold text-yellow-900">
                  {status === "suspended" ? "Account Suspended" : "Account Not Yet Approved"}
                </h2>
                <p className="text-yellow-800 text-sm mt-2">
                  {status === "suspended"
                    ? "Your account has been suspended. Please contact the administrator for assistance."
                    : "Your account is still awaiting admin approval. Once approved, you will be able to take quizzes. Make sure you have paid via Telebirr (0936592186 – Adane F) and entered your receipt number during registration."}
                </p>
              </div>
              <Button variant="outline" className="border-yellow-400 text-yellow-800 hover:bg-yellow-100" onClick={() => setLocation("/student/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          {selectedSubjectId ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => { setSelectedSubjectId(null); setQuestionTypes([]); }}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Subjects
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{selectedSubject?.name}</h1>
                <p className="text-muted-foreground text-sm">Grade {grade} · Choose a question type to start</p>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Start a Quiz</h1>
              <p className="text-muted-foreground">Select a subject to see available question sets</p>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {!selectedSubjectId ? (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  No subjects available for Grade {grade} yet.
                </CardContent>
              </Card>
            ) : (
              filtered.map((s) => {
                const subjectSessions = (sessions ?? []).filter(ss => ss.subjectId === s.id);
                const completedCount = subjectSessions.filter(ss => ss.status === "completed").length;
                return (
                  <Card
                    key={s.id}
                    className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                    onClick={() => setSelectedSubjectId(s.id)}
                  >
                    <CardContent className="py-4 px-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
                        <div>
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.questionCount} questions total</div>
                        </div>
                      </div>
                      {completedCount > 0 && (
                        <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                          {completedCount} set{completedCount !== 1 ? "s" : ""} done
                        </span>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {loadingTypes ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : questionTypes.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  No questions found for this subject.
                </CardContent>
              </Card>
            ) : (
              questionTypes.map((type) => {
                const key = `${selectedSubjectId}__${type.rawType ?? "null"}`;
                const isCompleted = completedKeys.has(key);
                const inProgressId = inProgressMap.get(key);

                return (
                  <Card
                    key={type.questionType}
                    className={cn(
                      "transition-all",
                      isCompleted
                        ? "border-green-300 bg-green-50/50"
                        : "cursor-pointer hover:border-primary/50 hover:shadow-md"
                    )}
                  >
                    <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : inProgressId ? (
                          <PlayCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        ) : (
                          <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold">{type.questionType}</div>
                          <div className="text-xs text-muted-foreground">{type.count} question{type.count !== 1 ? "s" : ""}</div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-400 text-green-700 hover:bg-green-50"
                            onClick={() => {
                              const session = (sessions ?? []).find(
                                ss => ss.subjectId === selectedSubjectId &&
                                  (ss as { questionType?: string | null }).questionType === type.rawType &&
                                  ss.status === "completed"
                              );
                              if (session) setLocation(`/student/quiz/${session.id}/review`);
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Review
                          </Button>
                        ) : inProgressId ? (
                          <Button size="sm" onClick={() => setLocation(`/student/quiz/${inProgressId}`)} disabled={starting}>
                            <PlayCircle className="w-4 h-4 mr-1" /> Resume
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleStart(type)} disabled={starting}>
                            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}

            <div className="pt-2 text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <LockKeyhole className="w-3 h-3" />
                Each question set can only be attempted once
              </p>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
