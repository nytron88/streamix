"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger,
    DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Heart,
    Users,
    Calendar,
    MapPin,
    Star,
    Play,
    Clock,
    Crown,
    Shield,
    Gift,
    Video,
    Radio,
    UserPlus,
    UserMinus,
    AlertCircle,
    ExternalLink,
    Ban,
    UserX,
    MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import { useChannelBySlug } from "@/hooks/useChannelBySlug";
import { useFollowActions } from "@/hooks/useFollowActions";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useBanUser } from "@/hooks/useBanUser";
import { useUser as useClerkUser } from "@clerk/nextjs";

interface ChannelStats {
    followers: number;
    totalTips: number;
    subscriberCount: number;
    joinedDate: string;
}

export default function ChannelPage() {
    const params = useParams();
    const slug = params.u as string;
    const { user } = useUser();
    const { user: clerkUser } = useClerkUser();

    // Channel data
    const { data: channelData, error, isLoading, refresh } = useChannelBySlug(slug);
    const { followChannel, unfollowChannel, isLoading: isFollowingAction } = useFollowActions();
    
    // Ban functionality
    const { banUser, loading: banLoading } = useBanUser();

    // Subscription status
    const {
        isSubscribed,
        subscription,
        isLoading: isSubscriptionLoading,
        refresh: refreshSubscription
    } = useSubscriptionStatus(channelData?.channel?.id || null);

    // Local states
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [banModalOpen, setBanModalOpen] = useState(false);
    const [banForm, setBanForm] = useState({
        reason: "",
        expiresAt: "",
        isPermanent: false,
    });

    // Derived states
    const channel = channelData?.channel;
    const assets = channelData?.assets;
    const viewer = channelData?.viewer;
    const isOwner = viewer?.isOwner || false;
    const isFollowing = viewer?.isFollowing || false;
    const isBanned = viewer?.isBanned || false;
    const isLive = channel?.stream?.isLive || false;
    
    // Check if current user can moderate (they must own a channel and not be viewing their own channel)
    const canModerate = clerkUser && !isOwner && channel?.user?.id && !isBanned;

    // Real stats from API
    const channelStats: ChannelStats = {
        followers: channel?.followerCount || 0,
        totalTips: Math.floor(Math.random() * 5000) + 500, // TODO: Calculate from database when tips are implemented
        subscriberCount: channel?.subscriberCount || 0,
        joinedDate: channel?.createdAt ? new Date(channel.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Unknown',
    };

    // Handle follow action
    const handleFollow = async () => {
        if (!channel) return;

        try {
            if (isFollowing) {
                await unfollowChannel(channel.id);
                toast.success(`Unfollowed ${channel.displayName || 'channel'}`);
            } else {
                await followChannel(channel.id);
                toast.success(`Following ${channel.displayName || 'channel'}!`);
            }
            refresh(); // Refresh data
        } catch (error: any) {
            toast.error(error.message || "Failed to update follow status");
        }
    };

    // Handle subscribe action via Stripe
    const handleSubscribe = async () => {
        if (!channel || !user) {
            toast.error("Please sign in to subscribe");
            return;
        }

        if (isSubscribed) {
            // Redirect to billing portal for subscription management
            try {
                const response = await fetch('/api/stripe/create-portal-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to access billing portal');
                }

                window.open(data.payload.url, '_blank');
            } catch (error: any) {
                console.error('Subscription error:', error);
                toast.error(error.message || "Failed to access billing portal");
            }
            return;
        }

        setIsSubscribing(true);
        try {
            // Create Stripe checkout session for this channel
            const response = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    channelId: channel.id,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Subscription error:', data);
                throw new Error(data.error || 'Failed to create checkout session');
            }

            // Redirect to Stripe checkout
            const stripePromise = (await import('@stripe/stripe-js')).loadStripe(
                process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
            );

            const stripe = await stripePromise;

            if (!stripe) {
                throw new Error('Failed to load Stripe');
            }

            const { error } = await stripe.redirectToCheckout({
                sessionId: data.payload.id,
            });

            if (error) {
                throw new Error(error.message);
            }
        } catch (error: any) {
            console.error('Subscription error:', error);
            toast.error(error.message || "Failed to start subscription process");
        } finally {
            setIsSubscribing(false);
        }
    };

    // Handle ban action
    const handleBanUser = async () => {
        if (!channel?.user?.id) return;

        // Prepare ban data
        const banData: any = {
            userId: channel.user.id,
            reason: banForm.reason.trim() || undefined,
            isPermanent: banForm.isPermanent,
        };

        // Add expiry date if not permanent and date is provided
        if (!banForm.isPermanent && banForm.expiresAt) {
            banData.expiresAt = new Date(banForm.expiresAt).toISOString();
        }

        const success = await banUser(banData);

        if (success) {
            // Close modal and reset form
            setBanModalOpen(false);
            setBanForm({
                reason: "",
                expiresAt: "",
                isPermanent: false,
            });
            
            // Refresh channel data to update ban status
            refresh();
            toast.success(`${channel.displayName || channel.user.name || 'User'} has been banned from your channel`);
        }
    };

    // Get user initials for avatar fallback
    const getUserInitials = (name: string): string => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    // Format large numbers
    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse">
                    {/* Banner skeleton */}
                    <div className="w-full h-64 bg-muted rounded-lg mb-8" />

                    {/* Profile section skeleton */}
                    <div className="flex flex-col md:flex-row gap-6 mb-8">
                        <div className="w-32 h-32 bg-muted rounded-full" />
                        <div className="flex-1">
                            <div className="h-8 bg-muted rounded w-64 mb-4" />
                            <div className="h-4 bg-muted rounded w-96 mb-4" />
                            <div className="flex gap-4">
                                <div className="h-10 bg-muted rounded w-24" />
                                <div className="h-10 bg-muted rounded w-32" />
                            </div>
                        </div>
                    </div>

                    {/* Stats skeleton */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-muted rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !channel) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-md mx-auto">
                    <CardContent className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Channel Not Found</h3>
                        <p className="text-muted-foreground mb-4">
                            The channel you're looking for doesn't exist or may have been removed.
                        </p>
                        <Link href="/browse">
                            <Button className="cursor-pointer">Browse Channels</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isBanned) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-md mx-auto border-destructive">
                    <CardContent className="text-center py-8">
                        <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
                        <p className="text-muted-foreground mb-4">
                            You have been banned from this channel.
                        </p>
                        <Link href="/browse">
                            <Button variant="outline" className="cursor-pointer">Browse Other Channels</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Channel Banner */}
            <div className="relative mb-8">
                <div
                    className="w-full h-64 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg overflow-hidden"
                    style={{
                        backgroundImage: assets?.bannerUrl ? `url(${assets.bannerUrl})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    {isLive && (
                        <div className="absolute top-4 left-4">
                            <Badge variant="destructive" className="flex items-center gap-1">
                                <Radio className="h-3 w-3" />
                                LIVE
                            </Badge>
                        </div>
                    )}

                    {isLive && (
                        <div className="absolute top-4 right-4">
                            <Link href={`/${slug}`}>
                                <Button size="sm" className="bg-red-600 hover:bg-red-700 cursor-pointer">
                                    <Play className="h-4 w-4 mr-2" />
                                    Watch Live
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Channel Profile Section */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
                {/* Avatar */}
                <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
                        <AvatarImage src={assets?.avatarUrl || undefined} />
                        <AvatarFallback className="text-2xl">
                            {getUserInitials(channel.displayName || channel.user?.name || 'U')}
                        </AvatarFallback>
                    </Avatar>

                    {isLive && (
                        <div className="absolute -bottom-1 -right-1">
                            <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                                <Radio className="h-3 w-3" />
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Channel Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h1 className="text-3xl font-bold">
                            {channel.displayName || channel.user?.name || 'Unknown Channel'}
                        </h1>
                        {isOwner && (
                            <Crown className="h-6 w-6 text-yellow-500" />
                        )}
                    </div>

                    <p className="text-muted-foreground mb-1">@{slug}</p>

                    {channel.bio && (
                        <p className="text-base mb-4 max-w-2xl">{channel.bio}</p>
                    )}

                    {channel.category && (
                        <div className="flex items-center gap-2 mb-4">
                            <Badge variant="secondary">{channel.category}</Badge>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!isOwner && (
                        <div className="flex flex-wrap gap-3">
                            <Button
                                onClick={handleFollow}
                                variant={isFollowing ? "outline" : "default"}
                                disabled={isFollowingAction}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                {isFollowing ? (
                                    <>
                                        <UserMinus className="h-4 w-4" />
                                        Unfollow
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4" />
                                        Follow
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleSubscribe}
                                variant={isSubscribed ? "outline" : "default"}
                                disabled={isSubscribing || isSubscriptionLoading}
                                className={`flex items-center gap-2 cursor-pointer ${isSubscribed
                                    ? "border-purple-600 text-purple-600 hover:bg-purple-50"
                                    : "bg-purple-600 hover:bg-purple-700"
                                    }`}
                            >
                                {isSubscribing ? (
                                    <>
                                        <Star className="h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : isSubscribed ? (
                                    <>
                                        <Star className="h-4 w-4 fill-current" />
                                        Manage Subscription
                                    </>
                                ) : (
                                    <>
                                        <Star className="h-4 w-4" />
                                        Subscribe $4.99/month
                                    </>
                                )}
                            </Button>

                            <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
                                <Gift className="h-4 w-4" />
                                Tip
                            </Button>
                        </div>
                    )}

                    {isOwner && (
                        <div className="flex flex-wrap gap-3">
                            <Link href="/dashboard">
                                <Button className="flex items-center gap-2 cursor-pointer">
                                    <Crown className="h-4 w-4" />
                                    Manage Channel
                                </Button>
                            </Link>

                            {isLive ? (
                                <Link href="/dashboard/stream">
                                    <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
                                        <Video className="h-4 w-4" />
                                        View My Stream
                                    </Button>
                                </Link>
                            ) : (
                                <Link href="/dashboard/keys">
                                    <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
                                        <Play className="h-4 w-4" />
                                        Start Streaming
                                    </Button>
                                </Link>
                            )}

                            <Link href="/dashboard/bans">
                                <Button variant="outline" className="flex items-center gap-2 cursor-pointer">
                                    <Shield className="h-4 w-4" />
                                    Manage Bans
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Channel Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <Card>
                    <CardContent className="p-4 text-center">
                        <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{formatNumber(channelStats.followers)}</div>
                        <div className="text-sm text-muted-foreground">Followers</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{formatNumber(channelStats.subscriberCount)}</div>
                        <div className="text-sm text-muted-foreground">Subscribers</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 text-center">
                        <Calendar className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                        <div className="text-sm font-medium">{channelStats.joinedDate}</div>
                        <div className="text-sm text-muted-foreground">Joined</div>
                    </CardContent>
                </Card>
            </div>

            {/* Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Recent Streams / VODs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Video className="h-5 w-5" />
                                Recent Streams
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8">
                                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Recent Streams</h3>
                                <p className="text-muted-foreground">
                                    {isOwner
                                        ? "Start streaming to see your content here!"
                                        : "This channel hasn't streamed recently."
                                    }
                                </p>
                                {isOwner && (
                                    <Link href="/dashboard/keys" className="mt-4 inline-block">
                                        <Button className="cursor-pointer">
                                            <Play className="h-4 w-4 mr-2" />
                                            Start Streaming
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Highlights / Clips */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5" />
                                Highlights
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8">
                                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Highlights Yet</h3>
                                <p className="text-muted-foreground">
                                    Highlights and clips will appear here when available.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Channel Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Channel Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <Badge variant={isLive ? "destructive" : "secondary"}>
                                    {isLive ? "Live" : "Offline"}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Category</span>
                                <Badge variant="outline">
                                    {channel.category || "Not Set"}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Language</span>
                                <span className="text-sm">English</span>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <h4 className="font-medium">Social Links</h4>
                                <p className="text-sm text-muted-foreground">
                                    No social links available yet.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Followers */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Heart className="h-5 w-5" />
                                Recent Followers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-4">
                                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    Recent followers will appear here.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    {!isOwner && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start cursor-pointer"
                                    onClick={() => toast.info("Feature coming soon!")}
                                >
                                    <Gift className="h-4 w-4 mr-2" />
                                    Send Tip
                                </Button>

                                <Button
                                    variant="outline"
                                    className="w-full justify-start cursor-pointer"
                                    onClick={() => toast.info("Feature coming soon!")}
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Share Channel
                                </Button>

                                {/* Moderation Options for Other Channel Owners */}
                                {canModerate && (
                                    <div className="pt-2">
                                        <Separator className="mb-3" />
                                        <p className="text-xs text-muted-foreground mb-2 font-medium">Moderation</p>
                                        
                                        <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start cursor-pointer text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                                                    disabled={banLoading}
                                                >
                                                    <UserX className="h-4 w-4 mr-2" />
                                                    Ban User
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Ban User</DialogTitle>
                                                    <DialogDescription>
                                                        Ban {channel?.displayName || channel?.user?.name || "this user"} from your channel. This will remove them from your channel and cancel any active subscriptions.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="ban-reason">Reason (optional)</Label>
                                                        <Input
                                                            id="ban-reason"
                                                            placeholder="Enter ban reason..."
                                                            value={banForm.reason}
                                                            onChange={(e) => setBanForm(prev => ({ ...prev, reason: e.target.value }))}
                                                            maxLength={500}
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            {banForm.reason.length}/500 characters
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <Switch
                                                            id="permanent-ban"
                                                            checked={banForm.isPermanent}
                                                            onCheckedChange={(checked) => setBanForm(prev => ({ 
                                                                ...prev, 
                                                                isPermanent: checked,
                                                                expiresAt: checked ? "" : prev.expiresAt 
                                                            }))}
                                                        />
                                                        <Label htmlFor="permanent-ban">Permanent ban</Label>
                                                    </div>

                                                    {!banForm.isPermanent && (
                                                        <div className="space-y-2">
                                                            <Label htmlFor="ban-expiry">Expires at (optional)</Label>
                                                            <Input
                                                                id="ban-expiry"
                                                                type="datetime-local"
                                                                value={banForm.expiresAt}
                                                                onChange={(e) => setBanForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                                                                min={new Date().toISOString().slice(0, 16)}
                                                            />
                                                            <p className="text-xs text-muted-foreground">
                                                                Leave empty for indefinite ban until manually removed
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex justify-end space-x-2">
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={() => setBanModalOpen(false)}
                                                        disabled={banLoading}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button 
                                                        variant="destructive"
                                                        onClick={handleBanUser}
                                                        disabled={banLoading}
                                                    >
                                                        {banLoading ? "Banning..." : "Ban User"}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
