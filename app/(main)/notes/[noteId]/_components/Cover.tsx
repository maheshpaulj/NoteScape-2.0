'use client'

import Image from "next/image"
import { useParams } from "next/navigation"
import { ImageIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useConverImage } from "@/hooks/useCoverImage"
import { useEdgeStore } from "@/lib/edgestore"
import { Skeleton } from "@/components//ui/skeleton"
import { removeCoverFromNote } from "@/actions/actions"
import { useTransition } from "react"
import { toast } from "sonner"
import Avatars from "./Avatars"

interface CoverProps {
  url?:string
  preview?:boolean
  showAvatar?: boolean
}

export function Cover ({url, preview, showAvatar}:CoverProps) {

  const {edgestore} = useEdgeStore();
  const params = useParams();
  const roomId = params.noteId?.toString();
  const coverIamge = useConverImage();
  const [ isPending, startTransition ] = useTransition(); // eslint-disable-line @typescript-eslint/no-unused-vars

  const onRemove = async () => {
    if (url) {
      await edgestore.publicFiles.delete({
        url:url
      })
    }
    try {
        startTransition(async() => {
          const {success} = await removeCoverFromNote(roomId);
          if (success) toast.success("Cover removed!");
        })
    } catch (error) {
        toast.error("failed to remove cover");
        console.error(error);
    }
  }

return (
    <div className={cn(`relative w-full h-[35vh] group`,
    !url && 'h-[12vh]',
    url && 'bg-muted')}>
      {!!url && (
        <Image className="object-cover" src={url} alt='Cover' fill/>
      )}
      {showAvatar && <div className="relative"><Avatars /></div>}
      {url && !preview && (
        <div className="opacity-0 group-hover:opacity-100 absolute bottom-5 right-5 flex gap-x-2 items-center">
          <Button className="text-muted-foreground text-xs" variant='outline' size='sm' onClick={() => coverIamge.onReplace(url)}>
            <ImageIcon className="w-4 h-4 mr-2"/>
            Change Cover
          </Button>
            <Button className="text-muted-foreground text-xs" variant='outline' size='sm' onClick={onRemove}>
            <X className="w-4 h-4 mr-2"/>
            Remove
          </Button>
        </div>
      )}
    </div>
  )
}

Cover.Skeleton = function CoverSkeleton() {
  return (
    <Skeleton className="w-full h-[12vh]"/>
  )
}