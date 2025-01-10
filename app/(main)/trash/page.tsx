"use client";

import React, { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Undo, Trash, ChevronRight, ChevronDown } from "lucide-react";
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
import { useCollection } from "react-firebase-hooks/firestore";
import { db } from "@/firebase";
import { query, collectionGroup, where, DocumentData, Timestamp } from "firebase/firestore";
import { useUser } from "@clerk/nextjs";
import { deleteNote, restoreNote } from "@/actions/actions";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/Modals/ConfirmModal";

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

interface NoteWithChildren extends RoomDocument {
  children?: NoteWithChildren[];
}

export default function TrashPage() {
  const router = useRouter();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCriterion, setSortCriterion] = useState<"updatedAt" | "title" | "createdAt">("updatedAt");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [notesWithHierarchy, setNotesWithHierarchy] = useState<NoteWithChildren[]>([]);

  const [data] = useCollection(
    user &&
      query(
        collectionGroup(db, "rooms"),
        where("userId", "==", user.emailAddresses[0].toString())
      )
  );

  useEffect(() => {
    if (!data) return;

    const buildHierarchy = (notes: RoomDocument[]) => {
      const notesMap = new Map<string, NoteWithChildren>();
      const rootNotes: NoteWithChildren[] = [];

      // First pass: Create all note objects
      notes.forEach(note => {
        if (!note.archived) return;
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
      return notes.sort((a, b) => {
        if (sortCriterion === "title") {
          return a.title.localeCompare(b.title);
        }
        const aDate = sortCriterion === "createdAt" ? a.createdAt.toDate() : a.updatedAt.toDate();
        const bDate = sortCriterion === "createdAt" ? b.createdAt.toDate() : b.updatedAt.toDate();
        return bDate.getTime() - aDate.getTime();
      }).map(note => ({
        ...note,
        children: note.children ? sortNotes(note.children) : []
      }));
    };

    const filterNotes = (notes: NoteWithChildren[]): NoteWithChildren[] => {
      return notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
        const hasMatchingChildren = note.children && filterNotes(note.children).length > 0;
        return matchesSearch || hasMatchingChildren;
      }).map(note => ({
        ...note,
        children: note.children ? filterNotes(note.children) : []
      }));
    };

    const grouped = data.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as unknown as RoomDocument));

    const hierarchy = buildHierarchy(grouped);
    const sorted = sortNotes(hierarchy);
    const filtered = filterNotes(sorted);
    setNotesWithHierarchy(filtered);
  }, [data, sortCriterion, searchQuery]);

  const handleDelete = async (noteId: string) => {
    try {
      startTransition(async () => {
        const { success } = await deleteNote(noteId);
        if (success) toast.success("Note deleted permanently!");
      });
    } catch (error) {
      toast.error("Failed to delete note");
      console.error(error);
    }
  };

  const handleRestore = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, noteId: string) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      startTransition(async () => {
        const { success } = await restoreNote(noteId);
        if (success) {
          toast.success("Note restored!");
          router.push(`/notes/${noteId}`);
        }
      });
    } catch (error) {
      toast.error("Failed to restore note");
      console.error(error);
    }
  };

  const toggleExpand = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (expandedNotes.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const renderNote = (note: NoteWithChildren, depth = 0) => {
    const hasChildren = note.children && note.children.length > 0;
    const isExpanded = expandedNotes.has(note.roomId);

    return (
      <div key={note.roomId} className="w-full">
        <div 
          className="group flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent transition-colors duration-200"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
            <div
              className="h-full rounded-sm hover:bg-neutral-300 dark:bg-neutral-600 mr-1"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(note.roomId);
              }}
            >
                {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/50" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
            </div>
          <div 
            className="flex items-center justify-between flex-1 gap-2 cursor-pointer"
            onClick={() => router.push(`/notes/${note.roomId}`)}
          >
            <p className="flex items-center gap-2 truncate">
              <span>{note.icon || "📄"}</span>
              <span className="truncate">{note.title}</span>
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {!note.parentNoteId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => handleRestore(e, note.roomId)}
                  >
                    <Undo className="h-4 w-4" />
                    Restore note
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRestore(e, note.roomId);
                    }}
                  >
                    <Undo className="h-4 w-4" />
                    Restore as new note
                  </Button>
                )}
                <ConfirmModal onConfirm={() => handleDelete(note.roomId)}>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </ConfirmModal>
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {note.children?.map((child) => renderNote(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 border-none shadow-none">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between pl-10">
            <CardTitle className="text-xl font-medium">Trash</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <Input
                placeholder="Search trash..."
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
                <DropdownMenuItem onClick={() => setSortCriterion("updatedAt")}>
                  Last Updated
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortCriterion("title")}>
                  Title
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortCriterion("createdAt")}>
                  Created Date
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notesWithHierarchy.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">
                No notes in trash
              </p>
            ) : (
              <div className="space-y-1">
                {notesWithHierarchy.map((note) => renderNote(note))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}