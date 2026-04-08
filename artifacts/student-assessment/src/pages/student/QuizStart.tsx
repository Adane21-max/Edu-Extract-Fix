import { useState } from "react";
import { useLocation } from "wouter";
import StudentLayout from "@/components/layout/StudentLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useListSubjects, useCreateSession } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BookOpen, Loader2, AlertCircle } from "lucide-react";

export default function QuizStart() {
  const { auth, studentId } = useAuth();
  const [, setLocation] = useLocation();
  const grade = auth?.user?.grade ?? "";

  const [subjectId, setSubjectId] = useState<string>("");
  const [questionCount, setQuestionCount] = useState("10");
  const [error, setError] = useState("");

  const { data: subjects } = useListSubjects();
  const filtered = subjects?.filter((s) => s.grade === grade && s.questionCount > 0) ?? [];

  const { mutate, isPending } = useCreateSession({
    mutation: {
      onSuccess(data) {
        setLocation(`/student/quiz/${data.session.id}`);
      },
      onError(err) {
        const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Could not start quiz.";
        setError(msg);
      },
    },
  });

  const handleStart = () => {
    if (!subjectId || !studentId) return;
    setError("");
    mutate({
      data: {
        studentId,
        subjectId: parseInt(subjectId),
        grade,
        questionCount: parseInt(questionCount),
      },
    });
  };

  return (
    <StudentLayout>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Start a Quiz</h1>
          <p className="text-muted-foreground">Choose a subject and we'll pick random questions for you</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4 text-primary" /> Quiz Setup
            </CardTitle>
            <CardDescription>Grade {grade} — {filtered.length} subject(s) available</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subject..." />
                </SelectTrigger>
                <SelectContent>
                  {filtered.length === 0 ? (
                    <SelectItem value="__none" disabled>No subjects available for Grade {grade}</SelectItem>
                  ) : (
                    filtered.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.questionCount} questions)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Number of Questions</Label>
              <Input
                type="number"
                min={5}
                max={30}
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Between 5 and 30 questions</p>
            </div>

            <Button
              onClick={handleStart}
              disabled={!subjectId || isPending || filtered.length === 0}
              className="w-full"
            >
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</> : "Start Quiz"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
