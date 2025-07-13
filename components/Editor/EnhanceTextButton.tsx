"use client";

import { useState } from "react";
import { useComponentsContext } from "@blocknote/react";
import { BlockNoteEditor, Block } from "@blocknote/core";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EnhanceTextButtonProps {
  editor: BlockNoteEditor;
}

// Helper function to parse markdown text into BlockNote blocks
function parseMarkdownToBlocks(markdownText: string): any[] {
  const lines = markdownText.split('\n');
  const blocks: any[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (trimmedLine === '') {
      // Skip empty lines
      continue;
    }
    
    // Parse headings
    if (trimmedLine.startsWith('### ')) {
      blocks.push({
        type: "heading",
        props: { level: 3 },
        content: parseInlineContent(trimmedLine.replace('### ', ''))
      });
    } else if (trimmedLine.startsWith('## ')) {
      blocks.push({
        type: "heading",
        props: { level: 2 },
        content: parseInlineContent(trimmedLine.replace('## ', ''))
      });
    } else if (trimmedLine.startsWith('# ')) {
      blocks.push({
        type: "heading",
        props: { level: 1 },
        content: parseInlineContent(trimmedLine.replace('# ', ''))
      });
    }
    // Parse bullet points
    else if (trimmedLine.startsWith('- ')) {
      blocks.push({
        type: "bulletListItem",
        content: parseInlineContent(trimmedLine.replace('- ', ''))
      });
    }
    // Parse numbered lists
    else if (/^\d+\.\s/.test(trimmedLine)) {
      blocks.push({
        type: "numberedListItem",
        content: parseInlineContent(trimmedLine.replace(/^\d+\.\s/, ''))
      });
    }
    // Parse blockquotes
    else if (trimmedLine.startsWith('> ')) {
      blocks.push({
        type: "paragraph", // BlockNote might not have blockquote, use paragraph
        content: parseInlineContent(trimmedLine.replace('> ', ''))
      });
    }
    // Parse regular paragraphs
    else {
      blocks.push({
        type: "paragraph",
        content: parseInlineContent(trimmedLine)
      });
    }
  }
  
  return blocks;
}

// Helper function to parse inline content (bold, italic, etc.)
function parseInlineContent(text: string): any[] {
  if (!text.trim()) {
    return [{ type: "text", text: "", styles: {} }];
  }

  const elements: any[] = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    // Look for **bold** text
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      // Add text before bold
      if (boldMatch.index > 0) {
        elements.push({
          type: "text",
          text: remaining.substring(0, boldMatch.index),
          styles: {}
        });
      }
      // Add bold text
      elements.push({
        type: "text",
        text: boldMatch[1],
        styles: { bold: true }
      });
      remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      continue;
    }
    
    // Look for *italic* text
    const italicMatch = remaining.match(/\*([^*]+?)\*/);
    if (italicMatch && italicMatch.index !== undefined) {
      // Add text before italic
      if (italicMatch.index > 0) {
        elements.push({
          type: "text",
          text: remaining.substring(0, italicMatch.index),
          styles: {}
        });
      }
      // Add italic text
      elements.push({
        type: "text",
        text: italicMatch[1],
        styles: { italic: true }
      });
      remaining = remaining.substring(italicMatch.index + italicMatch[0].length);
      continue;
    }
    
    // No more formatting found, add remaining text
    elements.push({
      type: "text",
      text: remaining,
      styles: {}
    });
    break;
  }
  
  return elements.length > 0 ? elements : [{ type: "text", text: text, styles: {} }];
}

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
      
      // Parse the enhanced markdown text into BlockNote blocks
      const enhancedBlocks = parseMarkdownToBlocks(enhancedText);
      
      if (enhancedBlocks && enhancedBlocks.length > 0) {
        editor.replaceBlocks(selection.blocks, enhancedBlocks);
      } else {
        // Fallback: create a simple paragraph block
        const fallbackBlock = {
          type: "paragraph",
          content: [{ type: "text", text: enhancedText, styles: {} }]
        };
        editor.replaceBlocks(selection.blocks, [fallbackBlock]);
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
