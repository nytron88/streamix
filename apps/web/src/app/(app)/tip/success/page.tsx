"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Gift, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

interface TipSessionData {
    amount_total: number;
    currency: string;
    payment_status: string;
    metadata: {
        purpose: string;
        channelId: string;
        channelName: string;
        viewerId: string;
        amountCents: string;
    };
    customer_details?: {
        email?: string;
    };
}

interface ChannelInfo {
    id: string;
    displayName: string | null;
    slug: string | null;
    user: {
        name: string;
    };
}

function TipSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const [isLoading, setIsLoading] = useState(true);
    const [tipData, setTipData] = useState<TipSessionData | null>(null);
    const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (sessionId) {
            verifyTipSession(sessionId);
        } else {
            setError("No session ID provided");
            setIsLoading(false);
        }
    }, [sessionId]);

    const verifyTipSession = async (sessionId: string) => {
        try {
            const response = await axios.post("/api/stripe/check-session", {
                sessionId,
            });

            if (response.data.success && response.data.payload) {
                const session = response.data.payload;

                // Verify this is a tip session
                if (session.metadata?.purpose === "tip") {
                    setTipData(session);

                    // Fetch channel information to get the most up-to-date channel name
                    try {
                        const channelResponse = await axios.get(`/api/channel/${session.metadata.channelId}`);
                        if (channelResponse.data.success && channelResponse.data.payload?.channel) {
                            setChannelInfo(channelResponse.data.payload.channel);
                        }
                    } catch (channelErr) {
                        console.warn("Failed to fetch channel info:", channelErr);
                        // Continue without channel info - we'll use metadata
                    }

                    toast.success("Tip sent successfully!");
                } else {
                    setError("Invalid tip session");
                }
            } else {
                setError("Failed to verify tip session");
            }
        } catch (err: unknown) {
            console.error("Tip verification error:", err);
            setError("Failed to verify tip session");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-md mx-auto">
                    <CardContent className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
                        <p className="text-muted-foreground">Verifying your tip...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !tipData) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-md mx-auto">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                            <AlertCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <CardTitle className="text-2xl text-red-600">Tip Verification Failed</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-6">
                        <p className="text-muted-foreground">
                            {error || "We couldn't verify your tip. Please contact support if you believe this is an error."}
                        </p>
                        <div className="flex flex-col gap-3">
                            <Link href="/browse">
                                <Button className="w-full cursor-pointer">Browse Channels</Button>
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
                                ${(tipData.amount_total / 100).toFixed(2)} {tipData.currency.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-muted-foreground">
                            Your tip has been sent to <strong>
                                {channelInfo?.displayName || channelInfo?.user?.name || tipData.metadata.channelName}
                            </strong>
                        </p>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-left">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Payment Status:</span>
                            <span className="text-sm font-medium text-green-600 capitalize">
                                {tipData.payment_status}
                            </span>
                        </div>
                        {tipData.customer_details?.email && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Email:</span>
                                <span className="text-sm font-medium">
                                    {tipData.customer_details.email}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Thank you for supporting your favorite streamer! Your tip helps them continue creating great content.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        {channelInfo?.slug && (
                            <Link href={`/channel/${channelInfo.slug}`}>
                                <Button className="w-full cursor-pointer">
                                    Visit {channelInfo?.displayName || channelInfo?.user?.name || tipData.metadata.channelName}
                                </Button>
                            </Link>
                        )}
                        <Link href="/browse">
                            <Button variant="outline" className="w-full cursor-pointer">
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
