'use client'

import React, { ElementRef, startTransition, useEffect, useRef, useState } from "react"
import { ImageIcon, Smile, X } from "lucide-react"
import TextAreaAutoSize from 'react-textarea-autosize'

import { useConverImage } from "@/hooks/useCoverImage"
import { Button } from "@/components/ui/button"

import { IconPicker } from "./IconPicker"
import { collectionGroup, doc, getDocs, query, updateDoc, where, writeBatch } from "firebase/firestore"
import { db } from "@/firebase"
import { addIconToNote, removeIconFromNote } from "@/actions/actions"
import { toast } from "sonner"

interface ToolbarProps {
  noteId: string;
  title: string;
  icon: string;
  coverUrl: string;
  preview?:boolean;
}

export function Toolbar ({noteId, title, icon, coverUrl, preview}:ToolbarProps) {

  const inputRef = useRef<ElementRef<'textarea'>>(null)
  const [isEditing,setIsEditing] = useState(false)
  const [value,setValue] = useState(title)

  const coverImage = useConverImage();

  const enableInput = () => {
    if (preview) return

    setIsEditing(true)
    setTimeout(() => {
      setValue(title)
      inputRef.current?.focus()
    },0)
  }
  const disableInput = async() => {
    setIsEditing(false);
    if (value.trim() && value !== title) {
        try {
            // First update the main note document
            await updateDoc(doc(db, "notes", noteId), {
                title: value,
            });

            // Then update all users who have access to this room
            const roomsRef = query(
                collectionGroup(db, 'rooms'),
                where('roomId', '==', noteId)
            );

            const snapshot = await getDocs(roomsRef);
            const batch = writeBatch(db);
            
            snapshot.forEach((doc) => {
                batch.update(doc.ref, { title: value });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error updating title:", error);
        }
    }
}

  const onInput = (value:string) => {
    setValue(value);
  }

  const onKeyDown = (event:React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      disableInput()
    }
  }

  const onIconSelect = (icon:string) => {
    try {
        startTransition(async() => {
          const {success} = await addIconToNote(noteId, icon);
          if (success) toast.success("Icon Added!");
        })
    } catch (error) {
        toast.error("failed to add icon");
    }
  }

  const onRemoveIcon = () => {
    try {
        startTransition(async() => {
          const {success} = await removeIconFromNote(noteId);
          if (success) toast.success("Icon removed!");
        })
    } catch (error) {
        toast.error("failed to remove icon");
    }
  }

return (
    <div className="pl-[54px] group relative">
      {!!icon && !preview && (
        <div className="flex gap-x-2 items-center group/icon pt-6">
          <IconPicker onChange={onIconSelect}>
            <p className="text-6xl hover:opacity-75 transition">{icon}</p>
          </IconPicker>
          <Button className="rounded-full opacity-0 group-hover/icon:opacity-100 transition
          text-muted-foreground text-xs" variant='outline' size='icon' onClick={onRemoveIcon}>
            <X className="w-4 h-4"/>
          </Button>
        </div>
      )}
      {!!icon && preview && (
        <p className="text-6xl pt-6">
          {icon}
        </p>
      )}
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-x-1 py-4">
        {!icon && !preview && (
          <IconPicker asChild onChange={onIconSelect}>
            <Button className="text-muted-foreground text-xs" variant='outline' size='sm'>
              <Smile className="w-4 h-4 mr-2"/>
              Add icon
            </Button>
          </IconPicker>
        )}
        {!coverUrl && !preview && (
          <Button className="text-muted-foreground text-xs" variant='outline' size='sm' 
          onClick={coverImage.onOpen}
          >
            <ImageIcon className="w-4 h-4 mr-2"/>
            Add cover
          </Button>
        )}
      </div>
      {isEditing && !preview ? (
        <TextAreaAutoSize className="text-5xl bg-transparent font-bold break-words outline-none text-[#3F3F3F] dark:text-[#CFCFCF]
        resize-none"
         ref={inputRef} onBlur={disableInput} onKeyDown={onKeyDown} value={value}
        onChange={e => onInput(e.target.value)}/>
      ) : (
        <div className="pb-[11.5px] text-5xl font-bold break-words outline-none text-[#3F3F3F] dark:text-[#CFCFCF]" onClick={enableInput}>
          {title}
        </div>
      )}
    </div>
)
}