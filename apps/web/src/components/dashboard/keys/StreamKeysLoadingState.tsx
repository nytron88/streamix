import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function StreamKeysLoadingState() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2"></div>
        <div className="h-4 w-80 bg-muted animate-pulse rounded"></div>
      </div>

      {/* Card skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-56 bg-muted animate-pulse rounded"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
            <div className="h-6 w-24 bg-muted animate-pulse rounded-full"></div>
          </div>
          <div className="h-px bg-muted"></div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
              <div className="h-10 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
              <div className="h-10 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="h-20 bg-muted animate-pulse rounded"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
