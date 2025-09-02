"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Users } from "lucide-react";
import Link from "next/link";

export default function BrowsePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Browse Channels</h1>
          <p className="text-muted-foreground">
            Discover new streamers and content creators
          </p>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search channels..."
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Channels Found</h3>
            <p className="text-muted-foreground mb-4">
              Start following some channels to see them here, or check back later for new content.
            </p>
            <Link href="/home">
              <Button>Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
