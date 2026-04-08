import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Loader2, AlertCircle } from "lucide-react";
import { useLoginStudent } from "@workspace/api-client-react";

export default function StudentLogin() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useLoginStudent({
    mutation: {
      onSuccess(data) {
        login(data.token, "student", {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          grade: data.user.grade,
          status: data.user.status,
          subscriptionTier: data.user.subscriptionTier,
        });
        setLocation("/student/dashboard");
      },
      onError(err) {
        const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Login failed. Check your email and password.";
        setError(msg);
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <GraduationCap className="text-white w-7 h-7" />
          </div>
          <div className="text-white">
            <div className="font-bold text-xl">Ada21Tech</div>
            <div className="text-blue-300 text-sm">Assessment Platform</div>
          </div>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your student account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</> : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button onClick={() => setLocation("/student/register")} className="text-primary hover:underline font-medium">
                  Register here
                </button>
              </p>
              <p className="text-sm text-muted-foreground">
                Are you an admin?{" "}
                <button onClick={() => setLocation("/admin/login")} className="text-primary hover:underline font-medium">
                  Admin login
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
