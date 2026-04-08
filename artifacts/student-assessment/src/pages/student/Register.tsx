import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useRegisterStudent } from "@workspace/api-client-react";

const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

export default function StudentRegister() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("");
  const [telebirr, setTelebirr] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { mutate, isPending } = useRegisterStudent({
    mutation: {
      onSuccess() {
        setSuccess(true);
      },
      onError(err) {
        const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Registration failed. Please try again.";
        setError(msg);
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutate({ data: { name, email, password, grade, telebirrReceipt: telebirr || undefined } });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Registration Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Your account is pending admin approval. You'll be able to log in once approved.
            </p>
            <Button onClick={() => setLocation("/student/login")} className="w-full">Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>Register to start your exam preparation</CardDescription>
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
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Abebe Kebede" value={name}
                  onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="abebe@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="At least 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>

              <div className="space-y-1.5">
                <Label>Grade</Label>
                <Select value={grade} onValueChange={setGrade} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={g}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telebirr">TeleBirr Receipt Number</Label>
                <Input id="telebirr" placeholder="e.g. TBR-2024-XXXXXX" value={telebirr}
                  onChange={(e) => setTelebirr(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Pay <span className="font-semibold text-foreground">1000 birr</span> via Telebirr{" "}
                  <span className="font-semibold text-foreground">0936592186 Adane F</span> and enter your TeleBirr payment receipt number here for faster approval.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isPending || !grade}>
                {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</> : "Create Account"}
              </Button>
            </form>

            <p className="text-sm text-muted-foreground text-center mt-4">
              Already have an account?{" "}
              <button onClick={() => setLocation("/student/login")} className="text-primary hover:underline font-medium">
                Sign in
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
