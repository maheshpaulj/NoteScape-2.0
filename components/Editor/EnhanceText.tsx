"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EnhanceTextProps {
  onEnhance: (originalText: string, enhancedText: string) => void;
  selectedText: string;
  disabled?: boolean;
}

export function EnhanceText({ onEnhance, selectedText, disabled }: EnhanceTextProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!selectedText.trim()) {
      toast.error("Please select some text to enhance");
      return;
    }

    setIsEnhancing(true);
    try {
      const response = await fetch("/api/enhance-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: selectedText }),
      });

      if (!response.ok) {
        throw new Error("Failed to enhance text");
      }

      const { enhancedText } = await response.json();
      onEnhance(selectedText, enhancedText);
      toast.success("Text enhanced successfully!");
    } catch (error) {
      console.error("Error enhancing text:", error);
      toast.error("Failed to enhance text. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <Button
      onClick={handleEnhance}
      disabled={disabled || isEnhancing || !selectedText.trim()}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      {isEnhancing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {isEnhancing ? "Enhancing..." : "Enhance Text"}
    </Button>
  );
}
