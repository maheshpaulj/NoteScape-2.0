"use client";
import Editor from "@/components/Editor"
import { useDocumentData } from "react-firebase-hooks/firestore";
import { doc, DocumentData, DocumentReference } from "firebase/firestore";
import { db } from "@/firebase";
import { useUser } from "@clerk/nextjs";
import { Toolbar } from "./_components/Toolbar";
import { Cover } from "./_components/Cover";

interface RoomDocument extends DocumentData {
  title: string;
  createdAt: string;
  updatedAt: string;
  role: "owner" | "editor";
  roomId: string;
  userId: string;
  parentNoteId: string | null;
  archived: boolean;
  icon: string;
  coverImage: string;
}

function page({params: {noteId}}: {params: {noteId: string}}) {
  const { user } = useUser();
  const [data, loading, error] = useDocumentData<RoomDocument>(doc(db, "users", user?.emailAddresses[0].toString()!, "rooms", noteId) as DocumentReference<RoomDocument>);
  return (
    <div className="pb-40 mt-14">
      <Cover url={data?.coverImage} />
      <div className="md:max-w-3xl lg:max-w-4xl mx-auto h-full">
        <Toolbar noteId={noteId} title={data?.title!} icon={data?.icon!} coverUrl={data?.coverImage!} />
        <Editor noteId={noteId} />
      </div>
    </div>
  )
}
export default page