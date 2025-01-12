"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Filter } from "lucide-react";
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
import { formatDistanceToNow } from 'date-fns';
import { createNewNote } from "@/actions/actions";
import { toast } from "sonner";

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

export default function NotesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCriterion, setSortCriterion] = useState<"updatedAt" | "title" | "createdAt">("updatedAt");
  const [groupedData, setGroupedData] = useState<{
    owner: RoomDocument[];
    editor: RoomDocument[];
  }>({ owner: [], editor: [] });

  const [ isPending, startTransition ] = useTransition();

  const [data] = useCollection(
    user &&
      query(
        collectionGroup(db, "rooms"),
        where("userId", "==", user.emailAddresses[0].toString())
      )
  );

  useEffect(() => {
    if (!data) return;
  
    const sortNotes = (notes: RoomDocument[]) => {
      return [...notes].sort((a, b) => {
        if (sortCriterion === "title") {
          return a.title.localeCompare(b.title);
        }
        const aDate = sortCriterion === "createdAt" ? a.createdAt?.toDate() : a.updatedAt?.toDate();
        const bDate = sortCriterion === "createdAt" ? b.createdAt?.toDate() : b.updatedAt?.toDate();
        return bDate.getTime() - aDate.getTime(); // Descending order
      });
    };
  
    const filterNotes = (notes: RoomDocument[]) => {
      return notes.filter((note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    };
  
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
  
    setGroupedData({
      owner: sortNotes(filterNotes(grouped.owner)),
      editor: sortNotes(filterNotes(grouped.editor)),
    });
  }, [data, sortCriterion, searchQuery]);
  
  

  const onRedirect = (noteId: string) => {
    router.push(`/notes/${noteId}`);
  };

  const renderDocuments = (notes: RoomDocument[]) => { // Replace with your timestamp
    return notes.map((note) => (
      <div
        key={note.roomId}
        className={`group flex items-center gap-2 w-full p-2 pl-3 rounded-lg cursor-pointer
          hover:bg-accent transition-colors duration-200`}
        onClick={() => onRedirect(note.roomId)}
      >
        <div className="flex items-center justify-between flex-1 gap-2 truncate">
          <p className="flex flex-row space-x-2 items-center truncate">
            {note.icon || "📄"}
            <span className="truncate">{note.title}</span>
            {note.archived && <span className="text-xs text-center h-5 bg-red-300 px-1 rounded-md border-2 border-red-700 text-red-700 border-dashed">trash</span>}
          </p>
          <p className="text-xs text-muted-foreground text-nowrap">
            {formatDistanceToNow(note.updatedAt.toDate(), { addSuffix: true })}
          </p>
        </div>
      </div>
    ));
  };

  const handleCreateNewNote = () => {
    try {
      startTransition(async() => {
        const {noteId} = await createNewNote();
        router.push(`/notes/${noteId}`);
      })
      toast.success("New note created");
    } catch (error) {
      toast.error("failed to create a new note");
      console.error(error);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 border-none shadow-none">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between pl-10">
            <CardTitle className="text-xl font-medium">All Notes</CardTitle>
            <Button onClick={handleCreateNewNote} className="gap-2" disabled={isPending}>
              <Plus size={16} />
              {isPending ? "Creating New Note" : "New Note" }
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
            {groupedData.owner.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold">My Notes</h2>
                <div className="space-y-1">{renderDocuments(groupedData.owner)}</div>
              </div>
            )}
            {groupedData.editor.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold">Shared with Me</h2>
                <div className="space-y-1">
                  {renderDocuments(groupedData.editor)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
