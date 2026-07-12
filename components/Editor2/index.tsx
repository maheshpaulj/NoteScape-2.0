"use client";

import * as Y from "yjs";
import { useEffect, useRef, useState, useCallback } from "react";
import { BlockNoteView } from "@blocknote/shadcn";
import { Block } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import { useTheme } from "next-themes";
import { useEdgeStore } from "@/lib/edgestore";
import debounce from "lodash/debounce";
import { doc, serverTimestamp, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import TranslateNote from "../Editor/TranslateNote";
import ChatToNote from "../Editor/ChatToNote";
import { ExportButton } from "../Editor/ExportButton";
import { useUser } from "@clerk/clerk-react";
import {
  EditorSkeleton,
  SharedFormattingToolbar,
  seedEditorFromHTML,
  sharedEditorDomAttributes,
  useFullWidthCaret,
  ensureTrailingEmptyParagraph,
} from "../Editor/shared";

type SaveStatus = "saved" | "saving" | "idle";

export default function Editor({ noteId }: { noteId: string }) {
  const { resolvedTheme } = useTheme();
  const { edgestore } = useEdgeStore();
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const { user } = useUser();

  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useCreateBlockNote({
    uploadFile: async (file: File) => {
      const response = await edgestore.publicFiles.upload({ file });
      return response.url;
    },
    domAttributes: sharedEditorDomAttributes,
  });

  useFullWidthCaret(editor, containerRef);

  const [yDoc] = useState<Y.Doc>(() => { //eslint-disable-line @typescript-eslint/no-unused-vars
    const d = new Y.Doc();
    d.getXmlFragment("note-store");
    return d;
  });

  // Load initial content
  useEffect(() => {
    const loadContent = async () => {
      try {
        const docRef = doc(db, "notes", noteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().content) {
          const content = docSnap.data().content;
          await seedEditorFromHTML(editor, content);

          // Update yDoc for TranslateNote and ChatToNote
          const fragment = yDoc.getXmlFragment("note-store");
          while (fragment.firstChild) {
            fragment.delete(0, 1);
          }
          const element = new Y.XmlElement("div");
          element.insert(0, [content]);
          fragment.push([element]);
        }
      } catch (error) {
        console.error("Error loading content:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [editor, noteId, yDoc]);

  // Debounced save function for blocks
  const saveToFirebase = useCallback( //eslint-disable-line react-hooks/exhaustive-deps
    debounce(async (blocks: Block[]) => {
      if (!user) return;
      try {
        setSaveStatus("saving");
        const content = await editor.blocksToHTMLLossy(blocks);
        await updateDoc(doc(db, "notes", noteId), {
          content,
          // Mark the snapshot as solo-authored: these edits never reached the
          // Yjs doc, so the collaborative editor must re-seed from this HTML
          // next time it opens (otherwise the solo edits would be lost).
          contentSource: "solo",
          updatedAt: serverTimestamp(),
        });

        await updateDoc(
          doc(db, "users", user.emailAddresses[0].toString(), "rooms", noteId),
          { updatedAt: serverTimestamp() }
        );

        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error) {
        console.error("Error saving document:", error);
        setSaveStatus("idle");
      }
    }, 1000),
    [editor, noteId]
  );

  useEffect(() => {
    return () => {
      saveToFirebase.cancel();
    };
  }, [saveToFirebase]);

  if (isLoading) {
    return <EditorSkeleton />;
  }

  return (
    <div className="relative">
      <div className="flex space-x-2 mb-2 md:max-w-3xl lg:max-w-4xl mx-auto max-md:px-4">
        <TranslateNote doc={yDoc} />
        <ChatToNote doc={yDoc} />
        <ExportButton editor={editor} />
      </div>
      <div className="absolute top-4 right-4 z-10">
        {saveStatus === "saving" && (
          <span className="text-sm text-gray-500">Saving...</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-sm text-green-500">Saved</span>
        )}
      </div>
      <div className="relative w-full flex-grow flex flex-col items-center pb-40 cursor-text" ref={containerRef}>
        <div className="md:max-w-3xl lg:max-w-4xl px-4 md:px-8 w-full flex-grow flex flex-col">
          <BlockNoteView
            editor={editor}
            className="flex-grow py-12 flex flex-col"
            theme={resolvedTheme === "dark" ? "dark" : "light"}
            formattingToolbar={false}
            onChange={() => {
              if (editor.isFocused()) {
                ensureTrailingEmptyParagraph(editor);
              }
              setSaveStatus("saving");
              saveToFirebase(editor.document);
            }}
          >
            <SharedFormattingToolbar editor={editor} />
          </BlockNoteView>
        </div>
      </div>
    </div>
  );
}
