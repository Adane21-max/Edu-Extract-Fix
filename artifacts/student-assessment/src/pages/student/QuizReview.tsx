import { useState } from "react";
import { useParams, useLocation } from "wouter";
import StudentLayout from "@/components/layout/StudentLayout";
import { useGetSession, useGetFeedback, useGenerateFeedback } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, ChevronLeft, Brain, Trophy, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = ["A", "B", "C", "D"] as const;

export default function QuizReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const id = parseInt(sessionId ?? "0");
  const [generating, setGenerating] = useState(false);

  const { data, isLoading } = useGetSession(id, { query: { enabled: !!id } });
  const { data: feedback, refetch: refetchFeedback } = useGetFeedback(id, {
    query: { enabled: !!id, retry: false }
  });

  const { mutate: genFeedback } = useGenerateFeedback({
    mutation: {
      onMutate: () => setGenerating(true),
      onSettled: () => setGenerating(false),
      onSuccess: () => refetchFeedback(),
    },
  });

  if (isLoading || !data) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  const session = data.session;
  const questions = data.questions;
  const score = session.score ?? 0;
  const correct = session.correctAnswers ?? 0;
  const total = session.totalQuestions;
  const percent = score;
  const questionTypeName = (session as { questionType?: string | null }).questionType ?? null;

  const scoreColor = percent >= 70 ? "text-green-600" : percent >= 50 ? "text-yellow-600" : "text-red-600";

  const optionText = (q: (typeof questions)[0], opt: string) => {
    if (opt === "A") return q.optionA;
    if (opt === "B") return q.optionB;
    if (opt === "C") return q.optionC;
    return q.optionD;
  };

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/student/quiz/start")}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Quiz Review</h1>
            <p className="text-sm text-muted-foreground">
              {session.subjectName}
              {questionTypeName ? ` · ${questionTypeName}` : ""}
              {" · "}Grade {session.grade}
            </p>
          </div>
        </div>

        {/* Score summary */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6 text-center">
            <div className={`text-5xl font-bold mb-1 ${scoreColor}`}>{percent}%</div>
            <div className="text-muted-foreground text-sm mb-4">{correct} of {total} correct</div>
            <div className="flex justify-center gap-6">
              {[
                { icon: Trophy, label: "Score", value: `${percent}%`, color: "text-yellow-500" },
                { icon: Target, label: "Correct", value: correct, color: "text-green-500" },
                { icon: XCircle, label: "Wrong", value: total - correct, color: "text-red-500" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="text-center">
                  <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                  <div className="font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Feedback */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" /> AI Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedback ? (
              <div className="space-y-3 text-sm">
                {feedback.strengths && (
                  <div>
                    <div className="font-semibold text-green-700 mb-1 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Strengths
                    </div>
                    <p className="text-muted-foreground">{feedback.strengths}</p>
                  </div>
                )}
                {feedback.weaknesses && (
                  <div>
                    <div className="font-semibold text-red-600 mb-1 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" /> Areas to Improve
                    </div>
                    <p className="text-muted-foreground">{feedback.weaknesses}</p>
                  </div>
                )}
                {feedback.tips && (
                  <div>
                    <div className="font-semibold text-blue-600 mb-1 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4" /> Study Tips
                    </div>
                    <p className="text-muted-foreground">{feedback.tips}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Get personalized AI feedback on your performance
                </p>
                <Button
                  size="sm"
                  onClick={() => genFeedback({ id })}
                  disabled={generating}
                >
                  {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Brain className="w-4 h-4 mr-2" /> Generate Feedback</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All questions with answers and explanations always shown */}
        <div className="space-y-4">
          <h2 className="font-semibold text-base">All Questions & Answers</h2>
          {questions.map((q, idx) => {
            const isCorrect = q.isCorrect;
            const optLabels: Record<string, string> = {
              A: q.optionA,
              B: q.optionB,
              C: q.optionC,
              D: q.optionD,
            };

            return (
              <Card key={q.id} className={cn("border", isCorrect ? "border-green-200" : "border-red-200")}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2 mb-3">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">Q{idx + 1}</span>
                        <Badge variant={isCorrect ? "default" : "destructive"} className="text-xs py-0">
                          {isCorrect ? "Correct" : "Wrong"}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{q.questionText}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {OPTIONS.map((opt) => {
                      const isSelected = q.selectedOption === opt;
                      const isAns = q.correctOption === opt;
                      const text = optLabels[opt];
                      return (
                        <div
                          key={opt}
                          className={cn(
                            "flex items-start gap-2 text-sm px-3 py-2 rounded-lg",
                            isAns
                              ? "bg-green-100 border border-green-300 text-green-800"
                              : isSelected && !isCorrect
                              ? "bg-red-100 border border-red-300 text-red-800"
                              : "bg-muted/50 text-muted-foreground"
                          )}
                        >
                          <span className="font-bold w-4 flex-shrink-0">{opt}.</span>
                          <span className="flex-1">{text}</span>
                          {isAns && <CheckCircle className="w-4 h-4 flex-shrink-0 text-green-600" />}
                          {isSelected && !isAns && <XCircle className="w-4 h-4 flex-shrink-0 text-red-600" />}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                      <span className="font-semibold">Explanation:</span> {q.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-3 pb-4">
          <Button onClick={() => setLocation("/student/dashboard")} variant="outline" className="flex-1">
            Back to Dashboard
          </Button>
          <Button onClick={() => setLocation("/student/quiz/start")} className="flex-1">
            More Quizzes
          </Button>
        </div>
      </div>
    </StudentLayout>
  );
}
