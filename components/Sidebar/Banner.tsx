'use client'

import { useParams, useRouter } from "next/navigation"
import { toast } from 'sonner'

import { Button } from "@/components/ui/button"
import { ConfirmModal } from "@/components/Modals/ConfirmModal"
import { startTransition } from "react"
import { deleteNote, restoreNote } from "@/actions/actions"

interface BannerProps {
  noteId: string;
}

export function Banner ({noteId}:BannerProps) {

  const router = useRouter()
  const params = useParams();

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
        console.error(error);
    }
  }

  function handleRestore(event:React.MouseEvent<HTMLButtonElement,MouseEvent>, noteId: string) {
      event.stopPropagation();
      try {
        startTransition(async() => {
          const {success} = await restoreNote(noteId);
          router.push(`/notes/${noteId}`);
          if (success) toast.success("Note restored!");
        })
      } catch (error) {
        toast.error("failed to restore note");
        console.error(error);
      }
  }

return (
    <div className="w-full bg-rose-500 text-center text-sm p-2 text-white flex gap-x-2 justify-center items-center">
      <p>This note is in the Trash.</p>
      <Button className="border-white bg-transparent hover:bg-primary/5 text-white hover:text-white p-1 px-2
      h-auto font-normal" variant='outline' size='sm' onClick={e => handleRestore(e, noteId)}>
        Restore page
      </Button>
       <ConfirmModal onConfirm={() => handleDelete(noteId)}>
        <Button className="border-white bg-transparent hover:bg-primary/5 text-white hover:text-white p-1 px-2
      h-auto font-normal" variant='outline' size='sm'>
        Delete forever
      </Button>
       </ConfirmModal>
    </div>
)
}