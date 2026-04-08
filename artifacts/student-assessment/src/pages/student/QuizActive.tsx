import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import StudentLayout from "@/components/layout/StudentLayout";
import { useGetSession, useSubmitSession } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChevronLeft, ChevronRight, SendHorizonal, AlertCircle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = ["A", "B", "C", "D"] as const;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QuizActive() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const id = parseInt(sessionId ?? "0");

  const { data, isLoading } = useGetSession(id, { query: { enabled: !!id } });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [startTime] = useState(Date.now());
  const [error, setError] = useState("");

  const timerMinutes = (data?.session as { subjectTimerMinutes?: number | null } | undefined)?.subjectTimerMinutes ?? null;
  const totalSeconds = timerMinutes ? timerMinutes * 60 : null;
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);

  const { mutate: submit, isPending: submitting } = useSubmitSession({
    mutation: {
      onSuccess() {
        setLocation(`/student/quiz/${id}/review`);
      },
      onError(err) {
        const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Submission failed.";
        setError(msg);
      },
    },
  });

  const handleSubmit = useCallback((currentAnswers?: Record<number, string>) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    const ans = Object.entries(currentAnswers ?? answers).map(([qId, opt]) => ({
      questionId: parseInt(qId),
      selectedOption: opt as "A" | "B" | "C" | "D",
    }));
    submit({ id, data: { answers: ans, timeTaken } });
  }, [answers, startTime, id, submit]);

  useEffect(() => {
    if (data?.session.status === "completed") {
      setLocation(`/student/quiz/${id}/review`);
    }
  }, [data]);

  useEffect(() => {
    if (totalSeconds && timeLeft === null && data) {
      setTimeLeft(totalSeconds);
    }
  }, [totalSeconds, data]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleSubmit(answers);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft === null ? null : "started"]);

  useEffect(() => {
    if (timeLeft === 0 && !submittedRef.current) {
      handleSubmit(answers);
    }
  }, [timeLeft]);

  if (isLoading || !data) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  const questions = data.questions;
  const current = questions[currentIdx];
  const totalQ = questions.length;
  const answered = Object.keys(answers).length;

  const handleSelect = (opt: string) => {
    setAnswers((prev) => ({ ...prev, [current.questionId]: opt }));
  };

  const optionLabels: Record<string, string> = {
    A: current.optionA,
    B: current.optionB,
    C: current.optionC,
    D: current.optionD,
  };

  const selected = answers[current.questionId];
  const isTimerWarning = timeLeft !== null && timeLeft <= 60;

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">
              Question {currentIdx + 1} of {totalQ}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {answered}/{totalQ} answered
              </span>
              {timeLeft !== null && (
                <span className={cn(
                  "flex items-center gap-1 text-sm font-mono font-semibold px-2 py-0.5 rounded",
                  isTimerWarning ? "text-red-600 bg-red-50 border border-red-200 animate-pulse" : "text-amber-700 bg-amber-50 border border-amber-200"
                )}>
                  <Timer className="w-3.5 h-3.5" />
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>
          </div>
          <Progress value={((currentIdx + 1) / totalQ) * 100} className="h-2" />
        </div>

        {isTimerWarning && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            <Timer className="w-4 h-4 flex-shrink-0" />
            Less than 1 minute remaining! Your quiz will be submitted automatically.
          </div>
        )}

        <Card className="mb-4">
          <CardContent className="pt-6">
            <p className="text-base font-medium leading-relaxed mb-6">{current.questionText}</p>

            <div className="space-y-3">
              {OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 rounded-xl border-2 text-sm text-left transition-all",
                    selected === opt
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <span className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2",
                    selected === opt
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {opt}
                  </span>
                  {optionLabels[opt]}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 mb-4">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>

          <div className="flex flex-wrap gap-1 justify-center">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                className={cn(
                  "w-7 h-7 rounded text-xs font-medium transition-colors",
                  i === currentIdx ? "bg-primary text-primary-foreground" :
                  answers[questions[i].questionId] ? "bg-green-100 text-green-800" :
                  "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentIdx < totalQ - 1 ? (
            <Button onClick={() => setCurrentIdx((i) => Math.min(totalQ - 1, i + 1))}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => handleSubmit()}
              disabled={submitting || answered < totalQ}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> :
                answered < totalQ ? `Answer ${totalQ - answered} more` :
                <><SendHorizonal className="w-4 h-4 mr-2" /> Submit</>}
            </Button>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
