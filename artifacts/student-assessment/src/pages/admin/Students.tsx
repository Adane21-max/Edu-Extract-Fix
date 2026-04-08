import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useListStudents, useUpdateStudent } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, Search, Users, UserCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListStudentsQueryKey } from "@workspace/api-client-react";

export default function AdminStudents() {
  const queryClient = useQueryClient();
  const { data: students, isLoading } = useListStudents();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { mutate: updateStudent } = useUpdateStudent({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      },
    },
  });

  const filtered = (students ?? []).filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const approve = (id: number) => updateStudent({ id, data: { status: "approved" } });
  const suspend = (id: number) => updateStudent({ id, data: { status: "suspended" } });
  const setPending = (id: number) => updateStudent({ id, data: { status: "pending" } });

  const statusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
    if (status === "suspended") return <Badge variant="destructive">Suspended</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  const pending = (students ?? []).filter(s => s.status === "pending").length;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground">{students?.length ?? 0} total · {pending} pending approval</p>
          </div>
        </div>

        {pending > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800 text-sm font-medium">
              {pending} student{pending > 1 ? "s" : ""} waiting for approval
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name or email..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground">Loading students...</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                No students found
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((s) => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{s.name}</span>
                        {statusBadge(s.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {s.email} · Grade {s.grade} · {s.subscriptionTier} · {s.subscriptionPrice ? `${s.subscriptionPrice} ETB` : "no price"}
                      </div>
                      {s.telebirrReceipt && (
                        <div className="text-xs text-blue-600 mt-0.5">Receipt: {s.telebirrReceipt}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Registered: {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {s.status !== "approved" && (
                        <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => approve(s.id)}>
                          <UserCheck className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                      )}
                      {s.status === "approved" && (
                        <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => suspend(s.id)}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Suspend
                        </Button>
                      )}
                      {s.status === "suspended" && (
                        <Button size="sm" variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                          onClick={() => setPending(s.id)}>
                          <Clock className="w-3.5 h-3.5 mr-1" /> Set Pending
                        </Button>
                      )}
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
