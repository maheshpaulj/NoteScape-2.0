'use client';
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

import { Item } from "./Item";
import { FileIcon } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { collectionGroup, DocumentData, query, Timestamp, where } from "firebase/firestore";
import { useCollection } from "react-firebase-hooks/firestore";
import { db } from "@/firebase";

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

export function DocumentList() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [groupedData, setGroupedData] = useState<{
    owner: RoomDocument[];
    editor: RoomDocument[];
    quickAccess: RoomDocument[];
  }>({ owner: [], editor: [], quickAccess: [] });

  const onExpand = (documentId: string) => {
    setExpanded((prevExpanded) => ({
      ...prevExpanded,
      [documentId]: !prevExpanded[documentId],
    }));
  };

  const onRedirect = (documentId: string) => {
    router.push(`/notes/${documentId}`);
  };

  const [data, loading] = useCollection(
    user &&
      query(
        collectionGroup(db, "rooms"),
        where("userId", "==", user.emailAddresses[0].toString())
      )
  );

  useEffect(() => {
    if (!data) return;

    const grouped = data.docs.reduce<{
      owner: RoomDocument[];
      editor: RoomDocument[];
      quickAccess: RoomDocument[];
    }>(
      (acc, doc) => {
        const roomData = doc.data() as RoomDocument;
        if (roomData.role === "owner") {
          acc.owner.push({
            id: doc.id,
            ...roomData,
          });
        } else {
          acc.editor.push({
            id: doc.id,
            ...roomData,
          });
        }
        if (roomData.quickAccess) {
          acc.quickAccess.push({
            id: doc.id,
            ...roomData,
          })
        }
        return acc;
      },
      { owner: [], editor: [], quickAccess: [] }
    );

    setGroupedData(grouped);
  }, [data]);

  // const isParentArchived = (notes: RoomDocument[], parentId: string | null): boolean => {
  //   if (!parentId) return false;
  //   const parent = notes.find(note => note.roomId === parentId);
  //   return parent ? parent.archived : false;
  // };

  const renderAllNotes = (
    notes: RoomDocument[],
    parentId: string | null = null,
    depth: number = 0
  ) => {
    const filteredNotes = notes
      .filter(note => !note.archived && note.parentNoteId === parentId);
  
    return filteredNotes.map((note) => (
      <div key={note.roomId} style={{ paddingLeft: depth ? `30px` : undefined }}>
        <Item
          id={note.roomId}
          onClick={() => onRedirect(note.roomId)}
          label={note.title}
          icon={FileIcon}
          documentIcon={note.icon}
          active={params.noteId === note.roomId}
          onExpand={() => onExpand(note.roomId)}
          expanded={expanded[note.roomId]}
          isEditor={note.role === "editor"}
          quickAccess={note.quickAccess}
        />
        {expanded[note.roomId] && renderAllNotes(notes, note.roomId, depth + 1)}
      </div>
    ));
  };
  
  const renderLimitedNotes = (
    notes: RoomDocument[],
    parentId: string | null = null,
    depth: number = 0
  ) => {
    const filteredNotes = notes
      .filter(note => !note.archived && note.parentNoteId === parentId)
      .sort((a, b) => b.updatedAt?.nanoseconds - a.updatedAt?.nanoseconds)
      .slice(0, 7);
  
    return filteredNotes.map((note) => (
      <div key={note.roomId} style={{ paddingLeft: depth ? `30px` : undefined }}>
        <Item
          id={note.roomId}
          onClick={() => onRedirect(note.roomId)}
          label={note.title}
          icon={FileIcon}
          documentIcon={note.icon}
          active={params.noteId === note.roomId}
          onExpand={() => onExpand(note.roomId)}
          expanded={expanded[note.roomId]}
          isEditor={note.role === "editor"}
          quickAccess={note.quickAccess}
        />
        {expanded[note.roomId] && renderLimitedNotes(notes, note.roomId, depth + 1)}
      </div>
    ));
  };

  if (loading) {
    return (
      <>
        <Item.Skeleton />
        <Item.Skeleton />
        <Item.Skeleton />
      </>
    );
  }

  if (!groupedData.owner.length && !groupedData.editor.length) {
    return (
      <p className="text-sm font-medium text-muted-foreground/80">
        No notes available
      </p>
    );
  }

  return (
    <>
      {groupedData.quickAccess.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-secondary-foreground mt-4 max-md:text-2xl">
            Quick Access
          </h3>
          {renderAllNotes(groupedData.quickAccess)}
        </>
      )}

      {groupedData.owner.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-secondary-foreground mt-4 max-md:text-2xl">
            My Notes
          </h3>
          {renderLimitedNotes(groupedData.owner)}
        </>
      )}

      {groupedData.editor.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-secondary-foreground mt-4 max-md:text-2xl">
            Shared with me
          </h3>
          {renderLimitedNotes(groupedData.editor)}
        </>
      )}
    </>
  );
}