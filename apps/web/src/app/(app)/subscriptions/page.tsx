"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Users,

  Radio,
  ExternalLink,
  CreditCard,
  AlertCircle,
  Play,
  Settings,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useUserSubscriptions, type UserSubscription } from "@/hooks/useUserSubscriptions";

export default function SubscriptionsPage() {
  const { subscriptions, total, isLoading, error, refresh } = useUserSubscriptions();
  const [managingSubscription, setManagingSubscription] = useState<string | null>(null);

  // Handle subscription management (billing portal)
  const handleManageSubscription = async (subscription: UserSubscription) => {
    setManagingSubscription(subscription.id);
    
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
    } catch (error: unknown) {
      console.error('Billing portal error:', error);
      toast.error((error as Error).message || "Failed to access billing portal");
    } finally {
      setManagingSubscription(null);
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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case 'CANCEL_SCHEDULED':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Ending Soon</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Subscriptions</h1>
          <p className="text-muted-foreground">Manage your channel subscriptions</p>
        </div>

        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-6 bg-muted rounded w-48 mb-2" />
                    <div className="h-4 bg-muted rounded w-32" />
                  </div>
                  <div className="h-10 bg-muted rounded w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Subscriptions</h1>
          <p className="text-muted-foreground">Manage your channel subscriptions</p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to Load Subscriptions</h3>
            <p className="text-muted-foreground mb-4">
              There was an error loading your subscriptions. Please try again.
            </p>
            <Button onClick={() => refresh()} className="cursor-pointer">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Subscriptions</h1>
            <p className="text-muted-foreground">
              {total > 0 
                ? `You're subscribed to ${total} channel${total === 1 ? '' : 's'}`
                : 'Manage your channel subscriptions'
              }
            </p>
          </div>
          
          {total > 0 && (
            <Button
              variant="outline"
              onClick={() => refresh()}
              className="cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {total === 0 && (
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-2">No Subscriptions Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start supporting your favorite creators by subscribing to their channels.
            </p>
            <Link href="/browse">
              <Button className="cursor-pointer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Browse Channels
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions List */}
      {total > 0 && (
        <div className="grid gap-4">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-6">
                  {/* Channel Avatar */}
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={subscription.channel.assets.avatarUrl} />
                      <AvatarFallback>
                        {getUserInitials(subscription.channel.displayName || subscription.channel.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    {subscription.channel.isLive && (
                      <div className="absolute -bottom-1 -right-1">
                        <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                          <Radio className="h-3 w-3" />
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Channel Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={`/channel/${subscription.channel.slug || subscription.channel.id}`}
                        className="hover:underline"
                      >
                        <h3 className="text-lg font-semibold">
                          {subscription.channel.displayName || subscription.channel.user.name}
                        </h3>
                      </Link>
                      
                      {subscription.channel.isLive && (
                        <Badge variant="destructive" className="text-xs">
                          LIVE
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      @{subscription.channel.slug || subscription.channel.id}
                    </p>

                    {subscription.channel.category && (
                      <Badge variant="outline" className="text-xs">
                        {subscription.channel.category}
                      </Badge>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {subscription.channel.followerCount.toLocaleString()} followers
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        {subscription.channel.subscriberCount.toLocaleString()} subscribers
                      </div>
                    </div>
                  </div>

                  {/* Subscription Details */}
                  <div className="text-right">
                    <div className="mb-2">
                      {getStatusBadge(subscription.status)}
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-1">
                      Subscribed {formatDate(subscription.createdAt)}
                    </div>
                    
                    {subscription.currentPeriodEnd && (
                      <div className="text-sm text-muted-foreground mb-3">
                        {subscription.status === 'CANCEL_SCHEDULED' ? 'Ends' : 'Renews'} {formatDate(subscription.currentPeriodEnd)}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {subscription.channel.isLive && (
                        <Link href={`/${subscription.channel.slug || subscription.channel.id}`}>
                          <Button size="sm" variant="outline" className="cursor-pointer">
                            <Play className="h-4 w-4 mr-1" />
                            Watch
                          </Button>
                        </Link>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManageSubscription(subscription)}
                        disabled={managingSubscription === subscription.id}
                        className="cursor-pointer"
                      >
                        {managingSubscription === subscription.id ? (
                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Settings className="h-4 w-4 mr-1" />
                        )}
                        Manage
                      </Button>
                    </div>
                  </div>
                </div>

                {subscription.channel.bio && (
                  <>
                    <Separator className="my-4" />
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {subscription.channel.bio}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer Note */}
      {total > 0 && (
        <Card className="mt-8">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>
                Subscriptions are billed monthly at $4.99 per channel. You can manage or cancel anytime through the billing portal.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
