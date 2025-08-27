import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Star, Calendar } from "lucide-react";

interface ProfileStatsProps {
    followerCount: number;
    subscriberCount: number;
    joinedDate: string;
}

export function ProfileStats({ followerCount, subscriberCount, joinedDate }: ProfileStatsProps) {
    // Format large numbers
    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    // Format the join date
    const formatJoinDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Followers */}
            <Card>
                <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{formatNumber(followerCount)}</div>
                    <div className="text-sm text-muted-foreground">Followers</div>
                </CardContent>
            </Card>

            {/* Subscribers */}
            <Card>
                <CardContent className="p-4 text-center">
                    <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">{formatNumber(subscriberCount)}</div>
                    <div className="text-sm text-muted-foreground">Subscribers</div>
                </CardContent>
            </Card>

            {/* Join Date */}
            <Card>
                <CardContent className="p-4 text-center">
                    <Calendar className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                    <div className="text-sm font-medium">{formatJoinDate(joinedDate)}</div>
                    <div className="text-sm text-muted-foreground">Joined</div>
                </CardContent>
            </Card>
        </div>
    );
}
