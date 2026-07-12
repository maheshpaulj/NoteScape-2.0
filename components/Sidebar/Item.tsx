'use client'
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, Copy, LucideIcon, MoreHorizontal, Plus, Star, Trash } from "lucide-react"
import { Skeleton } from "../ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { useUser } from "@clerk/nextjs";
import { startTransition, useState } from "react";
import { addNoteToQuickAccess, archiveNote, createNewNote, duplicateNote, removeNoteFromQuickAccess, removeUserFromNote } from "@/actions/actions";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "usehooks-ts";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog"

export const NOTE_DRAG_TYPE = "application/x-notescape-note";

interface ItemProps {
  id?: string;
  documentIcon?:string
  active?:boolean
  expanded?:boolean
  isSearch?:boolean
  level?:number
  onExpand?:() => void
  label?:string
  onClick:() => void
  icon:LucideIcon
  isEditor?: boolean
  quickAccess?: boolean
  /** Called when another note is dropped onto this one (nesting). */
  onMoveNote?: (draggedId: string, targetId: string) => void
}

export function Item ({id,label,onClick,icon:Icon,active,documentIcon,isSearch,level=0,onExpand,expanded, isEditor, quickAccess, onMoveNote}:ItemProps) {
  const ChevronIcon = expanded ? ChevronDown : ChevronRight
  const { user } = useUser();
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const draggable = !isMobile && !!id && !isEditor && !!onMoveNote;

  const handleDragStart = (e: React.DragEvent) => {
    if (!id) return;
    e.dataTransfer.setData(NOTE_DRAG_TYPE, id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!draggable || !e.dataTransfer.types.includes(NOTE_DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    if (!id || !onMoveNote) return;
    const draggedId = e.dataTransfer.getData(NOTE_DRAG_TYPE);
    if (!draggedId || draggedId === id) return;
    e.preventDefault();
    onMoveNote(draggedId, id);
  };

  const handleExpand = (event:React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
    onExpand?.()
  }

  const handleCreateNewNote = () => {
    try {
      startTransition(async() => {
        const {noteId} = await createNewNote(id);
        if (!expanded) {
          onExpand?.()
        }
        router.push(`/notes/${noteId}`);
      })
      toast.success("New note created");
    } catch (error) {
      toast.error("failed to create a new note");
      console.error(error);
    }
  }

  function handleDelete(id: string) {
    try {
      startTransition(async() => {
        const {success} = await removeUserFromNote(id, user?.emailAddresses[0].toString()!); // eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain
        if(success) {
          router.push("/home")
          toast.success("Note Deleted Successfully");
        }
      })
    } catch (error) {
      toast.error("failed to delete note");
      console.error(error);
    }
  }

  function handleDuplicate(id: string) {
    try {
      startTransition(async() => {
        const result = await duplicateNote(id);
        if (result.success && result.noteId) {
          toast.success("Note duplicated");
          router.push(`/notes/${result.noteId}`);
        } else {
          toast.error(result.error || "Failed to duplicate note");
        }
      })
    } catch (error) {
      toast.error("failed to duplicate note");
      console.error(error);
    }
  }

  function handleArchive(id: string) {
    try {
      startTransition(async() => {
        const {success} = await archiveNote(id);
        if(success) toast.success("Note Archived Successfully");
      })
    } catch (error) {
      toast.error("failed to archive note");
      console.error(error);
    }
  }

  function handleAddtoQuickAccess(id: string) {
    try {
      startTransition(async() => {
        const {success} = await addNoteToQuickAccess(id, user?.emailAddresses[0].toString()!) // eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain
        if(success) toast.success("Note added to Quick Access Successfully");
      })
    } catch (error) {
      toast.error("failed to add note to quick access");
      console.error(error);
    }
  }

  function handleRemoveFromQuickAccess(id: string) {
    try {
      startTransition(async() => {
        const {success} = await removeNoteFromQuickAccess(id, user?.emailAddresses[0].toString()!) // eslint-disable-line @typescript-eslint/no-non-null-asserted-optional-chain
        if(success) toast.success("Note removed from Quick Access Successfully");
      })
    } catch (error) {
      toast.error("failed to remove note from quick access");
      console.error(error);
    }
  }

return (
    <div className={cn(`group min-h-[27px] max-md:min-h-[44px] text-sm max-md:text-base py-1 max-md:py-2.5 pr-3 w-full hover:bg-primary/5
    flex items-center text-muted-foreground font-medium md:touch-none`,
    active && 'bg-primary/5 text-primary',
    isDragOver && 'bg-primary/10 outline outline-1 outline-primary/40 rounded-sm')}
     onClick={onClick} role="button" style={{paddingLeft:level ? `${(level * 12) + 12}px` :'12px'}}
     draggable={draggable}
     onDragStart={handleDragStart}
     onDragOver={handleDragOver}
     onDragLeave={() => setIsDragOver(false)}
     onDrop={handleDrop}>
      {!!id && (
        <div className="h-full rounded-sm hover:bg-neutral-300 dark:bg-neutral-600 mr-1" onClick={handleExpand} role="button">
          <ChevronIcon className="w-4 h-4 shrink-0 text-muted-foreground/50"/>
        </div>
      )}
      {documentIcon ? (
        <div className="shrink-0 mr-2 text-[18px]">
          {documentIcon}
        </div>
      ) :
      <Icon className="shrink-0 h-[18px] mr-2 text-muted-foreground"/>
      }
      <span className="truncate">
        {label}
      </span>
      {isSearch && (
        <kbd className="ml-auto pointer-events-none inline-flex gap-1 items-center h-5 select-none rounded border
        bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">alt</span>K
        </kbd>
      )}

      {!!id && (
        <div className="ml-auto flex items-center gap-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <div className="opacity-0 group-hover:opacity-100 h-full ml-auto rounded-sm
              hover:bg-neutral-300 dark:hover:bg-neutral-600" role="button">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground"/>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-60" align="start" side="right" forceMount>
              {!quickAccess ? (
                <DropdownMenuItem onClick={() => handleAddtoQuickAccess(id)} className="cursor-pointer">
                  <Star className="w-4 h-4 mr-2"/>
                  Add to Quick Access
                </DropdownMenuItem>) : (
                <DropdownMenuItem onClick={() => handleRemoveFromQuickAccess(id)} className="cursor-pointer">
                  <Star className="w-4 h-4 mr-2" fill="hsl(var(--foreground))"/>
                  Remove from Quick Access
                </DropdownMenuItem>
              )}
              {!isEditor && (
                <DropdownMenuItem onClick={() => handleDuplicate(id)} className="cursor-pointer">
                  <Copy className="w-4 h-4 mr-2"/>
                  Duplicate
                </DropdownMenuItem>
              )}
              {isEditor ? <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                    <Trash className="w-4 h-4 mr-2"/>
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Once deleted, you will need to be invited again by the owner to regain access to this file.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDelete(id)}
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              :
              <DropdownMenuItem onClick={() => handleArchive(id)} className="cursor-pointer">
                <Trash className="w-4 h-4 mr-2"/>
                Delete
              </DropdownMenuItem>
              }
              <DropdownMenuSeparator/>
              <div className="text-xs text-muted-foreground p-2">
                Last edited by: {user?.fullName}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {!isEditor && <div className="opacity-0 group-hover:opacity-100 h-full ml-auto rounded-sm hover:bg-neutral-300 dark:hover:bg-neutral-600"
          role="button" onClick={handleCreateNewNote}>
            <Plus className="w-4 h-4 text-muted-foreground"/>
          </div>}
        </div>
      )}
    </div>
)
}

Item.Skeleton = function ItemSkeleton({level}:{level?:number}) {
  return (
    <div className="flex gap-x-2 py-[3px]" style={{paddingLeft:level ? `${(level * 12) + 25}px`: '12px'}}>
      <Skeleton className="w-4 h-4"/>
      <Skeleton className="w-4 h-[30%]"/>
    </div>
  )
}