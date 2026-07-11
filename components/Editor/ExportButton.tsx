"use client";

import type { BlockNoteEditor } from "@blocknote/core";
import { Download, FileText, FileType, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function noteTitle() {
  return (
    document.title.replace(/\s*\|\s*NoteScape$|^NoteScape\s*-\s*/g, "").trim() || "note"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const EXPORT_STYLES = `
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1f1f1f; max-width: 520pt; margin: 24pt auto; line-height: 1.5; font-size: 11pt; }
  h1 { font-size: 22pt; margin: 14pt 0 6pt; } h2 { font-size: 16pt; margin: 12pt 0 5pt; } h3 { font-size: 13pt; margin: 10pt 0 4pt; }
  p { margin: 4pt 0; }
  ul, ol { padding-left: 22pt; margin: 4pt 0; }
  li { margin: 2pt 0; }
  p.checklist { margin: 2pt 0; }
  p.checklist .checkmark { margin-right: 4pt; font-size: 12pt; }
  p.checklist.checked { text-decoration: line-through; color: #777; }
  img { max-width: 100%; }
  code { background: #f1f1f1; padding: 2pt 4pt; border-radius: 3pt; font-family: Consolas, monospace; }
`;

/**
 * BlockNote's HTML uses <ul><li><input type="checkbox"><p>…</p></li> for check
 * list items. Word ignores `list-style:none`, so a bullet AND the checkbox
 * both show, and the text drops to its own line. To render cleanly in both the
 * print (PDF) and Word paths, drop the list entirely: turn each check item into
 * a plain paragraph with an inline ☑/☐ glyph, and unwrap the <p> inside normal
 * list items so their text stays on the marker's line.
 */
function cleanExportHTML(rawHtml: string): string {
  const container = document.createElement("div");
  container.innerHTML = rawHtml;

  const isCheckItem = (li: Element) => !!li.querySelector('input[type="checkbox"]');

  // Replace lists whose items are all check items with a run of paragraphs.
  container.querySelectorAll("ul, ol").forEach((list) => {
    const items = Array.from(list.children).filter((c) => c.tagName === "LI");
    if (items.length === 0 || !items.every(isCheckItem)) return;

    const frag = document.createDocumentFragment();
    items.forEach((li) => {
      const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement;
      const checked = checkbox.checked;
      const textEl = li.querySelector("p");
      const inner = textEl ? textEl.innerHTML : (li.textContent || "").trim();

      const p = document.createElement("p");
      p.className = checked ? "checklist checked" : "checklist";
      p.innerHTML = `<span class="checkmark">${checked ? "☑" : "☐"}</span>${inner}`;
      frag.appendChild(p);
    });
    list.replaceWith(frag);
  });

  // Any stray checkboxes left inside mixed lists: swap for an inline glyph.
  container.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    const checkbox = input as HTMLInputElement;
    const span = document.createElement("span");
    span.textContent = checkbox.checked ? "☑ " : "☐ ";
    checkbox.replaceWith(span);
  });

  // Unwrap labels (BlockNote wraps the checkbox in one) and the <p> inside
  // remaining <li> so bullet text isn't pushed onto a new line in Word.
  container.querySelectorAll("label").forEach((label) => {
    label.replaceWith(...Array.from(label.childNodes));
  });
  container.querySelectorAll("li > p").forEach((p) => {
    p.replaceWith(...Array.from(p.childNodes));
  });

  return container.innerHTML;
}

/** Export the current note as Markdown, PDF (via print dialog) or Word. */
export function ExportButton({ editor }: { editor: BlockNoteEditor }) {
  const exportMarkdown = async () => {
    try {
      const markdown = await editor.blocksToMarkdownLossy(editor.document);
      downloadBlob(
        new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
        `${noteTitle()}.md`
      );
      toast.success("Exported as Markdown");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export note");
    }
  };

  const buildHTMLDocument = async (title: string) => {
    const body = cleanExportHTML(await editor.blocksToHTMLLossy(editor.document));
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${EXPORT_STYLES}</style></head><body><h1>${title}</h1>${body}</body></html>`;
  };

  const exportPDF = async () => {
    try {
      const html = await buildHTMLDocument(noteTitle());
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Pop-up blocked — allow pop-ups to export as PDF");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      // Give images/fonts a moment to load before the print dialog opens.
      printWindow.onload = () => setTimeout(() => printWindow.print(), 250);
      toast.info('Choose "Save as PDF" in the print dialog');
    } catch (error) {
      console.error(error);
      toast.error("Failed to export note");
    }
  };

  const exportWord = async () => {
    try {
      const html = await buildHTMLDocument(noteTitle());
      // Word opens HTML documents saved with a .doc extension natively.
      downloadBlob(
        new Blob(["﻿", html], { type: "application/msword" }),
        `${noteTitle()}.doc`
      );
      toast.success("Exported as Word document");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export note");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" title="Export note">
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportMarkdown} className="cursor-pointer">
          <FileText className="h-4 w-4 mr-2" />
          Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPDF} className="cursor-pointer">
          <Printer className="h-4 w-4 mr-2" />
          PDF (print)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportWord} className="cursor-pointer">
          <FileType className="h-4 w-4 mr-2" />
          Word (.doc)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
