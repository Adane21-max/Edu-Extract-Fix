import { useState } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { useCreateQuestion, useListSubjects } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2, CheckCircle } from "lucide-react";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];
const QUESTION_TYPES = [
  { value: "model", label: "Model Exam" },
  { value: "test", label: "Unit Test" },
  { value: "quiz", label: "Quiz" },
  { value: "practice", label: "Practice" },
  { value: "other", label: "Other" },
];

export default function AdminQuestionNew() {
  const [, setLocation] = useLocation();
  const { data: subjects } = useListSubjects();

  const [subjectId, setSubjectId] = useState("");
  const [grade, setGrade] = useState("");
  const [text, setText] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [correct, setCorrect] = useState<"A" | "B" | "C" | "D" | "">("");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionType, setQuestionType] = useState("");
  const [success, setSuccess] = useState(false);

  const filteredSubjects = grade ? subjects?.filter(s => s.grade === grade) : subjects ?? [];

  const { mutate: createQ, isPending } = useCreateQuestion({
    mutation: {
      onSuccess() {
        setSuccess(true);
        setText(""); setOptA(""); setOptB(""); setOptC(""); setOptD(""); setCorrect(""); setExplanation(""); setQuestionType("");
        setTimeout(() => setSuccess(false), 3000);
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !grade || !correct) return;
    createQ({
      data: {
        subjectId: parseInt(subjectId),
        grade,
        text,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctOption: correct as "A" | "B" | "C" | "D",
        explanation,
        difficulty,
        questionType: questionType || undefined,
      } as Parameters<typeof createQ>[0]["data"],
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/questions")}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Add New Question</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {success && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                  <CheckCircle className="w-4 h-4" /> Question added successfully!
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Grade</Label>
                  <Select value={grade} onValueChange={(v) => { setGrade(v); setSubjectId(""); }}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADES.map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId} disabled={!grade}>
                    <SelectTrigger><SelectValue placeholder={grade ? "Select subject" : "Pick grade first"} /></SelectTrigger>
                    <SelectContent>
                      {filteredSubjects?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Question Type</Label>
                  <Select value={questionType} onValueChange={setQuestionType}>
                    <SelectTrigger><SelectValue placeholder="Select type (optional)" /></SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Question Text</Label>
                <Textarea placeholder="Type the question here..." value={text} onChange={(e) => setText(e.target.value)} rows={3} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {["A", "B", "C", "D"].map((opt) => {
                  const val = opt === "A" ? optA : opt === "B" ? optB : opt === "C" ? optC : optD;
                  const setter = opt === "A" ? setOptA : opt === "B" ? setOptB : opt === "C" ? setOptC : setOptD;
                  return (
                    <div key={opt} className="space-y-1.5">
                      <Label>Option {opt}</Label>
                      <Input placeholder={`Option ${opt}`} value={val} onChange={(e) => setter(e.target.value)} required />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <Label>Correct Answer</Label>
                <Select value={correct} onValueChange={(v) => setCorrect(v as "A" | "B" | "C" | "D")}>
                  <SelectTrigger><SelectValue placeholder="Select correct answer" /></SelectTrigger>
                  <SelectContent>
                    {["A", "B", "C", "D"].map(o => <SelectItem key={o} value={o}>Option {o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Explanation</Label>
                <Textarea placeholder="Explain why this answer is correct..." value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} required />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setLocation("/admin/questions")} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !subjectId || !grade || !correct} className="flex-1">
                  {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : "Add Question"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
