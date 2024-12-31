'use client'
import React, { startTransition, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Search, Trash, Undo } from "lucide-react"
import { toast } from 'sonner'

import { Spinner } from "@/components/Spinner"
import { Input } from "@/components/ui/input"
import { ConfirmModal } from "@/components/Modals/ConfirmModal"
import { useCollection } from "react-firebase-hooks/firestore"
import { useUser } from "@clerk/nextjs"
import { collectionGroup, doc, DocumentData, getDoc, query, where } from "firebase/firestore"
import { db } from "@/firebase"
import { deleteNote, restoreNote } from "@/actions/actions"
	
interface RoomDocument extends DocumentData {
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

export function TrashBox () {

  const router = useRouter();
  const params = useParams();
  const { user } = useUser();

  const [search,setSearch] = useState("");
  const [groupedData, setGroupedData] = useState<{
      owner: RoomDocument[];
      editor: RoomDocument[];
    }>({ owner: [], editor: [] });

  const [data, loading] = useCollection(
    user &&
      query(
        collectionGroup(db, "rooms"),
        where("userId", "==", user.emailAddresses[0].toString())
      )
  );


  useEffect(() => {
    if (!data) return;
    const getNoteTitle = async(id: string): Promise<string> => {
        try {
            // Reference the specific document
            const noteRef = doc(db, "notes", id);
    
            // Fetch the document
            const docSnap = await getDoc(noteRef);
    
            // Check if the document exists
            if (docSnap.exists()) {
                // Extract and return the 'title' field
                const data = docSnap.data();
                return data?.title || "Untitled"
            } else {
                console.error(`No document found for roomId: ${id}`);
                return "no doc";
            }
        } catch (error) {
            console.error("Error fetching title:", error);
            return "error";
        }
      }

    const grouped = data.docs.reduce<{
      owner: RoomDocument[];
      editor: RoomDocument[];
    }>( 
      (acc, doc) => {
        const roomData = doc.data() as RoomDocument;
        const title = getNoteTitle(roomData.roomId);
        if (roomData.role === "owner") {
          acc.owner.push({
            id: doc.id,
            title: title,
            ...roomData,
          });
        } else {
          acc.editor.push({
            id: doc.id,
            title: title,
            ...roomData,
          });
        }
        return acc;
      },
      { owner: [], editor: [] }
    );

    setGroupedData(grouped);
  }, [data]);

//   // Filter logic (only changed this part)
//   const filteredNotes = [
//     ...groupedData.owner,
//     ...groupedData.editor,
//   ].filter(note => {
//     return note.title.value.toString().toLowerCase().includes(search.toLowerCase());
//   });

  const onClick = (noteId:string) => {
    router.push(`/notes/${noteId}`)
  };


  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Spinner size='lg'/>
      </div>
    )
  }

  function handleDelete(noteId: string) {
    try {
        startTransition(async() => {
          const {success} = await deleteNote(noteId);
          if (params.noteId  === noteId) {
            router.push('/home')
          }
          if (success) toast.success("Note deleted permantly!");
        })
    } catch (error) {
        toast.error("failed to delete note");
    }
  }

  function handleRestore(event:React.MouseEvent<HTMLDivElement,MouseEvent>, noteId: string) {
      event.stopPropagation();
      try {
        startTransition(async() => {
          const {success} = await restoreNote(noteId);
          router.push(`/notes/${noteId}`);
          if (success) toast.success("Note restored!");
        })
      } catch (error) {
        toast.error("failed to restore note");
      }
  }

return (
    <div className="text-sm">
      <div className="flex items-center gap-x-1 p-2">
        <Search className="w-4 h-4"/>
        <Input className="h-7 px-2 focus-visible:ring-transparent bg-secondary"
         value={search} onChange={e => setSearch(e.target.value)}
         placeholder="Filter by page title..." disabled/>
      </div>
      <div className="mt-2 px-1 pb-1">
        <p className="hidden last:block text-xs text-center text-muted-foreground pb-2">
          No notes in trash
        </p>
        {groupedData.owner.filter((note) => note.archived === true).map(note => (
          <div className="text-sm rounded-sm w-full hover:bg-primary/5 flex justify-between items-center text-primary"
          key={note.roomId} role="button" onClick={() => onClick(note.roomId)}
          >
            <span className="truncate pl-2">
              {note.title}
            </span>
            <div className="flex items-center">
              <div className="rounded-sm p-2 hover:bg-neutral-200 
              dark:hover:bg-neutral-600" onClick={e => handleRestore(e, note.roomId)}>
                <Undo className="w-4 h-4 text-muted-foreground"/>
              </div>
              <ConfirmModal onConfirm={() => handleDelete(note.roomId)} >
                <div className="rounded-sm p-2 hover:bg-neutral-200
                dark:hover:bg-neutral-600" role="button">
                <Trash className="w-4 h-4 text-muted-foreground"/>
                </div>
              </ConfirmModal>
            </div>
          </div>
        ))}
      </div>
    </div>
)
}
