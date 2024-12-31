"use client";

import { useRoom, useSelf } from "@liveblocks/react/suspense";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";

import { useEffect, useState } from "react";

import * as Y from "yjs";
import { BlockNoteView } from "@blocknote/shadcn";
import { BlockNoteEditor } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import stringToColor from "@/lib/stringToColor";
import { useTheme } from "next-themes";

type BlockNoteProps = {
  doc: Y.Doc;
  provider: any;
}
function BlockNote({doc, provider}:BlockNoteProps){
  const {resolvedTheme} = useTheme();
  const userInfo = useSelf((me) => me.info);

  const editor: BlockNoteEditor = useCreateBlockNote({
    collaboration: {
      provider,
      fragment: doc.getXmlFragment("note-store"),
      user: {
        name: userInfo.name || userInfo.email,
        color: stringToColor(userInfo.email),
      },
    }
  });
  return (
    <div className="relative max-w-6xl mx-auto">
      <BlockNoteView 
        editor={editor}
        className="min-h-screen"
        theme={resolvedTheme === "dark" ? "dark" : "light"}
      />
    </div>
  )
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
    <div className="max-w-6xl mx-auto">
      <div className="">

      </div>
      <div className="">
        <BlockNote doc={doc} provider={provider} />
      </div>
    </div>
  )
}