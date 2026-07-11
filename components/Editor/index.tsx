"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as Y from "yjs";
import { useTheme } from "next-themes";
import debounce from "lodash/debounce";
import { doc as DocFB, serverTimestamp, getDoc, setDoc } from "firebase/firestore";

import { db } from "@/firebase";
import { useEdgeStore } from "@/lib/edgestore";
import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";
import { BlockNoteView } from "@blocknote/shadcn";
import { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import stringToColor from "@/lib/stringToColor";
import TranslateNote from "./TranslateNote";
import ChatToNote from "./ChatToNote";
import { ExportButton } from "./ExportButton";
import {
  EditorSkeleton,
  SharedFormattingToolbar,
  seedEditorFromHTML,
  sharedEditorDomAttributes,
  useFullWidthCaret,
} from "./shared";

type BlockNoteProps = {
  doc: Y.Doc;
  provider: LiveblocksYjsProvider;
  roomId: string;
  initialContent?: string;
  /** "solo" when the HTML snapshot was last written by the Firebase-only
   * editor (Editor2) — those edits never reached Yjs and must be re-seeded. */
  contentSource?: string;
};

function BlockNote({ doc, provider, roomId, initialContent, contentSource }: BlockNoteProps) {
  const { resolvedTheme } = useTheme();
  const userInfo = useSelf((me) => me.info);
  const { edgestore } = useEdgeStore();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleUpload = async (file: File) => {
    const response = await edgestore.publicFiles.upload({ file });
    return response.url;
  };

  const editor: BlockNoteEditor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: doc.getXmlFragment("note-store"),
      user: {
        name: userInfo.name || userInfo.email,
        color: stringToColor(userInfo.email),
      },
    },
    uploadFile: handleUpload,
    domAttributes: sharedEditorDomAttributes,
  });

  useFullWidthCaret(editor, containerRef);

  // Seed the editor with the stored HTML snapshot when either:
  //  (a) the Yjs fragment is empty (brand-new room that has never synced), or
  //  (b) the snapshot was last written by the solo editor (contentSource ===
  //      "solo") — those edits never reached Yjs, so the snapshot is newer
  //      than the Yjs doc and must replace it or the solo edits are lost.
  // Seeding only runs after the provider reports "synced"; checking the
  // fragment before sync completes would mistake a non-empty room for empty.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!initialContent) return;

    const seedIfNeeded = () => {
      if (seededRef.current) return;
      seededRef.current = true;
      const fragment = doc.getXmlFragment("note-store");
      const snapshotIsNewer = contentSource === "solo";
      if (fragment.length > 0 && !snapshotIsNewer) return; // Yjs is authoritative.
      seedEditorFromHTML(editor, initialContent);
      // Flip the flag immediately so other clients joining now don't re-seed.
      setDoc(
        DocFB(db, "notes", roomId),
        { contentSource: "collab" },
        { merge: true }
      ).catch(() => {});
    };

    if (provider.synced) {
      seedIfNeeded();
      return;
    }
    const onSync = (synced: boolean) => {
      if (synced) seedIfNeeded();
    };
    provider.on("synced", onSync);
    return () => provider.off("synced", onSync);
  }, [editor, initialContent, doc, provider, roomId, contentSource]);

  const updateFirebase = useCallback( // eslint-disable-line react-hooks/exhaustive-deps
    debounce(async () => {
      try {
        setSaveStatus("saving");
        // Persist an HTML snapshot for search/preview only. Yjs (via Liveblocks)
        // remains the source of truth for collaborative content — we no longer
        // write the unbounded yjsData byte array into Firestore.
        const content = await editor.blocksToHTMLLossy(editor.document);
        await setDoc(
          DocFB(db, "notes", roomId),
          { content, contentSource: "collab", updatedAt: serverTimestamp() },
          { merge: true }
        );

        await setDoc(
          DocFB(db, "users", userInfo.email, "rooms", roomId),
          { updatedAt: serverTimestamp() },
          { merge: true }
        );

        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error) {
        console.error("Error saving collaborative note:", error);
        setSaveStatus("idle");
      }
    }, 2500),
    [roomId, editor]
  );

  useEffect(() => {
    return () => updateFirebase.cancel();
  }, [updateFirebase]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {saveStatus === "saving" && (
          <span className="text-sm text-gray-500">Saving...</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-sm text-green-500">Saved</span>
        )}
        <ExportButton editor={editor} />
      </div>
      <BlockNoteView
        editor={editor}
        className="min-h-screen py-12"
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        formattingToolbar={false}
        onChange={() => {
          setSaveStatus("saving");
          updateFirebase();
        }}
      >
        <SharedFormattingToolbar editor={editor} />
      </BlockNoteView>
    </div>
  );
}

export default function Editor({ noteId }: { noteId: string }) {
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<LiveblocksYjsProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialContent, setInitialContent] = useState<string>();
  const [contentSource, setContentSource] = useState<string>();
  // Refs let the cleanup destroy the latest instances without forcing the
  // init effect to re-run (which previously caused a destroy/recreate loop).
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<LiveblocksYjsProvider | null>(null);

  useEffect(() => {
    let cancelled = false;

    const initializeEditor = async () => {
      try {
        // Fetch the stored HTML snapshot (used to seed an empty room, or to
        // recover solo edits made in the Firebase-only editor).
        const snap = await getDoc(DocFB(db, "notes", noteId));
        const content = snap.exists() ? snap.data().content : undefined;
        const source = snap.exists() ? snap.data().contentSource : undefined;

        const yDoc = new Y.Doc();
        const yProvider = new LiveblocksYjsProvider(room, yDoc);
        docRef.current = yDoc;
        providerRef.current = yProvider;

        if (cancelled) {
          yProvider.destroy();
          yDoc.destroy();
          return;
        }

        setInitialContent(content);
        setContentSource(source);
        setDoc(yDoc);
        setProvider(yProvider);
      } catch (error) {
        console.error("Error initializing editor:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    initializeEditor();

    return () => {
      cancelled = true;
      providerRef.current?.destroy();
      docRef.current?.destroy();
      providerRef.current = null;
      docRef.current = null;
    };
    // Re-initialize only when the room or note actually changes.
  }, [room, noteId]);

  if (isLoading) {
    return <EditorSkeleton />;
  }

  if (!doc || !provider) {
    return <EditorSkeleton />;
  }

  return (
    <div>
      <div className="flex space-x-2 mb-2 md:max-w-3xl lg:max-w-4xl mx-auto max-md:px-4">
        <TranslateNote doc={doc} />
        <ChatToNote doc={doc} />
      </div>
      <div className="w-full">
        <BlockNote
          doc={doc}
          provider={provider}
          roomId={noteId}
          initialContent={initialContent}
          contentSource={contentSource}
        />
      </div>
    </div>
  );
}
