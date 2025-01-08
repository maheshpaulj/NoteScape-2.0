'use client'

import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { MoreHorizontal, Star, Trash } from "lucide-react"

import {DropdownMenu,DropdownMenuTrigger,
  DropdownMenuContent,DropdownMenuItem,
  DropdownMenuSeparator} from '@/components/ui/dropdown-menu'
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { addNoteToQuickAccess, archiveNote, removeNoteFromQuickAccess } from "@/actions/actions"
import { startTransition } from "react"
import ManageUsers from "./ManageUsers"

interface MenuProps {
  noteId:string;
  archived: boolean;
  quickAccess: boolean;
}

export function Menu ({noteId, quickAccess, archived}:MenuProps) {

  const {user} = useUser()

  function handleArchive(id: string) {
    try {
      startTransition(async() => {
        const {success} = await archiveNote(id);
        if(success) toast.success("Note Deleted Successfully");
      })
    } catch (error) {
      toast.error("failed to create a new note");
      console.error(error);
    }
  }

  function handleAddtoQuickAccess(id: string) {
      try {
        startTransition(async() => {
          const {success} = await addNoteToQuickAccess(id, user?.emailAddresses[0].toString()!)
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
          const {success} = await removeNoteFromQuickAccess(id, user?.emailAddresses[0].toString()!)
          if(success) toast.success("Note removed from Quick Access Successfully");
        })
      } catch (error) {
        toast.error("failed to remove note from quick access");
        console.error(error);
      }
    }


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size='sm' variant='ghost'>
          <MoreHorizontal className="w-4 h-4"/>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end" alignOffset={8} forceMount>
        <DropdownMenuItem>
          <ManageUsers />
        </DropdownMenuItem>
        {!quickAccess ? (
          <DropdownMenuItem onClick={() => handleAddtoQuickAccess(noteId)} className="cursor-pointer">
            <Star className="w-4 h-4 mr-2"/>
            Add to Quick Access
          </DropdownMenuItem>) : (
          <DropdownMenuItem onClick={() => handleRemoveFromQuickAccess(noteId)} className="cursor-pointer">
            <Star className="w-4 h-4 mr-2" fill="hsl(var(--foreground))"/>
            Remove from Quick Access
          </DropdownMenuItem>
        )}
        {!archived && <DropdownMenuItem onClick={() => handleArchive(noteId)} className="cursor-pointer">
          <Trash className="w-4 h-4 mr-2"/>
          Delete
        </DropdownMenuItem>}
        <DropdownMenuSeparator/>
        <div className="text-xs text-muted-foreground p-2">
          Last edited by: {user?.fullName}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

Menu.Skeleton = function MenuSkeleton() {
  return (
    <Skeleton className="w-10 h-10"/>
  )
}