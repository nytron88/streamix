"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, DollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface TipModalProps {
  channelId: string;
  channelName: string;
  children: React.ReactNode;
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000]; // $5, $10, $25, $50, $100

export function TipModal({ channelId, channelName, children }: TipModalProps) {
  const [open, setOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePresetAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const getFinalAmount = (): number => {
    if (selectedAmount) return selectedAmount;
    if (customAmount) {
      const amount = parseFloat(customAmount) * 100; // Convert dollars to cents
      return Math.floor(amount);
    }
    return 0;
  };

  const formatAmount = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleTip = async () => {
    const amountCents = getFinalAmount();
    
    if (amountCents < 100) {
      toast.error("Minimum tip amount is $1.00");
      return;
    }

    if (amountCents > 100000) {
      toast.error("Maximum tip amount is $1,000.00");
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await axios.post("/api/stripe/create-tip-session", {
        channelId,
        amountCents,
        min: 100,
        max: 100000,
      });

      const { url } = response.data.payload;
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: unknown) {
      console.error("Tip error:", error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create tip session";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const finalAmount = getFinalAmount();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            Send Tip to {channelName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Preset Amounts */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Amounts</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetAmount(amount)}
                  className="cursor-pointer"
                >
                  {formatAmount(amount)}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label htmlFor="custom-amount" className="text-sm font-medium">
              Custom Amount
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="custom-amount"
                type="number"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                className="pl-10"
                min="1"
                max="1000"
                step="0.01"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter amount in dollars (minimum $1.00, maximum $1,000.00)
            </p>
          </div>

          {/* Amount Summary */}
          {finalAmount > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tip Amount:</span>
                  <span className="text-lg font-bold text-purple-600">
                    {formatAmount(finalAmount)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  You&apos;ll be redirected to Stripe to complete the payment
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 cursor-pointer"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTip}
              disabled={finalAmount < 100 || isProcessing}
              className="flex-1 bg-purple-600 hover:bg-purple-700 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Send Tip
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
