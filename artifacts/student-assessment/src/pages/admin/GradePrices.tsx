import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Check, X, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

interface GradePrice {
  grade: string;
  price_etb: number;
}

export default function AdminGradePrices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: prices, isLoading } = useQuery<GradePrice[]>({
    queryKey: ["grade-prices"],
    queryFn: async () => {
      const res = await fetch("/api/grade-prices");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const { mutate: updatePrice, isPending } = useMutation({
    mutationFn: async ({ grade, priceEtb }: { grade: string; priceEtb: number }) => {
      const res = await fetch(`/api/grade-prices/${grade}`, {
        method: "PATCH",
        body: JSON.stringify({ priceEtb }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grade-prices"] });
      setEditing(null);
      toast({ title: "Price updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update price", variant: "destructive" });
    },
  });

  const priceMap: Record<string, number> = {};
  for (const p of prices ?? []) {
    priceMap[p.grade] = p.price_etb;
  }

  const startEdit = (grade: string) => {
    setEditing(grade);
    setEditValue(String(priceMap[grade] ?? 0));
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = (grade: string) => {
    const val = parseInt(editValue, 10);
    if (isNaN(val) || val < 0) {
      toast({ title: "Enter a valid amount (0 or more)", variant: "destructive" });
      return;
    }
    updatePrice({ grade, priceEtb: val });
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Grade Pricing</h1>
          <p className="text-muted-foreground">Set the subscription fee (in ETB) for each grade level.</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Subscription Fees by Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
              </div>
            ) : (
              <div className="divide-y">
                {GRADES.map((grade) => (
                  <div key={grade} className="flex items-center justify-between py-4">
                    <div>
                      <div className="font-medium text-sm">Grade {grade}</div>
                      {editing !== grade && (
                        <div className="text-muted-foreground text-sm mt-0.5">
                          {priceMap[grade] !== undefined
                            ? `${priceMap[grade].toLocaleString()} ETB`
                            : "Not set"}
                        </div>
                      )}
                    </div>

                    {editing === grade ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            className="w-32 pr-10"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEdit(grade);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            autoFocus
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            ETB
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-green-600 hover:text-green-700"
                          disabled={isPending}
                          onClick={() => saveEdit(grade)}
                        >
                          {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={cancelEdit}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => startEdit(grade)}>
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>
                    )}
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
