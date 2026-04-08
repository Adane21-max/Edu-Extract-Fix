import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useListQuestions, useDeleteQuestion, useListSubjects } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, BookOpen, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getListQuestionsQueryKey } from "@workspace/api-client-react";

const GRADES = ["all", "6", "7", "8", "9", "10", "11", "12"];

const TYPE_COLORS: Record<string, string> = {
  model: "bg-purple-100 text-purple-800",
  test: "bg-blue-100 text-blue-800",
  quiz: "bg-cyan-100 text-cyan-800",
  practice: "bg-teal-100 text-teal-800",
  other: "bg-gray-100 text-gray-700",
};

const TYPE_LABELS: Record<string, string> = {
  model: "Model Exam",
  test: "Unit Test",
  quiz: "Quiz",
  practice: "Practice",
  other: "Other",
};

export default function AdminQuestions() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");

  const { data: subjects } = useListSubjects();
  const { data: questions, isLoading } = useListQuestions(
    {
      grade: filterGrade !== "all" ? filterGrade : undefined,
      subjectId: filterSubject !== "all" ? parseInt(filterSubject) : undefined,
    }
  );

  const { mutate: deleteQ } = useDeleteQuestion({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
      },
    },
  });

  const filtered = (questions ?? []).filter(q =>
    search === "" || q.text.toLowerCase().includes(search.toLowerCase())
  );

  const difficultyBadge = (d: string) => {
    if (d === "easy") return <Badge className="bg-green-100 text-green-800 text-xs">Easy</Badge>;
    if (d === "hard") return <Badge className="bg-red-100 text-red-800 text-xs">Hard</Badge>;
    return <Badge variant="secondary" className="text-xs">Medium</Badge>;
  };

  const typeBadge = (t: string | null | undefined) => {
    if (!t) return null;
    const color = TYPE_COLORS[t] ?? "bg-gray-100 text-gray-700";
    const label = TYPE_LABELS[t] ?? t;
    return <Badge className={`${color} text-xs`}>{label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Questions</h1>
            <p className="text-muted-foreground">{questions?.length ?? 0} question{questions?.length !== 1 ? "s" : ""} total</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/admin/questions/bulk")}>
              <FileText className="w-4 h-4 mr-2" /> Bulk Add
            </Button>
            <Button onClick={() => setLocation("/admin/questions/new")}>
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRADES.map(g => <SelectItem key={g} value={g}>{g === "all" ? "All Grades" : `Grade ${g}`}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} (G{s.grade})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground">Loading questions...</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No questions found
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((q) => (
                  <div key={q.id} className="px-5 py-4 hover:bg-muted/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-muted-foreground font-mono">#{q.id}</span>
                          <Badge variant="outline" className="text-xs">G{q.grade}</Badge>
                          {q.subjectName && <Badge variant="outline" className="text-xs">{q.subjectName}</Badge>}
                          {difficultyBadge(q.difficulty)}
                          {typeBadge((q as { questionType?: string | null }).questionType)}
                        </div>
                        <p className="text-sm font-medium leading-snug line-clamp-2">{q.text}</p>
                        <div className="grid grid-cols-2 gap-x-4 mt-2">
                          {["A", "B", "C", "D"].map(opt => {
                            const text = opt === "A" ? q.optionA : opt === "B" ? q.optionB : opt === "C" ? q.optionC : q.optionD;
                            const isCorrect = q.correctOption === opt;
                            return (
                              <div key={opt} className={`text-xs flex gap-1 ${isCorrect ? "text-green-700 font-semibold" : "text-muted-foreground"}`}>
                                <span>{opt}.</span>
                                <span className="truncate">{text}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => deleteQ({ id: q.id })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
