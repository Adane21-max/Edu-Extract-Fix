import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FlaskConical, Trash2, PlusCircle, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FreeTrialQ {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  createdAt: string;
}

const empty = { question: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "", explanation: "" };

export default function AdminFreeTrialQuestions() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...empty });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { data: questions, isLoading } = useQuery<FreeTrialQ[]>({
    queryKey: ["free-trial-questions"],
    queryFn: async () => {
      const r = await fetch("/api/free-trial-questions");
      if (!r.ok) throw new Error("Failed to load");
      return r.json() as Promise<FreeTrialQ[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const r = await fetch("/api/free-trial-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["free-trial-questions"] });
      setForm({ ...empty });
      setSuccess(true);
      setError("");
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: () => setError("Failed to add question."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/free-trial-questions/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["free-trial-questions"] }),
  });

  const set = (field: keyof typeof form, val: string) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.question || !form.optionA || !form.optionB || !form.optionC || !form.optionD || !form.correctAnswer) {
      setError("All fields except explanation are required.");
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" /> Free Trial Questions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            These questions appear in the Free Trial Quiz — available to all students before payment.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary" /> Add Question
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {success && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                  <CheckCircle className="w-4 h-4" /> Question added!
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Question</Label>
                <Textarea rows={3} placeholder="Enter the question text..." value={form.question} onChange={e => set("question", e.target.value)} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["A", "B", "C", "D"] as const).map(letter => (
                  <div key={letter} className="space-y-1.5">
                    <Label>Option {letter}</Label>
                    <Input
                      placeholder={`Option ${letter}`}
                      value={form[`option${letter}` as keyof typeof form]}
                      onChange={e => set(`option${letter}` as keyof typeof form, e.target.value)}
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>Correct Answer</Label>
                <Select value={form.correctAnswer} onValueChange={v => set("correctAnswer", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {["A", "B", "C", "D"].map(l => (
                      <SelectItem key={l} value={l}>Option {l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Explanation <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea rows={2} placeholder="Explain why this is the correct answer..." value={form.explanation} onChange={e => set("explanation", e.target.value)} />
              </div>

              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : <><PlusCircle className="w-4 h-4 mr-2" /> Add Question</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Questions ({questions?.length ?? 0})
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (questions ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No free trial questions yet. Add some above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(questions ?? []).map((q, i) => (
                <Card key={q.id}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Q{i + 1}</div>
                        <p className="font-medium text-sm">{q.question}</p>
                        <div className="grid grid-cols-2 gap-x-4 mt-2 text-xs text-muted-foreground">
                          {["A", "B", "C", "D"].map(l => (
                            <span key={l} className={l === q.correctAnswer ? "text-green-700 font-semibold" : ""}>
                              {l}: {q[`option${l}` as keyof FreeTrialQ] as string}
                              {l === q.correctAnswer ? " ✓" : ""}
                            </span>
                          ))}
                        </div>
                        {q.explanation && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{q.explanation}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => deleteMutation.mutate(q.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
