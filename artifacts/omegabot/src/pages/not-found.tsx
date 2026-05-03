import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-2">404</h1>
      <p className="text-muted-foreground mb-1 text-lg font-medium">Page not found</p>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Start Here
        </Button>
      </Link>
    </div>
  );
}
