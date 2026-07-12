"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import { Search, Plus, Filter, FileIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createNewNote, moveNote } from "@/actions/actions";
import { toast } from "sonner";
import { useRooms } from "@/hooks/useRooms";
import { RoomDocument } from "@/types/types";
import { Item } from "@/components/Sidebar/Item";
import { cn } from "@/lib/utils";

interface NoteWithChildren extends RoomDocument {
  children?: NoteWithChildren[];
}

export default function NotesPage() {
  const router = useRouter();
  const params = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCriterion, setSortCriterion] = useState<"updatedAt" | "title" | "createdAt">("updatedAt");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isRootDragOver, setIsRootDragOver] = useState(false);
  const [groupedData, setGroupedData] = useState<{
    owner: NoteWithChildren[];
    editor: NoteWithChildren[];
  }>({ owner: [], editor: [] });

  const [isPending, startTransition] = useTransition();
  const { rooms } = useRooms();

  useEffect(() => {
    const buildHierarchy = (notes: RoomDocument[]) => {
      const notesMap = new Map<string, NoteWithChildren>();
      const rootNotes: NoteWithChildren[] = [];

      // First pass: Create all note objects
      notes.forEach(note => {
        if (note.archived) return;
        notesMap.set(note.roomId, { ...note, children: [] });
      });

      // Second pass: Build the hierarchy
      notesMap.forEach(note => {
        if (note.parentNoteId && notesMap.has(note.parentNoteId)) {
          const parent = notesMap.get(note.parentNoteId);
          parent?.children?.push(note);
        } else {
          rootNotes.push(note);
        }
      });

      return rootNotes;
    };

    const sortNotes = (notes: NoteWithChildren[]): NoteWithChildren[] => {
      return [...notes].sort((a, b) => {
        if (sortCriterion === "title") {
          return (a.title || "").localeCompare(b.title || "");
        }
        const aDate = sortCriterion === "createdAt" ? a.createdAt?.toDate() : a.updatedAt?.toDate();
        const bDate = sortCriterion === "createdAt" ? b.createdAt?.toDate() : b.updatedAt?.toDate();
        return (bDate?.getTime() || 0) - (aDate?.getTime() || 0); // Descending order
      }).map(note => ({
        ...note,
        children: note.children ? sortNotes(note.children) : []
      }));
    };

    const filterNotes = (notes: NoteWithChildren[]): NoteWithChildren[] => {
      return notes.filter(note => {
        const matchesSearch = (note.title || "").toLowerCase().includes(searchQuery.toLowerCase());
        const hasMatchingChildren = note.children && filterNotes(note.children).length > 0;
        return matchesSearch || hasMatchingChildren;
      }).map(note => ({
        ...note,
        children: note.children ? filterNotes(note.children) : []
      }));
    };

    const hierarchy = buildHierarchy(rooms);
    const sorted = sortNotes(hierarchy);
    const filtered = filterNotes(sorted);

    // Group the root notes by owner vs editor
    const grouped = filtered.reduce<{
      owner: NoteWithChildren[];
      editor: NoteWithChildren[];
    }>(
      (acc, note) => {
        if (note.role === "owner") {
          acc.owner.push(note);
        } else {
          acc.editor.push(note);
        }
        return acc;
      },
      { owner: [], editor: [] }
    );

    setGroupedData(grouped);
  }, [rooms, sortCriterion, searchQuery]);

  const handleMoveNote = async (draggedId: string, newParentId: string | null) => {
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
      const NOTE_DRAG_TYPE = "application/x-notescape-note";
      if (!e.dataTransfer.types.includes(NOTE_DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsRootDragOver(true);
    },
    onDragLeave: () => setIsRootDragOver(false),
    onDrop: (e: React.DragEvent) => {
      setIsRootDragOver(false);
      const NOTE_DRAG_TYPE = "application/x-notescape-note";
      const draggedId = e.dataTransfer.getData(NOTE_DRAG_TYPE);
      if (!draggedId) return;
      e.preventDefault();
      handleMoveNote(draggedId, null);
    },
  };

  const onExpand = (noteId: string) => {
    setExpanded((prevExpanded) => ({
      ...prevExpanded,
      [noteId]: !prevExpanded[noteId],
    }));
  };

  const onRedirect = (noteId: string) => {
    router.push(`/notes/${noteId}`);
  };

  const renderNotesHierarchy = (notes: NoteWithChildren[], depth = 0) => {
    return notes.map((note) => (
      <div key={note.roomId} className="w-full">
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
          level={depth}
        />
        {expanded[note.roomId] && note.children && note.children.length > 0 && (
          <div className="space-y-1">
            {renderNotesHierarchy(note.children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  const handleCreateNewNote = () => {
    try {
      startTransition(async () => {
        const { noteId } = await createNewNote();
        router.push(`/notes/${noteId}`);
      });
      toast.success("New note created");
    } catch (error) {
      toast.error("Failed to create a new note");
      console.error(error);
    }
  };

  return (
    <div className="h-full flex flex-col pt-14">
      <Card className="flex-1 border-none shadow-none bg-transparent">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between mt-4">
            <CardTitle className="text-xl font-medium">All Notes</CardTitle>
            <Button onClick={handleCreateNewNote} className="gap-2" disabled={isPending}>
              <Plus size={16} />
              {isPending ? "Creating New Note" : "New Note"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <Input
                placeholder="Search notes..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => setSortCriterion("updatedAt")}>
                  Last Updated
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setSortCriterion("title")}>
                  Title
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => setSortCriterion("createdAt")}>
                  Created Date
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groupedData.owner.length > 0 && (
              <div>
                <h2
                  className={cn(
                    "text-lg font-semibold px-1 rounded-sm -mx-1",
                    isRootDragOver && "bg-primary/10 outline outline-1 outline-primary/40"
                  )}
                  title="Drop a note here to move it to the top level"
                  {...rootDropProps}
                >
                  My Notes
                </h2>
                <div className="space-y-1 mt-2">{renderNotesHierarchy(groupedData.owner)}</div>
              </div>
            )}
            {groupedData.editor.length > 0 && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold">Shared with Me</h2>
                <div className="space-y-1 mt-2">
                  {renderNotesHierarchy(groupedData.editor)}
                </div>
              </div>
            )}
            {groupedData.owner.length === 0 && groupedData.editor.length === 0 && (
              <p className="text-center text-muted-foreground py-10">
                No notes found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
