"use client";

import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";

export default function VodPage() {
  const params = useParams();
  const vodId = params.id as string;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/dashboard/vods">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to VODs
          </Button>
        </Link>

        {/* VOD Content */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">VOD Player</h1>
              <p className="text-muted-foreground mb-4">
                VOD ID: {vodId}
              </p>
              <p className="text-sm text-muted-foreground">
                This page will display the video player for the selected VOD.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
