import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useListSubjects, useCreateSubject, useDeleteSubject } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, FolderOpen, BookOpen, Loader2, Timer, Pencil } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListSubjectsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

type SubjectRow = {
  id: number;
  name: string;
  grade: string;
  description?: string | null;
  timerMinutes?: number | null;
  questionCount: number;
};

export default function AdminSubjects() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: subjects, isLoading } = useListSubjects();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [desc, setDesc] = useState("");
  const [timer, setTimer] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<SubjectRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTimer, setEditTimer] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const { mutate: createSubject, isPending: creating } = useCreateSubject({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
        setCreateOpen(false);
        setName(""); setGrade(""); setDesc(""); setTimer("");
      },
    },
  });

  const { mutate: deleteSubject } = useDeleteSubject({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
      },
    },
  });

  const openEdit = (s: SubjectRow) => {
    setEditSubject(s);
    setEditName(s.name);
    setEditGrade(s.grade);
    setEditDesc(s.description ?? "");
    setEditTimer(s.timerMinutes ? String(s.timerMinutes) : "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editSubject) return;
    setEditSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editName !== editSubject.name) body.name = editName;
      if (editGrade !== editSubject.grade) body.grade = editGrade;
      body.description = editDesc || null;
      body.timerMinutes = editTimer ? parseInt(editTimer, 10) : null;

      const res = await fetch(`/api/subjects/${editSubject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      queryClient.invalidateQueries({ queryKey: getListSubjectsQueryKey() });
      setEditOpen(false);
      toast({ title: "Subject updated" });
    } catch {
      toast({ title: "Failed to update subject", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const byGrade: Record<string, SubjectRow[]> = {};
  for (const s of (subjects ?? []) as SubjectRow[]) {
    if (!byGrade[s.grade]) byGrade[s.grade] = [];
    byGrade[s.grade]!.push(s);
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Subjects</h1>
            <p className="text-muted-foreground">{subjects?.length ?? 0} subjects across all grades</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Subject</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Subject</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Subject Name</Label>
                  <Input placeholder="e.g. Mathematics, Physics" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Grade</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADES.map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Input placeholder="Brief description" value={desc} onChange={(e) => setDesc(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Timer className="w-4 h-4" /> Quiz Timer (minutes, optional)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 30 (leave empty for no timer)"
                    value={timer}
                    min={1}
                    max={180}
                    onChange={(e) => setTimer(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Students will be auto-submitted when time runs out.</p>
                </div>
                <Button
                  className="w-full"
                  disabled={!name || !grade || creating}
                  onClick={() => createSubject({
                    data: {
                      name,
                      grade,
                      description: desc || undefined,
                      timerMinutes: timer ? parseInt(timer) : undefined,
                    } as Parameters<typeof createSubject>[0]["data"],
                  })}
                >
                  {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Subject"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading subjects...</div>
        ) : Object.keys(byGrade).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No subjects yet. Add one to get started.
          </div>
        ) : (
          GRADES.filter(g => byGrade[g]).map(g => (
            <Card key={g}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Grade {g}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {byGrade[g]!.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">{s.name}</span>
                        </div>
                        {s.description && <div className="text-xs text-muted-foreground mt-0.5 ml-6">{s.description}</div>}
                        <div className="text-xs text-muted-foreground mt-0.5 ml-6 flex items-center gap-3">
                          <span>{s.questionCount} questions</span>
                          {s.timerMinutes && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Timer className="w-3 h-3" />
                              {s.timerMinutes} min timer
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-primary"
                          onClick={() => openEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive"
                          onClick={() => deleteSubject({ id: s.id })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Subject Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Grade</Label>
                <Select value={editGrade} onValueChange={setEditGrade}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Input placeholder="Brief description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Timer className="w-4 h-4" /> Quiz Timer (minutes, optional)</Label>
                <Input
                  type="number"
                  placeholder="Leave empty for no timer"
                  value={editTimer}
                  min={1}
                  max={180}
                  onChange={(e) => setEditTimer(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={!editName || !editGrade || editSaving} onClick={saveEdit}>
                {editSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
