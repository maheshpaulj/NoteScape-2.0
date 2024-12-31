'use client'

import React, { useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DocumentData } from "firebase-admin/firestore"
import { db } from "@/firebase"
import { collectionGroup, doc, getDocs, query, updateDoc, where, writeBatch } from "firebase/firestore"
import { useDocumentData } from "react-firebase-hooks/firestore"
import { useUser } from "@clerk/nextjs"
import { ChevronRight } from "lucide-react"

interface RoomDocument extends DocumentData {
  title: string;
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

interface TitleProps {
  initialData: RoomDocument | null;
  id: string;
  isOwner: boolean
}

export function Title({initialData, id, isOwner}: TitleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, loading, error] = useDocumentData(doc(db, "notes", id));
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useUser();
  
  useEffect(() => {
      if(data) {
          setTitle(data.title)
      }
  }, [data])
  
  const enableInput = () => {
      setIsEditing(true)
      setTimeout(() => {
          inputRef.current?.focus()
          inputRef.current?.setSelectionRange(0, inputRef.current.value.length)
      }, 0);
  }
  
  const disableInput = async () => {
    setIsEditing(false);
    
    if (title.trim() && title !== data?.title && user) {
        try {
            // First update the main note document
            await updateDoc(doc(db, "notes", id), {
                title: title,
            });

            // Then update all users who have access to this room
            const roomsRef = query(
                collectionGroup(db, 'rooms'),
                where('roomId', '==', id)
            );

            const snapshot = await getDocs(roomsRef);
            const batch = writeBatch(db);
            
            snapshot.forEach((doc) => {
                batch.update(doc.ref, { title: title });
            });
            await batch.commit();
        } catch (error) {
            console.error("Error updating title:", error);
        }
    }
};
  
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(event.target.value)
  }
  
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
          disableInput()
      }
  }

  return (
    <div className="flex items-center">
      <p className="flex items-center font-semibold text-sm">{isOwner ? "My Documents" : "Shared with me"}<ChevronRight className="text-xl" /></p>
      <div className="flex gap-x-1 items-center">
          {!!initialData?.icon && <p>{initialData?.icon}</p>}
          {isEditing ? (
              <Input 
              className="h-7 px-2 focus-visible:ring-transparent" 
              ref={inputRef}
              onBlur={disableInput} 
              value={title} 
              onChange={onChange} 
                  onKeyDown={onKeyDown}
                  />
                ) : (
              <Button 
                  className="font-normal h-auto p-1" 
                  variant='ghost' 
                  size='sm' 
                  onClick={enableInput}
                  >
                  <span className="truncate">
                      {title}
                  </span>
              </Button>
          )}
      </div>
    </div>
  )
}

Title.Skeleton = function TitleSkeleton() {
  return (
    <Skeleton className="w-20 h-8 rounded-md"/>
)
}