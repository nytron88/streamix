"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

interface SubscriptionEarning {
    id: string;
    subscriberId: string;
    subscriberName: string;
    subscriberEmail: string;
    amount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface TipEarning {
    id: string;
    tipperName: string;
    tipperEmail: string;
    amount: number;
    message?: string;
    createdAt: string;
}

interface EarningsSummary {
    totalSubscriptions: number;
    totalTips: number;
    totalEarnings: number;
    monthlyEarnings: number;
    activeSubscribers: number;
}

export default function EarningsPage() {
    const [subscriptions, setSubscriptions] = useState<SubscriptionEarning[]>([]);
    const [tips, setTips] = useState<TipEarning[]>([]);
    const [summary, setSummary] = useState<EarningsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchEarningsData();
    }, []);

    const fetchEarningsData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [subscriptionsRes, tipsRes, summaryRes] = await Promise.all([
                axios.get("/api/earnings/subscriptions"),
                axios.get("/api/earnings/tips"),
                axios.get("/api/earnings/summary")
            ]);

            setSubscriptions(subscriptionsRes.data.payload?.subscriptions || []);
            setTips(tipsRes.data.payload?.tips || []);
            setSummary(summaryRes.data.payload || null);
        } catch (err) {
            console.error("Error fetching earnings:", err);
            if (axios.isAxiosError(err)) {
                const errorMessage = err.response?.data?.error || err.message || "Failed to fetch earnings data";
                setError(errorMessage);
            } else {
                setError(err instanceof Error ? err.message : "Failed to fetch earnings data");
            }
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), "MMM dd, yyyy");
    };

    const getStatusBadge = (status: string) => {
        const statusMap = {
            ACTIVE: { variant: "default" as const, label: "Active" },
            CANCELED: { variant: "destructive" as const, label: "Canceled" },
            PAST_DUE: { variant: "destructive" as const, label: "Past Due" },
            CANCEL_SCHEDULED: { variant: "secondary" as const, label: "Cancel Scheduled" },
        };

        const statusInfo = statusMap[status as keyof typeof statusMap] || { variant: "secondary" as const, label: status };
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Earnings</h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                                <div className="h-8 bg-muted rounded w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold mb-4">Earnings</h1>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={fetchEarningsData} className="cursor-pointer">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Earnings</h1>
                <Button onClick={fetchEarningsData} variant="outline" className="cursor-pointer">
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(summary.totalEarnings)}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                            </div>
                            <p className="text-2xl font-bold">{formatCurrency(summary.monthlyEarnings)}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium text-muted-foreground">Active Subscribers</p>
                            </div>
                            <p className="text-2xl font-bold">{summary.activeSubscribers}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium text-muted-foreground">Total Subscriptions</p>
                            </div>
                            <p className="text-2xl font-bold">{summary.totalSubscriptions}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs for Subscriptions and Tips */}
            <Tabs defaultValue="subscriptions" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
                    <TabsTrigger value="tips">Tips</TabsTrigger>
                </TabsList>

                <TabsContent value="subscriptions" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subscription Earnings</CardTitle>
                            <CardDescription>
                                Monthly recurring revenue from your subscribers
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {subscriptions.length > 0 ? (
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-4">
                                        {subscriptions.map((subscription) => (
                                            <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="flex items-center space-x-4">
                                                    <div>
                                                        <p className="font-medium">{subscription.subscriberName}</p>
                                                        <p className="text-sm text-muted-foreground">{subscription.subscriberEmail}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDate(subscription.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-4">
                                                    <div className="text-right">
                                                        <p className="font-medium">{formatCurrency(subscription.amount)}</p>
                                                        <p className="text-sm text-muted-foreground">per month</p>
                                                    </div>
                                                    {getStatusBadge(subscription.status)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="text-center py-8">
                                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No subscription earnings yet</p>
                                    <p className="text-sm text-muted-foreground">
                                        Start streaming to attract subscribers!
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tips" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tip Earnings</CardTitle>
                            <CardDescription>
                                One-time tips from your viewers
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {tips.length > 0 ? (
                                <ScrollArea className="h-[400px]">
                                    <div className="space-y-4">
                                        {tips.map((tip) => (
                                            <div key={tip.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div className="flex items-center space-x-4">
                                                    <div>
                                                        <p className="font-medium">{tip.tipperName}</p>
                                                        <p className="text-sm text-muted-foreground">{tip.tipperEmail}</p>
                                                        {tip.message && (
                                                            <p className="text-sm text-muted-foreground italic">"{tip.message}"</p>
                                                        )}
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDate(tip.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-lg">{formatCurrency(tip.amount)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="text-center py-8">
                                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground">No tips received yet</p>
                                    <p className="text-sm text-muted-foreground">
                                        Engage with your audience to receive tips!
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
