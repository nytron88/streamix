"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Eye, EyeOff, Key, Trash2, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface StreamData {
  channelId: string;
  ingressId: string | null;
  serverUrl: string | null;
  streamKey: string | null;
  isLive: boolean;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StreamKeysCardProps {
  streamData: StreamData | null;
  generating: boolean;
  resetting: boolean;
  onGenerateIngress: (type: "RTMP_INPUT" | "WHIP_INPUT") => void;
  onResetIngress: () => void;
}

export function StreamKeysCard({
  streamData,
  generating,
  resetting,
  onGenerateIngress,
  onResetIngress,
}: StreamKeysCardProps) {
  const [showKey, setShowKey] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<"RTMP_INPUT" | "WHIP_INPUT">("RTMP_INPUT");

  const hasIngress = streamData?.ingressId && streamData?.serverUrl;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard", {
        description: `${label} copied successfully`,
      });
    } catch {
      toast.error("Failed to copy", {
        description: "Could not copy to clipboard",
      });
    }
  };

  const handleGenerate = () => {
    onGenerateIngress(selectedType);
  };

  const handleReset = () => {
    setShowResetDialog(false);
    onResetIngress();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Streaming Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={hasIngress ? "default" : "secondary"}>
              {hasIngress ? "Configured" : "Not Configured"}
            </Badge>
            {streamData?.isLive && (
              <Badge variant="destructive" className="bg-red-500">
                LIVE
              </Badge>
            )}
          </div>

          <Separator />

          {hasIngress ? (
            /* Configured State */
            <div className="space-y-4">
              {/* Server URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Server URL</label>
                <div className="flex gap-2">
                  <Input
                    value={streamData?.serverUrl || ""}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(streamData?.serverUrl || "", "Server URL")}
                    className="cursor-pointer px-3"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Stream Key (only for RTMP) */}
              {streamData?.streamKey && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Stream Key</label>
                  <div className="flex gap-2">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={streamData.streamKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowKey(!showKey)}
                      className="cursor-pointer px-3"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(streamData.streamKey || "", "Stream Key")}
                      className="cursor-pointer px-3"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Keep your stream key private. Anyone with this key can stream to your channel.
                  </p>
                </div>
              )}

              {/* Ingress Info */}
              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ingress ID:</span>
                  <span className="font-mono">{streamData?.ingressId}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span>{streamData?.streamKey ? "RTMP" : "WHIP"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created:</span>
                  <span>
                    {streamData?.createdAt
                      ? new Date(streamData.createdAt).toLocaleDateString()
                      : "Unknown"}
                  </span>
                </div>
              </div>

              {/* Reset Button */}
              <div className="pt-4">
                <Button
                  variant="destructive"
                  onClick={() => setShowResetDialog(true)}
                  disabled={resetting || streamData?.isLive}
                  className="cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {resetting ? "Resetting..." : "Reset Keys"}
                </Button>
                {streamData?.isLive && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Cannot reset keys while streaming is live
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Not Configured State */
            <div className="space-y-4">
              <div className="text-center py-8">
                <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Stream Keys Configured</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Generate streaming keys to start broadcasting to your channel
                </p>
              </div>

              {/* Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ingress Type</label>
                <Select value={selectedType} onValueChange={(value: "RTMP_INPUT" | "WHIP_INPUT") => setSelectedType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RTMP_INPUT">
                      RTMP (Traditional streaming software)
                    </SelectItem>
                    <SelectItem value="WHIP_INPUT">
                      WHIP (Modern WebRTC-based)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedType === "RTMP_INPUT"
                    ? "Compatible with OBS, XSplit, and other traditional streaming software"
                    : "Modern WebRTC protocol for low-latency streaming from browsers"}
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-2" />
                {generating ? "Generating..." : "Generate Stream Keys"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reset Stream Keys?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your current stream keys and ingress configuration.
              You&apos;ll need to update your streaming software with new keys after this action.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Keys
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
