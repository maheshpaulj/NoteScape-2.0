'use client';
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Item, NOTE_DRAG_TYPE } from "./Item";
import { FileIcon } from "lucide-react";
import { useRooms } from "@/hooks/useRooms";
import { RoomDocument } from "@/types/types";
import { moveNote } from "@/actions/actions";
import { cn } from "@/lib/utils";

export function DocumentList() {
  const params = useParams();
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isRootDragOver, setIsRootDragOver] = useState(false);
  const { rooms, loading } = useRooms();

  // Drop one note onto another to nest it; drop on the "My Notes" header to
  // move it back to the top level. The rooms store live-updates the tree.
  const handleMoveNote = async (draggedId: string, newParentId: string | null) => {
    // Client-side guard: don't nest a note inside its own subtree.
    if (newParentId) {
      const childrenOf = (id: string): string[] =>
        rooms.filter((r) => r.parentNoteId === id).flatMap((r) => [r.roomId, ...childrenOf(r.roomId)]);
      if (draggedId === newParentId || childrenOf(draggedId).includes(newParentId)) {
        toast.error("Cannot move a note into its own sub-note");
        return;
      }
    }
    const result = await moveNote(draggedId, newParentId);
    if (result.success) {
      toast.success("Note moved");
    } else {
      toast.error(result.error || "Failed to move note");
    }
  };

  const rootDropProps = {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(NOTE_DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsRootDragOver(true);
    },
    onDragLeave: () => setIsRootDragOver(false),
    onDrop: (e: React.DragEvent) => {
      setIsRootDragOver(false);
      const draggedId = e.dataTransfer.getData(NOTE_DRAG_TYPE);
      if (!draggedId) return;
      e.preventDefault();
      handleMoveNote(draggedId, null);
    },
  };

  const onExpand = (documentId: string) => {
    setExpanded((prevExpanded) => ({
      ...prevExpanded,
      [documentId]: !prevExpanded[documentId],
    }));
  };

  const onRedirect = (documentId: string) => {
    router.push(`/notes/${documentId}`);
  };

  const groupedData = useMemo(() => {
    return rooms.reduce<{
      owner: RoomDocument[];
      editor: RoomDocument[];
      quickAccess: RoomDocument[];
    }>(
      (acc, roomData) => {
        if (roomData.role === "owner") {
          acc.owner.push(roomData);
        } else {
          acc.editor.push(roomData);
        }
        if (roomData.quickAccess) {
          acc.quickAccess.push(roomData);
        }
        return acc;
      },
      { owner: [], editor: [], quickAccess: [] }
    );
  }, [rooms]);

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
          onMoveNote={(draggedId, targetId) => handleMoveNote(draggedId, targetId)}
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
      .sort((a, b) => b.updatedAt?.seconds - a.updatedAt?.seconds)
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
          onMoveNote={(draggedId, targetId) => handleMoveNote(draggedId, targetId)}
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
          <h3
            className={cn(
              "text-sm font-semibold text-secondary-foreground mt-4 max-md:text-2xl rounded-sm px-1 -mx-1",
              isRootDragOver && "bg-primary/10 outline outline-1 outline-primary/40"
            )}
            title="Drop a note here to move it to the top level"
            {...rootDropProps}
          >
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