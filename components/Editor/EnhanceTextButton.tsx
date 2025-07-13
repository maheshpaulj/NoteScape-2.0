"use client";

import { useState } from "react";
import { useComponentsContext } from "@blocknote/react";
import { BlockNoteEditor } from "@blocknote/core";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EnhanceTextButtonProps {
  editor: BlockNoteEditor;
}

export function EnhanceTextButton({ editor }: EnhanceTextButtonProps) {
  const Components = useComponentsContext()!;
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleEnhance = async () => {
    try {
      // Get the current selection
      const selection = editor.getSelection();
      
      if (!selection) {
        toast.error("Please select some text to enhance");
        return;
      }

      // Convert selection to HTML to get the text content
      const selectedHTML = await editor.blocksToHTMLLossy(selection.blocks);
      
      // Extract text content from HTML (simple text extraction)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = selectedHTML;
      const selectedText = tempDiv.textContent || tempDiv.innerText || '';
      
      if (!selectedText || selectedText.trim().length === 0) {
        toast.error("Please select some text to enhance");
        return;
      }

      setIsEnhancing(true);
      
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
      
      // Create new blocks with enhanced text
      const enhancedBlocks = await editor.tryParseHTMLToBlocks(`<p>${enhancedText}</p>`);
      
      if (enhancedBlocks && enhancedBlocks.length > 0) {
        editor.replaceBlocks(selection.blocks, enhancedBlocks);
      }
      
      toast.success("Text enhanced successfully!");
    } catch (error) {
      console.error("Error enhancing text:", error);
      toast.error("Failed to enhance text. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      onClick={handleEnhance}
      isDisabled={isEnhancing}
      mainTooltip={isEnhancing ? "Enhancing..." : "Enhance Text"}
    >
      {isEnhancing ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Sparkles size={16} />
      )}
    </Components.FormattingToolbar.Button>
  );
}
