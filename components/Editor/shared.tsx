"use client";

/**
 * Shared BlockNote configuration used by both the collaborative editor
 * (components/Editor) and the Firebase-only editor (components/Editor2).
 *
 * Keeping the DOM attributes, toolbar and HTML-seeding logic in one place
 * guarantees fixes (e.g. the caret-direction fix) never drift between the
 * two editors.
 */

import { useEffect } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FileCaptionButton,
  FileReplaceButton,
  FormattingToolbar,
  FormattingToolbarController,
  NestBlockButton,
  TextAlignButton,
  UnnestBlockButton,
} from "@blocknote/react";
import { EnhanceTextButton } from "./EnhanceTextButton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Force strict LTR on every editable layer of the editor.
 *
 * The "caret jumps to the start of the line when clicking at the end" bug is
 * caused by (a) bidi direction being resolved per-node instead of forced LTR,
 * and (b) the block content only being as wide as its text, so a click in the
 * trailing whitespace resolves to position 0. Setting `dir="ltr"` on the block
 * container + content (not just the outer editor) fixes (a); the CSS in
 * globals.css (`.bn-block-content { width:100% }`) fixes (b).
 */
export const sharedEditorDomAttributes = {
  editor: {
    dir: "ltr",
    class: "notescape-editor",
  },
  blockContainer: {
    dir: "ltr",
  },
  blockContent: {
    dir: "ltr",
  },
  inlineContent: {
    dir: "ltr",
  },
} as const;

/** Cross-browser "which text position is at this point". */
function caretRangeAt(x: number, y: number): Range | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  if (doc.caretRangeFromPoint) {
    return doc.caretRangeFromPoint(x, y);
  }
  const pos = doc.caretPositionFromPoint?.(x, y);
  if (!pos) return null;
  const range = document.createRange();
  range.setStart(pos.offsetNode, pos.offset);
  range.collapse(true);
  return range;
}

function isEmptyBlock(block: { content?: unknown } | undefined): boolean {
  if (!block) return true;
  return Array.isArray(block.content) ? block.content.length === 0 : !block.content;
}

/**
 * Ensures the document ends with exactly one empty paragraph.
 * If it doesn't, we append one. If it has consecutive empty paragraphs
 * at the end (and the cursor is not in the last one), we clean up the extra one.
 */
export function ensureTrailingEmptyParagraph(editor: BlockNoteEditor) {
  const doc = editor.document;
  if (doc.length === 0) {
    editor.insertBlocks([{ type: "paragraph" }], doc[0] || "", "before");
    return;
  }

  const lastBlock = doc[doc.length - 1];
  const isParagraph = lastBlock.type === "paragraph";
  const isEmpty = isEmptyBlock(lastBlock);

  if (!isParagraph || !isEmpty) {
    // Append a trailing empty paragraph
    editor.insertBlocks([{ type: "paragraph" }], lastBlock, "after");
  } else if (doc.length >= 2) {
    const secondLastBlock = doc[doc.length - 2];
    if (secondLastBlock.type === "paragraph" && isEmptyBlock(secondLastBlock)) {
      const cursor = editor.getTextCursorPosition();
      if (cursor && cursor.block.id !== lastBlock.id) {
        editor.removeBlocks([lastBlock]);
      }
    }
  }
}

/**
 * Notion-style click handling for the whole editor column, not just the text.
 * The handler is attached to a full-width `container` (so clicks in the empty
 * area around and below the text are caught) and runs in the capture phase so
 * it beats ProseMirror's own mousedown, which would otherwise reset the caret
 * to the start of the line.
 *
 *  1. A click below the last block moves the caret to a trailing empty line,
 *     creating one if the note doesn't already end in an empty paragraph.
 *  2. A click in the horizontal padding (outside the text column) places the
 *     caret at the nearest character on that same line — i.e. the end of the
 *     line when clicking to its right — instead of the start of the line.
 */
