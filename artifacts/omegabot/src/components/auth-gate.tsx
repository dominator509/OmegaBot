import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SessionResponse = {
  authenticated: boolean;
  user?: {
    username: string;
    expiresAt: string;
  };
};

async function readSession(): Promise<SessionResponse> {
  const response = await fetch("/api/auth/session");
  if (!response.ok) {
    return { authenticated: false };
  }
  return response.json() as Promise<SessionResponse>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionResponse | undefined>();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void readSession().then(setSession);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json() as SessionResponse & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Sign in failed");
        return;
      }
      setSession(data);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (session === undefined) {
    return null;
  }

  if (session.authenticated) {
    return children;
  }

  return (
    <main className="min-h-screen bg-background text-foreground grid place-items-center px-4">
      <Card className="w-full max-w-sm rounded-lg">
        <CardHeader className="space-y-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">OmegaBot Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {error ? <div className="text-sm text-destructive">{error}</div> : null}
            <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
              <LogIn className="h-4 w-4" />
              {isSubmitting ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
