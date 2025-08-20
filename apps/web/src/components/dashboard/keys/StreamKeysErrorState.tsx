import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface StreamKeysErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function StreamKeysErrorState({ error, onRetry }: StreamKeysErrorStateProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Stream Keys</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your streaming ingress configuration
        </p>
      </div>

      {/* Error Card */}
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to Load Stream Keys</h3>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Button onClick={onRetry} variant="outline" className="cursor-pointer">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
