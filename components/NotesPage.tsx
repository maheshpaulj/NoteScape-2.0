"use client";
import dynamic from "next/dynamic";
import { EditorSkeleton } from "@/components/Editor/shared";
import { useDocumentData } from "react-firebase-hooks/firestore";

// Code-split the Firebase-only editor; collaborative sessions never need it.
const Editor = dynamic(() => import("@/components/Editor2"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
import { doc, DocumentData, DocumentReference, Timestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { useUser } from "@clerk/nextjs";
import { Toolbar } from "@/app/(main)/notes/[noteId]/_components/Toolbar";
import { Cover } from "@/app/(main)/notes/[noteId]/_components/Cover";
import { useEffect } from "react";

interface RoomDocument extends DocumentData {
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  role: "owner" | "editor";
  roomId: string;
  userId: string;
  parentNoteId: string | null;
  archived: boolean;
  icon: string;
  coverImage: string;
  quickAccess: boolean;
}

function NotesPage({noteId}: {noteId: string}) {
  const { user } = useUser();
  const [data] = useDocumentData<RoomDocument>(doc(db, "users", user?.emailAddresses[0].toString()!, "rooms", noteId) as DocumentReference<RoomDocument>); // eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain
  
  useEffect(() => {
    if (data?.title) {
      document.title = "NoteScape - " + data.title;
    }
  }, [data]);

  return (
    <div className="mt-14 min-h-[calc(100vh-3.5rem)] flex flex-col">
      <Cover url={data?.coverImage} showAvatar={false}/>
      <div className="md:max-w-3xl lg:max-w-4xl mx-auto w-full">
        <Toolbar noteId={noteId} title={data?.title!} icon={data?.icon!} coverUrl={data?.coverImage!} /> {/* eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain */}
      </div>
      {/* Full-width so clicks anywhere in the row focus the editor; the
          content column itself is centered via .bn-editor padding. */}
      <div className="flex-grow flex flex-col">
        <Editor noteId={noteId} />
      </div>
    </div>
  )
}
export default NotesPage