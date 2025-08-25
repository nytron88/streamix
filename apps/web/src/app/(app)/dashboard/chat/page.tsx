"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    MessageCircle,
    Users,
    Clock,
    Shield,
    Settings,
    Save,
    RotateCcw
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChatSettingsInput } from "@/types/chat";



export default function ChatSettingsPage() {
    const [settings, setSettings] = useState<ChatSettingsInput>({
        isChatEnabled: true,
        isChatDelayed: false,
        isChatFollowersOnly: false,
    });
    const [originalSettings, setOriginalSettings] = useState<ChatSettingsInput>({
        isChatEnabled: true,
        isChatDelayed: false,
        isChatFollowersOnly: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch current chat settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get("/api/stream/chat");
                const chatSettings = response.data.payload.chatSettings;
                setSettings(chatSettings);
                setOriginalSettings(chatSettings);
            } catch (error) {
                console.error("Failed to fetch chat settings:", error);
                toast.error("Failed to load chat settings");
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    // Check if there are unsaved changes
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

    // Handle setting changes
    const handleSettingChange = (key: keyof ChatSettingsInput, value: boolean) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Save settings
    const handleSave = async () => {
        if (!hasChanges) {
            toast.info("No changes to save");
            return;
        }

        setSaving(true);
        try {
            const response = await axios.patch("/api/stream/chat", settings);
            const updatedSettings = response.data.payload.chatSettings;

            setSettings(updatedSettings);
            setOriginalSettings(updatedSettings);
            toast.success("Chat settings saved successfully");
        } catch (error: any) {
            console.error("Failed to save chat settings:", error);
            const errorMessage = error.response?.data?.message || "Failed to save chat settings";
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    // Reset to original settings
    const handleReset = () => {
        setSettings(originalSettings);
        toast.info("Changes reset");
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 bg-muted rounded w-1/3"></div>
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-48 bg-muted rounded"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold">Chat Settings</h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                        Configure how viewers can interact with your stream chat
                    </p>
                </div>

                {hasChanges && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        <Settings className="h-3 w-3 mr-1" />
                        Unsaved Changes
                    </Badge>
                )}
            </div>

            {/* Chat Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Chat Configuration
                    </CardTitle>
                    <CardDescription>
                        Control the basic chat functionality for your stream
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Chat Enabled */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="chat-enabled" className="text-base font-medium">
                                    Enable Chat
                                </Label>
                                <Badge variant={settings.isChatEnabled ? "default" : "secondary"}>
                                    {settings.isChatEnabled ? "Enabled" : "Disabled"}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Allow viewers to send messages in your stream chat
                            </p>
                        </div>
                        <Switch
                            id="chat-enabled"
                            checked={settings.isChatEnabled}
                            onCheckedChange={(checked) => handleSettingChange("isChatEnabled", checked)}
                        />
                    </div>

                    {/* Chat Delayed */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor="chat-delayed" className="text-base font-medium">
                                    Delayed Chat
                                </Label>
                                <Badge variant={settings.isChatDelayed ? "default" : "outline"}>
                                    {settings.isChatDelayed ? "Delayed" : "Real-time"}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Add a delay to chat messages to prevent spoilers or stream sniping
                            </p>
                        </div>
                        <Switch
                            id="chat-delayed"
                            checked={settings.isChatDelayed}
                            onCheckedChange={(checked) => handleSettingChange("isChatDelayed", checked)}
                            disabled={!settings.isChatEnabled}
                        />
                    </div>

                    {/* Followers Only */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor="followers-only" className="text-base font-medium">
                                    Followers-Only Chat
                                </Label>
                                <Badge variant={settings.isChatFollowersOnly ? "default" : "outline"}>
                                    {settings.isChatFollowersOnly ? "Followers Only" : "Everyone"}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Only allow followers to send messages in chat
                            </p>
                        </div>
                        <Switch
                            id="followers-only"
                            checked={settings.isChatFollowersOnly}
                            onCheckedChange={(checked) => handleSettingChange("isChatFollowersOnly", checked)}
                            disabled={!settings.isChatEnabled}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4">
                        <Button
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleReset}
                            disabled={!hasChanges || saving}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Reset
                        </Button>

                        {hasChanges && (
                            <p className="text-sm text-muted-foreground">
                                You have unsaved changes
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Additional Chat Features - Coming Soon */}
            <Card className="opacity-60">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Advanced Moderation
                        <Badge variant="outline">Coming Soon</Badge>
                    </CardTitle>
                    <CardDescription>
                        Advanced chat moderation tools and settings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-muted rounded-full"></div>
                            Slow mode (time limits between messages)
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-muted rounded-full"></div>
                            Subscriber-only chat
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-muted rounded-full"></div>
                            Auto-moderation filters
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-muted rounded-full"></div>
                            Custom word filters
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-muted rounded-full"></div>
                            Link filtering
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-muted rounded-full"></div>
                            Chat moderator permissions
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
