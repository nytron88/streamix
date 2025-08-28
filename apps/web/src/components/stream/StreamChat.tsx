"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { 
  useChat, 
  useParticipants, 
  useLocalParticipant,
  ChatMessage 
} from "@livekit/components-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MessageCircle,
  Send,
  Users,
  Crown,
  Heart,
  AlertCircle,
  Settings,
  MoreVertical,
  Ban,
  UserX,
  Shield
} from "lucide-react";
import { toast } from "sonner";

interface StreamChatProps {
  channelDisplayName?: string;
  chatSettings?: {
    isChatEnabled: boolean;
    isChatDelayed: boolean;
    isChatFollowersOnly: boolean;
  };
}

interface UserMetadata {
  userId: string;
  username: string;
  isChannelOwner: boolean;
  isFollowing: boolean;
  canChat: boolean;
}

export function StreamChat({ channelDisplayName, chatSettings }: StreamChatProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState<{userId: string, username: string} | null>(null);
  const [banForm, setBanForm] = useState({
    reason: "",
    expiresAt: "",
    isPermanent: false,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { chatMessages, send, isSending } = useChat();
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();

  // Parse local participant metadata
  const localUserMetadata: UserMetadata | null = localParticipant.localParticipant?.metadata
    ? JSON.parse(localParticipant.localParticipant.metadata)
    : null;

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  // Get user metadata from message
  const getUserMetadata = (message: ChatMessage): UserMetadata | null => {
    try {
      // Check if message has participant with metadata
      const participant = (message as any).participant || (message as any).from;
      return participant?.metadata ? JSON.parse(participant.metadata) : null;
    } catch {
      return null;
    }
  };

  // Get random color for username (Twitch-style)
  const getUsernameColor = (username: string): string => {
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", 
      "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;

    if (!localUserMetadata?.canChat) {
      if (chatSettings?.isChatFollowersOnly && !localUserMetadata?.isFollowing) {
        toast.error("Follow to chat", {
          description: "Only followers can send messages in this chat"
        });
      } else if (!chatSettings?.isChatEnabled) {
        toast.error("Chat disabled", {
          description: "Chat is currently disabled for this stream"
        });
      } else {
        toast.error("Cannot send message", {
          description: "You don't have permission to chat"
        });
      }
      return;
    }

    try {
      await send(message);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message", {
        description: "Please try again"
      });
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Open ban modal
  const openBanModal = (userId: string, username: string) => {
    setBanTargetUser({ userId, username });
    setBanForm({
      reason: "",
      expiresAt: "",
      isPermanent: false,
    });
    setBanModalOpen(true);
  };

  // Handle ban user with form data
  const handleBanUser = async () => {
    if (!banTargetUser) return;

    try {
      // Prepare ban data
      const banData: any = {
        userId: banTargetUser.userId,
        reason: banForm.reason.trim() || undefined,
        isPermanent: banForm.isPermanent,
      };

      // Add expiry date if not permanent and date is provided
      if (!banForm.isPermanent && banForm.expiresAt) {
        banData.expiresAt = new Date(banForm.expiresAt).toISOString();
      }

      await axios.post("/api/bans", banData);
      
      // Close modal and reset
      setBanModalOpen(false);
      setBanTargetUser(null);
      setBanForm({
        reason: "",
        expiresAt: "",
        isPermanent: false,
      });
      
      toast.success(`${banTargetUser.username} has been banned`);
    } catch (error: any) {
      console.error("Failed to ban user:", error);
      toast.error(error.response?.data?.error || "Failed to ban user");
    }
  };

  // Handle timeout user (5 minute ban)
  const handleTimeoutUser = async (userId: string, username: string) => {
    try {
      const timeoutEnd = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await axios.post("/api/bans", {
        userId,
        reason: "5 minute timeout",
        expiresAt: timeoutEnd.toISOString(),
        isPermanent: false,
      });
      toast.success(`${username} has been timed out for 5 minutes`);
    } catch (error: any) {
      console.error("Failed to timeout user:", error);
      toast.error(error.response?.data?.error || "Failed to timeout user");
    }
  };

  // Chat disabled state
  if (!chatSettings?.isChatEnabled) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" />
            Stream Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Chat is disabled for this stream</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="text-base">Stream Chat</span>
          </div>
          <div className="flex items-center gap-2">
            {chatSettings?.isChatFollowersOnly && (
              <Badge variant="secondary" className="text-xs">
                <Heart className="h-3 w-3 mr-1" />
                Followers
              </Badge>
            )}
            {chatSettings?.isChatDelayed && (
              <Badge variant="outline" className="text-xs">
                Delayed
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {participants.length}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <Separator />

      {/* Messages Area */}
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3 py-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs">Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const userMetadata = getUserMetadata(msg);
                const participant = (msg as any).participant || (msg as any).from;
                const username = userMetadata?.username || participant?.name || "Anonymous";
                const userId = userMetadata?.userId;
                const isOwner = userMetadata?.isChannelOwner || false;
                const isFollowing = userMetadata?.isFollowing || false;
                const isLocalUser = localUserMetadata?.userId === userId;
                const canModerate = localUserMetadata?.isChannelOwner && !isOwner && !isLocalUser;

                return (
                  <div key={msg.timestamp} className="group hover:bg-muted/20 px-2 py-1 rounded-sm transition-colors">
                    <div className="flex items-start gap-1">
                      {/* Timestamp - only show on hover */}
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity min-w-[3rem] text-right mt-0.5">
                        {formatTime(msg.timestamp)}
                      </span>
                      
                      {/* Badges */}
                      <div className="flex items-center gap-1 mt-0.5">
                        {isOwner && (
                          <Crown className="h-3 w-3 text-yellow-500" />
                        )}
                        
                        {isFollowing && !isOwner && (
                          <Heart className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                      
                      {/* Username */}
                      <span 
                        className="font-semibold text-sm cursor-pointer hover:underline"
                        style={{ color: getUsernameColor(username) }}
                      >
                        {username}
                      </span>
                      
                      {/* Colon */}
                      <span className="text-muted-foreground">:</span>
                      
                      {/* Message */}
                      <span className="text-sm break-words leading-relaxed flex-1">
                        {msg.message}
                      </span>
                      
                      {/* Moderation Menu */}
                      {canModerate && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 hover:bg-muted"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem 
                                onClick={() => handleTimeoutUser(userId!, username)}
                                className="text-orange-600 focus:text-orange-600"
                              >
                                <UserX className="h-3 w-3 mr-2" />
                                Timeout (5m)
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openBanModal(userId!, username)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Ban className="h-3 w-3 mr-2" />
                                Ban User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        {/* Message Input */}
        <div className="p-4">
          {localUserMetadata?.canChat ? (
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Chat as ${localUserMetadata.username}...`}
                className="flex-1"
                maxLength={500}
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <AlertCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {chatSettings?.isChatFollowersOnly && !localUserMetadata?.isFollowing
                  ? "Follow to chat"
                  : "You cannot send messages"}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Ban Modal */}
      <Dialog open={banModalOpen} onOpenChange={setBanModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Ban {banTargetUser?.username || "this user"} from the chat. This will prevent them from accessing the stream and chatting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="chat-ban-reason">Reason (optional)</Label>
              <Input
                id="chat-ban-reason"
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
                id="chat-permanent-ban"
                checked={banForm.isPermanent}
                onCheckedChange={(checked) => setBanForm(prev => ({ 
                  ...prev, 
                  isPermanent: checked,
                  expiresAt: checked ? "" : prev.expiresAt 
                }))}
              />
              <Label htmlFor="chat-permanent-ban">Permanent ban</Label>
            </div>

            {!banForm.isPermanent && (
              <div className="space-y-2">
                <Label htmlFor="chat-ban-expiry">Expires at (optional)</Label>
                <Input
                  id="chat-ban-expiry"
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
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleBanUser}
            >
              Ban User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
