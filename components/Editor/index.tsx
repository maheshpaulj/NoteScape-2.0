"use client";

import { useEffect, useState, useCallback } from "react";
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
import stringToColor from "@/lib/stringToColor";
import TranslateNote from "./TranslateNote";
import ChatToNote from "./ChatToNote";
import { EnhanceTextButton } from "./EnhanceTextButton";

type BlockNoteProps = {
  doc: Y.Doc;
  provider: LiveblocksYjsProvider;
  roomId: string;
  initialContent?: string;
};

function BlockNote({ doc, provider, roomId, initialContent }: BlockNoteProps) {
  const { resolvedTheme } = useTheme();
  const userInfo = useSelf((me) => me.info);
  const { edgestore } = useEdgeStore();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");

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
  });

  // Initialize editor with Firebase content
  useEffect(() => {
    if (initialContent) {
      editor.tryParseHTMLToBlocks(initialContent).then(blocks => {
        editor.replaceBlocks(editor.document, blocks);
      });
    }
  }, [editor, initialContent]);

  const updateFirebase = useCallback( // eslint-disable-line react-hooks/exhaustive-deps
    debounce(async (updatedDoc: Y.Doc) => {
      try {
        setSaveStatus("saving");
        const docRef = DocFB(db, "notes", roomId);
        const yjsUpdate = Y.encodeStateAsUpdate(updatedDoc);
        const content = await editor.blocksToHTMLLossy(editor.document);

        await setDoc(docRef, {
          yjsData: Array.from(yjsUpdate),
          content: content,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        const docRef2 = DocFB(db, "users", userInfo.email, "rooms", roomId);

        await setDoc(docRef2, {
          updatedAt: serverTimestamp(),
        }, { merge: true });

        
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
        console.log("Saving to user rooms:", docRef2, userInfo.email, roomId);
      } catch (error) {
        console.error("Error updating Yjs data:", error);
        setSaveStatus("idle");
      }
    }, 1000),
    [roomId, editor]
  );

  useEffect(() => {
    return () => updateFirebase.cancel();
  }, [updateFirebase]);

  return (
    <div className="relative max-w-6xl mx-auto">
      <div className="absolute top-4 right-4 z-10">
        {saveStatus === "saving" && (
          <span className="text-sm text-gray-500">Saving...</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-sm text-green-500">Saved</span>
        )}
      </div>
      <BlockNoteView
        editor={editor}
        className="min-h-screen"
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        formattingToolbar={false}
        onChange={() => {
          setSaveStatus("saving");
          updateFirebase(doc);
        }}
      >
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              <BlockTypeSelect key={"blockTypeSelect"} />
              <FileCaptionButton key={"fileCaptionButton"} />
              <FileReplaceButton key={"replaceFileButton"} />
              <BasicTextStyleButton
                basicTextStyle={"bold"}
                key={"boldStyleButton"}
              />
              <BasicTextStyleButton
                basicTextStyle={"italic"}
                key={"italicStyleButton"}
              />
              <BasicTextStyleButton
                basicTextStyle={"underline"}
                key={"underlineStyleButton"}
              />
              <BasicTextStyleButton
                basicTextStyle={"strike"}
                key={"strikeStyleButton"}
              />
              <BasicTextStyleButton
                key={"codeStyleButton"}
                basicTextStyle={"code"}
              />
              <TextAlignButton
                textAlignment={"left"}
                key={"textAlignLeftButton"}
              />
              <TextAlignButton
                textAlignment={"center"}
                key={"textAlignCenterButton"}
              />
              <TextAlignButton
                textAlignment={"right"}
                key={"textAlignRightButton"}
              />
              <ColorStyleButton key={"colorStyleButton"} />
              <NestBlockButton key={"nestBlockButton"} />
              <UnnestBlockButton key={"unnestBlockButton"} />
              <CreateLinkButton key={"createLinkButton"} />
              <EnhanceTextButton key={"enhanceTextButton"} editor={editor} />
            </FormattingToolbar>
          )}
        />
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

  useEffect(() => {
    const initializeEditor = async () => {
      try {
        // First get Firebase content
        const docRef = DocFB(db, "notes", noteId);
        const docSnap = await getDoc(docRef);
        const content = docSnap.exists() ? docSnap.data().content : null;
        
        // Initialize Yjs and Liveblocks
        const yDoc = new Y.Doc();
        const yProvider = new LiveblocksYjsProvider(room, yDoc);
        
        setInitialContent(content);
        setDoc(yDoc);
        setProvider(yProvider);
      } catch (error) {
        console.error("Error initializing editor:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeEditor();

    return () => {
      if (provider) provider.destroy();
      if (doc) doc.destroy();
    };
  }, [room, noteId, doc, provider]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!doc || !provider) {
    return <div>Error initializing editor</div>;
  }

  return (
    <div>
      <div className="flex space-x-2 mb-2">
        <TranslateNote doc={doc} />
        <ChatToNote doc={doc} />
      </div>
      <div className="max-w-6xl mx-auto">
        <BlockNote 
          doc={doc} 
          provider={provider} 
          roomId={noteId}
          initialContent={initialContent}
        />
      </div>
    </div>
  );
}