import { useState } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { useCreateQuestion, useListSubjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];
const QUESTION_TYPES = [
  { value: "model", label: "Model Exam" },
  { value: "test", label: "Unit Test" },
  { value: "quiz", label: "Quiz" },
  { value: "practice", label: "Practice" },
  { value: "other", label: "Other" },
];

interface ParsedQuestion {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
}

function parseQuestions(raw: string): ParsedQuestion[] {
  const lines = raw.trim().split(/\r?\n/);
  const results: ParsedQuestion[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line.match(/^Q\d+[\.:]/i) === null && !line.match(/^\d+[\.:]/)) {
      i++; continue;
    }

    const q: Partial<ParsedQuestion> = {};
    q.text = line.replace(/^(Q\d+|[0-9]+)[\.:]\s*/i, "").trim();
    i++;

    while (i < lines.length) {
      const l = lines[i].trim();
      if (!l) { i++; continue; }
      if (l.match(/^A[\.:]/i)) { q.optionA = l.replace(/^A[\.:]\s*/i, ""); i++; }
      else if (l.match(/^B[\.:]/i)) { q.optionB = l.replace(/^B[\.:]\s*/i, ""); i++; }
      else if (l.match(/^C[\.:]/i)) { q.optionC = l.replace(/^C[\.:]\s*/i, ""); i++; }
      else if (l.match(/^D[\.:]/i)) { q.optionD = l.replace(/^D[\.:]\s*/i, ""); i++; }
      else if (l.match(/^(Answer|Correct|ANS|Key)[\.:]/i)) {
        const ans = l.replace(/^(Answer|Correct|ANS|Key)[\.:]\s*/i, "").trim().toUpperCase();
        if (["A", "B", "C", "D"].includes(ans)) q.correctOption = ans as "A" | "B" | "C" | "D";
        i++;
      }
      else if (l.match(/^(Explanation|Exp)[\.:]/i)) {
        q.explanation = l.replace(/^(Explanation|Exp)[\.:]\s*/i, "");
        i++;
      }
      else break;
    }

    if (q.text && q.optionA && q.optionB && q.optionC && q.optionD && q.correctOption) {
      results.push({
        text: q.text,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        explanation: q.explanation ?? "No explanation provided.",
      });
    }
  }

  return results;
}

export default function AdminQuestionBulk() {
  const [, setLocation] = useLocation();
  const { data: subjects } = useListSubjects();
  const [grade, setGrade] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ParsedQuestion[] | null>(null);
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const [uploading, setUploading] = useState(false);

  const filteredSubjects = grade ? subjects?.filter(s => s.grade === grade) : [];

  const { mutateAsync } = useCreateQuestion();

  const handleParse = () => {
    setParsed(parseQuestions(raw));
    setDone(0); setFailed(0);
  };

  const handleUpload = async () => {
    if (!parsed || !subjectId || !grade) return;
    setUploading(true);
    let d = 0; let f = 0;
    for (const q of parsed) {
      try {
        await mutateAsync({ data: { ...q, subjectId: parseInt(subjectId), grade, difficulty: "medium", questionType: questionType || undefined } as Parameters<typeof mutateAsync>[0]["data"] });
        d++;
      } catch { f++; }
    }
    setDone(d); setFailed(f);
    setUploading(false);
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/questions")}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Bulk Add Questions</h1>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Format Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Each question must follow this exact structure. Separate questions with a blank line.
              <span className="text-destructive font-medium"> All fields except Explanation are required.</span>
            </p>
            <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed font-mono">
{`Q1. What is the capital of Ethiopia?
A. Nairobi
B. Addis Ababa
C. Cairo
D. Lagos
Answer: B
Explanation: Addis Ababa is the capital city of Ethiopia.

Q2. Which gas do plants absorb during photosynthesis?
A. Oxygen
B. Nitrogen
C. Carbon Dioxide
D. Hydrogen
Answer: C
Explanation: Plants absorb CO2 and release O2 during photosynthesis.

Q3. What is 7 multiplied by 8?
A. 54
B. 56
C. 64
D. 48
Answer: B
Explanation: 7 × 8 = 56.`}
            </pre>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5 text-xs text-amber-800">
              <p className="font-semibold">Rules to follow:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>Start each question with <code className="bg-amber-100 px-1 rounded">Q1.</code> <code className="bg-amber-100 px-1 rounded">Q2.</code> etc. (or just <code className="bg-amber-100 px-1 rounded">1.</code> <code className="bg-amber-100 px-1 rounded">2.</code>)</li>
                <li>Options must be labeled <code className="bg-amber-100 px-1 rounded">A.</code> <code className="bg-amber-100 px-1 rounded">B.</code> <code className="bg-amber-100 px-1 rounded">C.</code> <code className="bg-amber-100 px-1 rounded">D.</code></li>
                <li>Answer line must say <code className="bg-amber-100 px-1 rounded">Answer: A</code> (or B, C, or D)</li>
                <li>Explanation is optional but recommended</li>
                <li>Leave a blank line between questions</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-5">
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

            <div className="space-y-1.5">
              <Label>Question Type <span className="text-muted-foreground font-normal">(optional — applies to all questions in this batch)</span></Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger><SelectValue placeholder="Select type — e.g. Model Exam, Unit Test..." /></SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Paste Questions</Label>
              <Textarea
                rows={12}
                placeholder="Paste your questions in the format shown above..."
                value={raw}
                onChange={(e) => { setRaw(e.target.value); setParsed(null); }}
              />
            </div>

            <Button variant="outline" onClick={handleParse} disabled={!raw.trim()}>
              Parse Questions
            </Button>

            {parsed !== null && (
              <div>
                {parsed.length === 0 ? (
                  <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4" /> No valid questions found. Check your format.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                      <CheckCircle className="w-4 h-4" /> Found {parsed.length} valid question{parsed.length > 1 ? "s" : ""} ready to upload.
                    </div>
                    {done > 0 && (
                      <div className="text-sm text-green-700">
                        Uploaded {done}/{parsed.length} successfully. {failed > 0 ? `${failed} failed.` : ""}
                      </div>
                    )}
                    <Button
                      className="w-full"
                      onClick={handleUpload}
                      disabled={!subjectId || !grade || uploading || done === parsed.length}
                    >
                      {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> :
                        done === parsed.length && done > 0 ? `All ${done} uploaded!` :
                        `Upload ${parsed.length} Question${parsed.length > 1 ? "s" : ""}`}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
