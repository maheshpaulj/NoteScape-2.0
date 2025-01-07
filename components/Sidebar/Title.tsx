'use client'

import React, { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DocumentData } from "firebase-admin/firestore"
import { db } from "@/firebase"
import { collectionGroup, doc, getDocs, query, updateDoc, where, writeBatch, getDoc, Timestamp } from "firebase/firestore"
import { useDocumentData } from "react-firebase-hooks/firestore"
import { useUser } from "@clerk/nextjs"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

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
}

interface Breadcrumb {
  id: string;
  title: string;
  icon?: string;
}

interface TitleProps {
  initialData: RoomDocument | null;
  id: string;
  isOwner: boolean;
}

export function Title({initialData, id, isOwner}: TitleProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [data] = useDocumentData(doc(db, "notes", id));
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const { user } = useUser();
  const router = useRouter();
  
  useEffect(() => {
    const fetchBreadcrumbs = async () => {
      const breadcrumbArray: Breadcrumb[] = [];
      let currentId = id;
      
      while (currentId) {
        const docRef = doc(db, "notes", currentId);
        const docSnap = await getDoc(docRef);
        const noteData = docSnap.data();
        
        if (noteData) {
          breadcrumbArray.unshift({
            id: currentId,
            title: noteData.title,
            icon: noteData.icon
          });
          currentId = noteData.parentNoteId;
        } else {
          break;
        }
      }
      
      setBreadcrumbs(breadcrumbArray);
    };

    fetchBreadcrumbs();
  }, [id]);

  useEffect(() => {
    if (data) {
      setTitle(data.title);
    }
  }, [data]);
  
  const enableInput = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(0, inputRef.current.value.length);
    }, 0);
  };
  
  const disableInput = async () => {
    setIsEditing(false);
    
    if (title.trim() && title !== data?.title && user) {
      try {
        await updateDoc(doc(db, "notes", id), {
          title: title,
        });

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
        
        // Update breadcrumbs after title change
        setBreadcrumbs(prev => 
          prev.map(crumb => 
            crumb.id === id ? { ...crumb, title } : crumb
          )
        );
      } catch (error) {
        console.error("Error updating title:", error);
      }
    }
  };
  
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };
  
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      disableInput();
    }
  };

  return (
    <div className="flex items-center">
      <p className="flex items-center font-semibold text-sm">
        {isOwner ? "My Documents" : "Shared with me"}
        <ChevronRight className="text-xl" />
      </p>
      <div className="flex items-center">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.id}>
            <div className="flex gap-x-1 items-center">
              {(crumb.id === id && initialData?.icon) || crumb.icon && (
                <p>{crumb.id === id ? initialData?.icon : crumb.icon}</p>
              )}
              {crumb.id === id && isEditing ? (
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
                  variant="ghost"
                  size="sm"
                  onClick={crumb.id === id ? enableInput : () => router.push(`/notes/${crumb.id}`)}
                >
                  <span className="truncate">{crumb.id === id ? title : crumb.title}</span>
                </Button>
              )}
            </div>
            {index < breadcrumbs.length - 1 && (
              <ChevronRight className="text-xl" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

Title.Skeleton = function TitleSkeleton() {
  return (
    <Skeleton className="w-20 h-8 rounded-md"/>
  );
}