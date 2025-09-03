"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, Gift } from "lucide-react";
import Link from "next/link";

export default function TipCancelPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <XCircle className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Tip Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Your tip was cancelled. No payment was processed.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You can always come back later to support your favorite streamers with a tip!
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/browse">
              <Button className="w-full cursor-pointer">
                <Gift className="h-4 w-4 mr-2" />
                Browse Channels
              </Button>
            </Link>
            <Link href="/following">
              <Button variant="outline" className="w-full cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Following
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
