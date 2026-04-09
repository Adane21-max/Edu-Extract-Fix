import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Megaphone, Trash2, PlusCircle, AlertCircle, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Announcement {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

async function fetchAnnouncements(): Promise<Announcement[]> {
  const r = await fetch("/api/announcements");
  if (!r.ok) throw new Error("Failed to load");
  return r.json() as Promise<Announcement[]>;
}

async function createAnnouncement(data: { title: string; content: string }): Promise<Announcement> {
  const r = await fetch("/api/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("Failed to create");
  return r.json() as Promise<Announcement>;
}

async function deleteAnnouncement(id: number): Promise<void> {
  await fetch(`/api/announcements/${id}`, { method: "DELETE" });
}

export default function AdminAnnouncements() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements,
  });

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setTitle("");
      setContent("");
      setSuccess(true);
      setError("");
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: () => setError("Failed to publish announcement."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setError("");
    createMutation.mutate({ title: title.trim(), content: content.trim() });
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> Announcements
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Post announcements visible to all students on their dashboard.
          </p>
        </div>

        {/* Create form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary" /> New Announcement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {success && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                  <CheckCircle className="w-4 h-4" /> Announcement published successfully!
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  placeholder="e.g. Exam schedule update"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea
                  placeholder="Write your announcement here..."
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending || !title.trim() || !content.trim()}>
                {createMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</>
                ) : (
                  <><Megaphone className="w-4 h-4 mr-2" /> Publish</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing announcements */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Published ({announcements?.length ?? 0})
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (announcements ?? []).length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground text-sm">
                No announcements yet. Create one above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(announcements ?? []).map((a) => (
                <Card key={a.id}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{a.title}</div>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{a.content}</p>
                        <div className="text-xs text-muted-foreground mt-2">
                          {new Date(a.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => deleteMutation.mutate(a.id)}
                        disabled={deleteMutation.isPending}
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
