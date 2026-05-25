import { type FormEvent, type ReactNode, useState } from "react";
import { useLogin, useGetAuthSession } from "@workspace/api-client-react";
import { LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthGate({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const sessionQuery = useGetAuthSession({
    query: { queryKey: ["auth-session"], retry: false },
  });
  const loginMutation = useLogin();

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      await loginMutation.mutateAsync({ data: { username, password } });
      await sessionQuery.refetch();
    } catch {
      setError("Invalid username or password");
    }
  }

  if (sessionQuery.isLoading) {
    return null;
  }

  if (sessionQuery.data?.authenticated) {
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
            <Button type="submit" className="w-full gap-2" disabled={loginMutation.isPending}>
              <LogIn className="h-4 w-4" />
              {loginMutation.isPending ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
