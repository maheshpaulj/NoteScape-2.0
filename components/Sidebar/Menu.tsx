'use client'

import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { MoreHorizontal, Trash, User } from "lucide-react"

import {DropdownMenu,DropdownMenuTrigger,
  DropdownMenuContent,DropdownMenuItem,
  DropdownMenuSeparator} from '@/components/ui/dropdown-menu'
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { archiveNote } from "@/actions/actions"
import { startTransition } from "react"
import ManageUsers from "./ManageUsers"

interface MenuProps {
  noteId:string
}

export function Menu ({noteId}:MenuProps) {

  const router = useRouter()
  const {user} = useUser()

  function handleArchive(id: string) {
    try {
      startTransition(async() => {
        const {success} = await archiveNote(id);
        if(success) toast.success("Note Deleted Successfully");
      })
    } catch (error) {
      toast.error("failed to create a new note");
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
        <DropdownMenuItem onClick={() => handleArchive(noteId)} className="cursor-pointer">
          <Trash className="w-4 h-4 mr-2"/>
          Delete
        </DropdownMenuItem>
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