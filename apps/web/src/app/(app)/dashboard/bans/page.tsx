"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Ban,
    Shield,
    Clock,
    AlertCircle,
    UserX,
    Calendar,
    MoreVertical,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useChannelBans } from "@/hooks/useChannelBans";
import { useBanUser } from "@/hooks/useBanUser";

export default function BansPage() {
    const { bans, loading, error, refresh } = useChannelBans();
    const { unbanUser, loading: unbanLoading } = useBanUser();

    const handleUnban = async (banId: string, userName: string) => {
        const success = await unbanUser(banId);
        if (success) {
            refresh(); // Refresh the bans list
            toast.success(`${userName || "User"} has been unbanned`);
        }
    };

    const formatDate = (date: Date | string) => {
        const d = typeof date === "string" ? new Date(date) : date;
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const isExpired = (expiresAt: string | null) => {
        if (!expiresAt) return false;
        const expiry = new Date(expiresAt);
        return expiry <= new Date();
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-muted rounded w-64 mb-6" />
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-muted rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="max-w-md mx-auto">
                    <CardContent className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Failed to Load Bans</h3>
                        <p className="text-muted-foreground mb-4">
                            There was an error loading the bans list.
                        </p>
                        <Button onClick={() => refresh()}>Try Again</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-red-500" />
                    <div>
                        <h1 className="text-3xl font-bold">Banned Users</h1>
                        <p className="text-muted-foreground">
                            Manage users who are banned from your channel
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-2xl font-bold">{bans.length}</div>
                    <div className="text-sm text-muted-foreground">Total Bans</div>
                </div>
            </div>

            {/* Bans List */}
            {bans.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12">
                        <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Banned Users</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            You haven't banned any users from your channel yet.
                            Banned users will appear here for you to manage.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {bans.map((ban) => (
                        <Card key={ban.id} className={isExpired(ban.expiresAt) ? "opacity-60" : ""}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    {/* User Info */}
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={ban.userImageUrl || undefined} />
                                            <AvatarFallback>
                                                {ban.userName?.charAt(0)?.toUpperCase() || "?"}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">
                                                    {ban.userName || "Unknown User"}
                                                </h3>
                                                {isExpired(ban.expiresAt) ? (
                                                    <Badge variant="secondary">Expired</Badge>
                                                ) : ban.expiresAt ? (
                                                    <Badge variant="outline">Temporary</Badge>
                                                ) : (
                                                    <Badge variant="destructive">Permanent</Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Banned {formatDate(ban.createdAt)}
                                                </div>

                                                {ban.expiresAt && !isExpired(ban.expiresAt) && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Expires {formatDate(ban.expiresAt)}
                                                    </div>
                                                )}
                                            </div>

                                            {ban.reason && (
                                                <p className="text-sm text-muted-foreground">
                                                    <span className="font-medium">Reason:</span> {ban.reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={unbanLoading}
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => handleUnban(ban.id, ban.userName || "User")}
                                                    className="text-green-600 focus:text-green-600"
                                                >
                                                    <UserX className="h-4 w-4 mr-2" />
                                                    Remove Ban
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Stats Card */}
            {bans.length > 0 && (
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Ban className="h-5 w-5" />
                            Ban Statistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-2xl font-bold text-red-500">
                                    {bans.filter(ban => !ban.expiresAt).length}
                                </div>
                                <div className="text-sm text-muted-foreground">Permanent Bans</div>
                            </div>

                            <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-2xl font-bold text-orange-500">
                                    {bans.filter(ban => ban.expiresAt && !isExpired(ban.expiresAt)).length}
                                </div>
                                <div className="text-sm text-muted-foreground">Active Temporary</div>
                            </div>

                            <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-2xl font-bold text-gray-500">
                                    {bans.filter(ban => ban.expiresAt && isExpired(ban.expiresAt)).length}
                                </div>
                                <div className="text-sm text-muted-foreground">Expired Bans</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