export function useFullWidthCaret(
  editor: BlockNoteEditor,
  containerRef: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => {
      // Ignore touch/gesture events to allow native scrolling and gestures on mobile
      if (e.pointerType === "touch") return;
      if (e.button !== 0 || e.shiftKey) return;

      // Resolve the ProseMirror element by querying the DOM — editor.domElement
      // is unreliable across BlockNote versions (can be undefined), which made
      // this whole handler a no-op.
      const pmEl = container.querySelector<HTMLElement>(".ProseMirror");
      if (!pmEl) return;

      // Leave real editor UI (toolbar buttons, links, images, side menu) alone.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        target !== container &&
        target.closest("button, a, input, img, [contenteditable] [data-node-view-wrapper]")
      ) {
        return;
      }

      const rect = pmEl.getBoundingClientRect();
      const style = getComputedStyle(pmEl);
      const contentLeft = rect.left + (parseFloat(style.paddingLeft || "0") || 0);
      const contentRight = rect.right - (parseFloat(style.paddingRight || "0") || 0);

      const lastEl = pmEl.lastElementChild as HTMLElement | null;
      const contentBottom = lastEl ? lastEl.getBoundingClientRect().bottom : rect.bottom;

      const belowContent = e.clientY > contentBottom;
      const inSidePadding = e.clientX < contentLeft || e.clientX > contentRight;

      if (!belowContent && !inSidePadding) return; // normal in-text click

      // (1) Below the last block → trailing empty line (create if needed).
      if (belowContent) {
        e.preventDefault();
        e.stopPropagation();
        ensureTrailingEmptyParagraph(editor);
        const updated = editor.document;
        editor.setTextCursorPosition(updated[updated.length - 1], "end");
        editor.focus();
        return;
      }

      // (2) Side padding → nearest character on that visual line.
      const isRightClick = e.clientX > contentRight;
      const direction = isRightClick ? "end" : "start";

      const clampedX = isRightClick ? contentRight - 1 : contentLeft + 1;
      const element = document.elementFromPoint(clampedX, e.clientY);
      const blockEl = element?.closest("[data-id]");
      if (blockEl) {
        const blockId = blockEl.getAttribute("data-id");
        if (blockId) {
          e.preventDefault();
          e.stopPropagation();
          editor.setTextCursorPosition(blockId, direction);
          editor.focus();
          return;
        }
      }

      // Fallback: range-based caret placement
      const range = caretRangeAt(clampedX, e.clientY);
      if (!range || !pmEl.contains(range.startContainer)) return;
      e.preventDefault();
      e.stopPropagation();
      pmEl.focus({ preventScroll: true });
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    };

    // Capture phase so we run before ProseMirror's handler.
    container.addEventListener("pointerdown", onPointerDown, true);
    return () => container.removeEventListener("pointerdown", onPointerDown, true);
  }, [editor, containerRef]);
}

/**
 * Seed a freshly-created editor with stored HTML content and guarantee a
 * trailing empty paragraph so the user can always click below the last block.
 */
export async function seedEditorFromHTML(editor: BlockNoteEditor, html: string) {
  const blocks = await editor.tryParseHTMLToBlocks(html);
  editor.replaceBlocks(editor.document, blocks);

  const lastBlock = editor.document[editor.document.length - 1];
  const hasContent = Array.isArray(lastBlock?.content)
    ? lastBlock.content.length > 0
    : !!lastBlock?.content;
  const hasChildren = (lastBlock?.children?.length ?? 0) > 0;
  if (lastBlock && (hasContent || hasChildren)) {
    editor.insertBlocks(
      [{ type: "paragraph", content: "" }],
      editor.document[editor.document.length - 1]
    );
  }
}

/**
 * A skeleton placeholder that matches the editor column while it loads.
 */
export function EditorSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12 space-y-4">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/**
 * The formatting toolbar shared by both editors.
 */
export function SharedFormattingToolbar({ editor }: { editor: BlockNoteEditor }) {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          <BlockTypeSelect key={"blockTypeSelect"} />
          <FileCaptionButton key={"fileCaptionButton"} />
          <FileReplaceButton key={"replaceFileButton"} />
          <BasicTextStyleButton basicTextStyle={"bold"} key={"boldStyleButton"} />
          <BasicTextStyleButton basicTextStyle={"italic"} key={"italicStyleButton"} />
          <BasicTextStyleButton basicTextStyle={"underline"} key={"underlineStyleButton"} />
          <BasicTextStyleButton basicTextStyle={"strike"} key={"strikeStyleButton"} />
          <BasicTextStyleButton basicTextStyle={"code"} key={"codeStyleButton"} />
          <TextAlignButton textAlignment={"left"} key={"textAlignLeftButton"} />
          <TextAlignButton textAlignment={"center"} key={"textAlignCenterButton"} />
          <TextAlignButton textAlignment={"right"} key={"textAlignRightButton"} />
          <ColorStyleButton key={"colorStyleButton"} />
          <NestBlockButton key={"nestBlockButton"} />
          <UnnestBlockButton key={"unnestBlockButton"} />
          <CreateLinkButton key={"createLinkButton"} />
          <EnhanceTextButton key={"enhanceTextButton"} editor={editor} />
        </FormattingToolbar>
      )}
    />
  );
}
