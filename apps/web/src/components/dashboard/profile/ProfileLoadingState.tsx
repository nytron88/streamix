import { Card, CardContent } from "@/components/ui/card";

export function ProfileLoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile Information</h1>
      </div>
      <div className="animate-pulse">
        <Card>
          <CardContent className="p-6">
            <div className="h-32 bg-muted rounded-lg mb-4"></div>
            <div className="h-4 bg-muted rounded mb-2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
