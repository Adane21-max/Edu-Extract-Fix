import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListSubjects, useListSessions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen, Loader2, AlertCircle, CheckCircle2, LockKeyhole,
  PlayCircle, ChevronLeft, FlaskConical, ChevronRight, Trophy,
  CreditCard, CheckCheck, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionTypeInfo { questionType: string; rawType: string | null; count: number; }
interface FreeTrialQ {
  id: number; question: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctAnswer: string; explanation: string;
}

type Mode = "home" | "freeTrial" | "mainQuiz";
type FTStep = "quiz" | "results";

export default function QuizStart() {
  const { auth, studentId } = useAuth();
  const [, setLocation] = useLocation();
  const grade = auth?.user?.grade ?? "";
  const status = auth?.user?.status ?? "pending";
  const isApproved = status === "approved";

  // Free trial state
  const [mode, setMode] = useState<Mode>("home");
  const [ftStep, setFTStep] = useState<FTStep>("quiz");
  const [ftAnswers, setFTAnswers] = useState<Record<number, string>>({});
  const [ftSubmitted, setFTSubmitted] = useState(false);
  const [ftCurrentIdx, setFTCurrentIdx] = useState(0);
  const [freeTrialDone, setFreeTrialDone] = useState(false);

  // Payment state (for pending/suspended)
  const [receipt, setReceipt] = useState("");
  const [receiptSubmitting, setReceiptSubmitting] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);
  const [receiptError, setReceiptError] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  // Main quiz state
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
  const { data: freeTrialQuestions, isLoading: loadingFT } = useQuery<FreeTrialQ[]>({
    queryKey: ["free-trial-questions"],
    queryFn: async () => {
      const r = await fetch("/api/free-trial-questions");
      if (!r.ok) return [];
      return r.json() as Promise<FreeTrialQ[]>;
    },
  });

  // Check if free trial was already completed (localStorage)
  useEffect(() => {
    if (studentId) {
      const done = localStorage.getItem(`ft_done_${studentId}`);
      if (done) setFreeTrialDone(true);
    }
  }, [studentId]);

  // Check if receipt already submitted
  useEffect(() => {
    if (auth?.user && (auth.user as { telebirrReceipt?: string | null }).telebirrReceipt) {
      setReceiptSent(true);
    }
  }, [auth]);

  const ftQuestions = freeTrialQuestions ?? [];
  const currentFTQ = ftQuestions[ftCurrentIdx];

  const handleFTAnswer = (answer: string) => {
    if (!currentFTQ) return;
    setFTAnswers(prev => ({ ...prev, [currentFTQ.id]: answer }));
  };

  const handleFTNext = () => {
    if (ftCurrentIdx < ftQuestions.length - 1) {
      setFTCurrentIdx(i => i + 1);
    }
  };

  const handleFTSubmit = () => {
    if (studentId) localStorage.setItem(`ft_done_${studentId}`, "1");
    setFreeTrialDone(true);
    setFtSubmitted(true);
    setFtStep("results");
  };

  const ftScore = ftSubmitted
    ? ftQuestions.filter(q => ftAnswers[q.id] === q.correctAnswer).length
    : 0;

  // Main quiz helpers
  const filtered = subjects?.filter((s) => s.grade === grade && s.questionCount > 0) ?? [];
  const selectedSubject = filtered.find(s => s.id === selectedSubjectId);
  const completedKeys = new Set<string>(
    (sessions ?? []).filter(s => s.status === "completed")
      .map(s => `${s.subjectId}__${(s as { questionType?: string | null }).questionType ?? "null"}`)
  );
  const inProgressMap = new Map<string, number>(
    (sessions ?? []).filter(s => s.status === "in_progress")
      .map(s => [`${s.subjectId}__${(s as { questionType?: string | null }).questionType ?? "null"}`, s.id])
  );

  useEffect(() => {
    if (!selectedSubjectId || !grade) { setQuestionTypes([]); return; }
    setLoadingTypes(true);
    setError("");
    fetch(`/api/questions/types?subjectId=${selectedSubjectId}&grade=${grade}`)
      .then(r => r.json()).then((data: QuestionTypeInfo[]) => setQuestionTypes(data))
      .catch(() => setError("Failed to load question types"))
      .finally(() => setLoadingTypes(false));
  }, [selectedSubjectId, grade]);

  const handleStart = async (type: QuestionTypeInfo) => {
    if (!studentId || !selectedSubjectId) return;
    setError("");
    setStarting(true);
    try {
      const resp = await fetch("/api/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, subjectId: selectedSubjectId, grade, questionType: type.rawType }),
      });
      const data = await resp.json() as { session?: { id?: number }; sessionId?: number; error?: string };
      if (!resp.ok) {
        if (resp.status === 409 && data.sessionId) { setLocation(`/student/quiz/${data.sessionId}/review`); return; }
        setError(data.error ?? "Could not start quiz."); return;
      }
      if (data.session?.id) setLocation(`/student/quiz/${data.session.id}`);
    } catch { setError("Network error. Please try again."); }
    finally { setStarting(false); }
  };

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receipt.trim() || !studentId) return;
    setReceiptSubmitting(true);
    setReceiptError("");
    try {
      const r = await fetch(`/api/students/${studentId}/receipt`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipt: receipt.trim() }),
      });
      if (!r.ok) { setReceiptError("Failed to submit. Please try again."); return; }
      setReceiptSent(true);
    } catch { setReceiptError("Network error. Please try again."); }
    finally { setReceiptSubmitting(false); }
  };

  // ─── Free Trial Quiz ──────────────────────────────────────────────────────
  if (mode === "freeTrial") {
    if (loadingFT) return (
      <StudentLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </StudentLayout>
    );

    if (ftQuestions.length === 0) return (
      <StudentLayout>
        <div className="max-w-xl mx-auto mt-8">
          <Button variant="ghost" size="sm" onClick={() => setMode("home")} className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No free trial questions have been added yet. Check back soon!
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );

    if (ftStep === "results") return (
      <StudentLayout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold">Free Trial Complete!</h1>
            <p className="text-muted-foreground mt-1">You scored <strong>{ftScore}</strong> out of <strong>{ftQuestions.length}</strong></p>
          </div>

          {!isApproved && (
            <Card className="mb-5 border-blue-200 bg-blue-50">
              <CardContent className="py-4 px-5 text-sm text-blue-900">
                <strong>Ready for full access?</strong> Pay 1000 birr via Telebirr and get approved to unlock all quizzes!
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {ftQuestions.map((q, i) => {
              const chosen = ftAnswers[q.id];
              const correct = q.correctAnswer;
              const isRight = chosen === correct;
              return (
                <Card key={q.id} className={cn("border", isRight ? "border-green-300 bg-green-50/40" : "border-red-200 bg-red-50/40")}>
                  <CardContent className="py-4 px-5">
                    <p className="font-medium text-sm mb-3"><span className="text-muted-foreground mr-1">Q{i + 1}.</span>{q.question}</p>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {(["A", "B", "C", "D"] as const).map(l => {
                        const val = q[`option${l}` as keyof FreeTrialQ] as string;
                        const isCorrect = l === correct;
                        const isChosen = l === chosen;
                        return (
                          <div key={l} className={cn(
                            "px-2.5 py-1.5 rounded-md border",
                            isCorrect ? "bg-green-100 border-green-400 text-green-800 font-medium" :
                              isChosen && !isCorrect ? "bg-red-100 border-red-300 text-red-800" :
                                "bg-muted/30 border-border text-muted-foreground"
                          )}>
                            <span className="font-semibold mr-1">{l}:</span> {val}
                            {isCorrect && " ✓"}
                            {isChosen && !isCorrect && " ✗"}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground mt-2 italic border-t pt-2">{q.explanation}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => { setMode("home"); setFtStep("quiz"); setFTAnswers({}); setFTCurrentIdx(0); setFtSubmitted(false); }}>
              Back to Home
            </Button>
            {!isApproved && (
              <Button onClick={() => { setMode("home"); setShowPayment(true); }}>
                Unlock Full Access <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </StudentLayout>
    );

    // Quiz taking
    return (
      <StudentLayout>
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setMode("home")}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2"><FlaskConical className="w-5 h-5 text-primary" /> Free Trial Quiz</h1>
              <p className="text-muted-foreground text-xs">Question {ftCurrentIdx + 1} of {ftQuestions.length}</p>
            </div>
          </div>

          {currentFTQ && (
            <Card>
              <CardContent className="py-6 px-6 space-y-4">
                <p className="font-semibold">{currentFTQ.question}</p>
                <div className="space-y-2">
                  {(["A", "B", "C", "D"] as const).map(l => {
                    const val = currentFTQ[`option${l}` as keyof FreeTrialQ] as string;
                    const chosen = ftAnswers[currentFTQ.id] === l;
                    return (
                      <button
                        key={l}
                        onClick={() => handleFTAnswer(l)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors",
                          chosen
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/30 border-border hover:bg-muted/60"
                        )}
                      >
                        <span className="font-semibold mr-2">{l}.</span>{val}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-2">
                  {ftCurrentIdx > 0 ? (
                    <Button variant="outline" size="sm" onClick={() => setFTCurrentIdx(i => i - 1)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                  ) : <div />}

                  {ftCurrentIdx < ftQuestions.length - 1 ? (
                    <Button size="sm" onClick={handleFTNext} disabled={!ftAnswers[currentFTQ.id]}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleFTSubmit}
                      disabled={Object.keys(ftAnswers).length < ftQuestions.length}>
                      <CheckCheck className="w-4 h-4 mr-1" /> Submit Quiz
                    </Button>
                  )}
                </div>

                {/* Progress dots */}
                <div className="flex gap-1 justify-center pt-1">
                  {ftQuestions.map((q, i) => (
                    <button
                      key={q.id}
                      onClick={() => setFTCurrentIdx(i)}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full transition-colors",
                        i === ftCurrentIdx ? "bg-primary" : ftAnswers[q.id] ? "bg-primary/40" : "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </StudentLayout>
    );
  }

  // ─── Main Quiz (approved only) ────────────────────────────────────────────
  if (mode === "mainQuiz" && isApproved) {
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
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setMode("home")}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Take a Quiz</h1>
                  <p className="text-muted-foreground">Select a subject to see available question sets</p>
                </div>
              </div>
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
                <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No subjects available for Grade {grade} yet.</CardContent></Card>
              ) : filtered.map((s) => {
                const completedCount = (sessions ?? []).filter(ss => ss.subjectId === s.id && ss.status === "completed").length;
                return (
                  <Card key={s.id} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => setSelectedSubjectId(s.id)}>
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
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {loadingTypes ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : questionTypes.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No questions found for this subject.</CardContent></Card>
              ) : questionTypes.map((type) => {
                const key = `${selectedSubjectId}__${type.rawType ?? "null"}`;
                const isCompleted = completedKeys.has(key);
                const inProgressId = inProgressMap.get(key);
                return (
                  <Card key={type.questionType} className={cn("transition-all", isCompleted ? "border-green-300 bg-green-50/50" : "cursor-pointer hover:border-primary/50 hover:shadow-md")}>
                    <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {isCompleted ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> :
                          inProgressId ? <PlayCircle className="w-5 h-5 text-primary flex-shrink-0" /> :
                            <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />}
                        <div>
                          <div className="font-semibold">{type.questionType}</div>
                          <div className="text-xs text-muted-foreground">{type.count} question{type.count !== 1 ? "s" : ""}</div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <Button size="sm" variant="outline" className="border-green-400 text-green-700 hover:bg-green-50" onClick={() => {
                            const session = (sessions ?? []).find(ss => ss.subjectId === selectedSubjectId && (ss as { questionType?: string | null }).questionType === type.rawType && ss.status === "completed");
                            if (session) setLocation(`/student/quiz/${session.id}/review`);
                          }}>
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
              })}
              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <LockKeyhole className="w-3 h-3" /> Each question set can only be attempted once
                </p>
              </div>
            </div>
          )}
        </div>
      </StudentLayout>
    );
  }

  // ─── Home ─────────────────────────────────────────────────────────────────
  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Quizzes</h1>
          <p className="text-muted-foreground">Choose how you'd like to practice</p>
        </div>

        {/* Free Trial Section */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <FlaskConical className="w-4 h-4" /> Free Trial — Try Before You Pay
          </h2>
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="py-5 px-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FlaskConical className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-blue-900">Free Trial Quiz</h3>
                  <p className="text-sm text-blue-700 mt-0.5">
                    Try {ftQuestions.length > 0 ? `${ftQuestions.length} sample` : "sample"} questions — no payment needed!
                    See how our platform works before unlocking full access.
                  </p>
                  {freeTrialDone && (
                    <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> You've already completed the free trial
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-700"
                  onClick={() => { setFtStep("quiz"); setFTAnswers({}); setFTCurrentIdx(0); setFtSubmitted(false); setMode("freeTrial"); }}
                >
                  {freeTrialDone ? "Retry" : "Start"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Take a Quiz Section */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Full Quizzes
          </h2>

          {isApproved ? (
            <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all border-primary/30"
              onClick={() => setMode("mainQuiz")}>
              <CardContent className="py-5 px-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Take a Quiz</h3>
                    <p className="text-sm text-muted-foreground">Choose subject & question type to start</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <>
              {!showPayment ? (
                <Card className="border-dashed border-2">
                  <CardContent className="py-5 px-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                        <LockKeyhole className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">Take a Quiz</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {!freeTrialDone
                            ? "Try the Free Trial Quiz above first, then unlock full access."
                            : "Unlock full access to all quizzes with a one-time payment."}
                        </p>
                        {receiptSent ? (
                          <p className="text-sm text-green-700 mt-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Receipt submitted — awaiting admin approval
                          </p>
                        ) : (
                          <Button size="sm" className="mt-3" onClick={() => setShowPayment(true)}>
                            <CreditCard className="w-4 h-4 mr-1.5" /> Pay & Unlock
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : receiptSent ? (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="py-5 px-5 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                    <h3 className="font-semibold text-green-900">Receipt Submitted!</h3>
                    <p className="text-sm text-green-800">Your payment receipt has been submitted. Please wait for admin approval — usually within 24 hours.</p>
                    <Button variant="outline" size="sm" onClick={() => setShowPayment(false)}>Back</Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-primary/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" /> Complete Payment to Unlock
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900 space-y-1">
                      <p className="font-semibold">How to pay:</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-800">
                        <li>Open your <strong>Telebirr</strong> app</li>
                        <li>Send <strong>1000 birr</strong> to <strong className="text-blue-900">0936592186</strong> (Adane F)</li>
                        <li>Copy the receipt / transaction number you receive</li>
                        <li>Paste it below and click Submit</li>
                      </ol>
                      <p className="mt-2 text-blue-700 text-xs">Your account will be approved within 24 hours after receipt verification.</p>
                    </div>

                    <form onSubmit={handleReceiptSubmit} className="space-y-3">
                      {receiptError && (
                        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                          <AlertCircle className="w-4 h-4" /> {receiptError}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label htmlFor="receipt">Telebirr Receipt / Transaction Number</Label>
                        <Input
                          id="receipt"
                          placeholder="e.g. TBR-2024-XXXXXX"
                          value={receipt}
                          onChange={e => setReceipt(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={receiptSubmitting || !receipt.trim()}>
                          {receiptSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4 mr-1.5" /> Submit Receipt</>}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setShowPayment(false)}>Cancel</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </section>
      </div>
    </StudentLayout>
  );
}
