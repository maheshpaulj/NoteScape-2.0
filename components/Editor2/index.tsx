"use client";

import * as Y from "yjs";
import { useEffect, useState, useCallback } from "react";
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

type SaveStatus = "saved" | "saving" | "idle";

export default function Editor({ noteId }: { noteId: string }) {
  const { resolvedTheme } = useTheme();
  const { edgestore } = useEdgeStore();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const editor = useCreateBlockNote({
    uploadFile: async (file: File) => {
      const response = await edgestore.publicFiles.upload({ file });
      return response.url;
    },
  });

  const [yDoc, setYDoc] = useState<Y.Doc>(() => {
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
          const blocks = await editor.tryParseHTMLToBlocks(content);
          editor.replaceBlocks(editor.document, blocks);

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
  const saveToFirebase = useCallback(
    debounce(async (blocks: Block[]) => {
      try {
        setSaveStatus("saving");
        const content = await editor.blocksToHTMLLossy(blocks);
        const docRef = doc(db, "notes", noteId);
        await updateDoc(docRef, {
          content,
          updatedAt: serverTimestamp(),
        });
        setSaveStatus("saved");
        // Reset to idle after 2 seconds
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
    return <div>Loading...</div>;
  }

  return (
    <div className="relative">
      <div className="flex space-x-2 bg-red-400">
        <TranslateNote doc={yDoc} />
        <ChatToNote doc={yDoc} />
      </div>
      <div className="absolute top-4 right-4 z-10">
        {saveStatus === "saving" && (
          <span className="text-sm text-gray-500">Saving...</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-sm text-green-500">Saved</span>
        )}
      </div>
      <div className="relative max-w-6xl mx-auto">
        <BlockNoteView
          editor={editor}
          className="min-h-screen"
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          onChange={() => {
            const newBlocks = editor.document;
            setBlocks(newBlocks);
            setSaveStatus("saving");
            saveToFirebase(newBlocks);
          }}
        />
      </div>
    </div>
  );
}