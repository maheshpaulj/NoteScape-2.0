'use client'	

import { useState, useTransition } from "react"
import { useParams } from "next/navigation"

import {Dialog,DialogContent,DialogHeader} from '@/components/ui/dialog'
import { useConverImage } from "@/hooks/useCoverImage"
import { SingleImageDropzone } from "@/components/SingleImageDropzone"
import { useEdgeStore } from "@/lib/edgestore"
import { addCoverToNote } from "@/actions/actions"
import { toast } from "sonner"

export function CoverImageModal () {

  const params = useParams();
  const roomId = params.noteId?.toString();
  const [file,setFile] = useState<File>();
  const [isSubmitting,setIsSubmitting] = useState(false);
  const coverImage = useConverImage();
  const {edgestore} = useEdgeStore();
  const [ isPending, startTransition ] = useTransition(); // eslint-disable-line @typescript-eslint/no-unused-vars

  const onClose = () => {
    setFile(undefined)
    setIsSubmitting(false)
    coverImage.onClose()
  }

  const onChange = async (file?:File) => {
    if (file) {
      setIsSubmitting(true)
      setFile(file)

      const response = await edgestore.publicFiles.upload({
          file,
          options:{
            replaceTargetUrl:coverImage.url
          }
        })
        try {
            startTransition(async() => {
              const {success} = await addCoverToNote(roomId, response.url);
              if (success) toast.success("Cover image added!");
            })
        } catch (error) {
            toast.error("failed to add icon");
            console.error(error);
        }

      onClose()
    }
  }

return (
    <Dialog open={coverImage.isOpen} onOpenChange={coverImage.onClose}>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-center text-lg font-semibold">
            Cover Image
          </h2>
        </DialogHeader>
        <SingleImageDropzone className="w-full outline-none"
        disabled={isSubmitting}
        value={file}
        onChange={onChange}/>
      </DialogContent>
    </Dialog>
)
}