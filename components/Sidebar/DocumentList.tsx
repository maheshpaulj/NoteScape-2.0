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
}

export function DocumentList() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [groupedData, setGroupedData] = useState<{
    owner: RoomDocument[];
    editor: RoomDocument[];
  }>({ owner: [], editor: [] });

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
        return acc;
      },
      { owner: [], editor: [] }
    );

    setGroupedData(grouped);
  }, [data]);

  const isParentArchived = (notes: RoomDocument[], parentId: string | null): boolean => {
    if (!parentId) return false;
    const parent = notes.find(note => note.roomId === parentId);
    return parent ? parent.archived : false;
  };

  const renderDocuments = (
    notes: RoomDocument[],
    parentId: string | null = null,
    depth: number = 0
  ) => {
    const filteredNotes = notes.filter(note => !note.archived);
    
    // Separate notes into those with archived parents and those without
    const notesWithArchivedParent = filteredNotes.filter(
      note => note.parentNoteId && isParentArchived(notes, note.parentNoteId)
    );
    
    const regularNotes = filteredNotes.filter(
      note => {
        // Show notes that either:
        // 1. Have no parent (parentId is null) and match the current parentId parameter
        // 2. Have a non-archived parent and match the current parentId parameter
        return note.parentNoteId === parentId && !isParentArchived(notes, note.parentNoteId);
      }
    );

    // If we're at the top level (parentId is null), include orphaned notes
    const notesToRender = parentId === null 
      ? [...regularNotes, ...notesWithArchivedParent]
      : regularNotes;

    return notesToRender.map((note) => (
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
          isEditor={note.role === "editor" ? true : false}
        />
        {expanded[note.roomId] && renderDocuments(notes, note.roomId, depth + 1)}
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
      {groupedData.owner.length > 0 && renderDocuments(groupedData.owner)}

      {groupedData.editor.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-secondary-foreground mt-4">
            Shared with me
          </h3>
          {renderDocuments(groupedData.editor)}
        </>
      )}
    </>
  );
}