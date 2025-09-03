"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Gift, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function TipSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [isLoading, setIsLoading] = useState(true);
    const [tipData, setTipData] = useState<{
        amount: number;
        channelName: string;
    } | null>(null);

    useEffect(() => {
        if (sessionId) {
            // In a real implementation, you would verify the session with Stripe
            // and fetch the tip details from your database
            // For now, we'll simulate this
            setTimeout(() => {
                setTipData({
                    amount: 1000, // $10.00 in cents
                    channelName: "Streamer Name",
                });
                setIsLoading(false);
                toast.success("Tip sent successfully!");
            }, 1000);
        } else {
            setIsLoading(false);
        }
    }, [sessionId]);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-md mx-auto">
                    <CardContent className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Processing your tip...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!sessionId) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-md mx-auto">
                    <CardContent className="text-center py-8">
                        <p className="text-muted-foreground">No tip session found.</p>
                        <Link href="/browse">
                            <Button className="mt-4 cursor-pointer">Browse Channels</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="max-w-md mx-auto">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl">Tip Sent Successfully!</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                            <Gift className="h-5 w-5 text-purple-600" />
                            <span className="text-lg font-semibold">
                                ${((tipData?.amount || 0) / 100).toFixed(2)}
                            </span>
                        </div>
                        <p className="text-muted-foreground">
                            Your tip has been sent to <strong>{tipData?.channelName || "the streamer"}</strong>
                        </p>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Thank you for supporting your favorite streamer! Your tip helps them continue creating great content.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Link href="/browse">
                            <Button className="w-full cursor-pointer">
                                Browse More Channels
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

export default function TipSuccessPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-md mx-auto">
                    <CardContent className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading...</p>
                    </CardContent>
                </Card>
            </div>
        }>
            <TipSuccessContent />
        </Suspense>
    );
}
