"use client";

import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";

import { useCallback, useEffect, useState } from "react";

import * as Y from "yjs";
import { BlockNoteView } from "@blocknote/shadcn";
import { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import stringToColor from "@/lib/stringToColor";
import { useTheme } from "next-themes";
import TranslateNote from "./TranslateNote";
import ChatToNote from "./ChatToNote";
import { useEdgeStore } from "@/lib/edgestore";

import debounce from 'lodash/debounce';
import { doc as DocFB, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";

type BlockNoteProps = {
  doc: Y.Doc;
  provider: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  roomId: string;
}

function BlockNote({ doc, provider, roomId }: BlockNoteProps) {
  const { resolvedTheme } = useTheme();
  const userInfo = useSelf((me) => me.info);
  const { edgestore } = useEdgeStore();

  const handleUpload = async (file: File) => {
    const response = await edgestore.publicFiles.upload({ file });
    return response.url;
  };

  // Create a debounced function to update Firebase
  const updateFirebase = useCallback( // eslint-disable-line react-hooks/exhaustive-deps 
    debounce(async () => {
      try {
        const docRef = DocFB(db, 'users', userInfo.email, 'rooms', roomId);
        
        await updateDoc(docRef, {
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error updating timestamp:', error);
      }
    }, 5000), // Debounce for 5 seconds
    [userInfo.email, roomId]
  );

  const editor: BlockNoteEditor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: doc.getXmlFragment("note-store"),
      user: {
        name: userInfo.name || userInfo.email,
        color: stringToColor(userInfo.email),
      },
    },
    uploadFile: handleUpload
  });

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      updateFirebase.cancel();
    };
  }, [updateFirebase]);

  return (
    <div className="relative max-w-6xl mx-auto">
      <BlockNoteView 
        editor={editor}
        className="min-h-screen"
        theme={resolvedTheme === "dark" ? "dark" : "light"}
        onChange={updateFirebase}
      />
    </div>
  );
}

export default function Editor({ noteId } : { noteId:string }) {
  
  const room = useRoom();
  const [doc, setDoc] = useState<Y.Doc>();
  const [provider, setProvider] = useState<LiveblocksYjsProvider>();

  useEffect(() => {
    const yDoc = new Y.Doc();
    const yProvider = new LiveblocksYjsProvider(room, yDoc);

    setDoc(yDoc);
    setProvider(yProvider);
  }, [room]);

  if(!doc || !provider){
    return null;
  }

  return (
    <div className="">
      <div className="flex space-x-2">
        <TranslateNote doc={doc} />
        <ChatToNote doc={doc} />
      </div>
      <div className="max-w-6xl mx-auto">
        <BlockNote doc={doc} provider={provider} roomId={noteId}/>
      </div>
    </div>
  )
}