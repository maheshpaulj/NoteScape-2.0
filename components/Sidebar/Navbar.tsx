'use client'

import React from "react"
import { useParams } from "next/navigation"
import { MenuIcon } from "lucide-react"
import { Title } from "./Title"
import { doc, DocumentData, DocumentReference, Timestamp } from "firebase/firestore"
import { useUser } from "@clerk/nextjs"
import { useDocumentData } from "react-firebase-hooks/firestore"
import { db } from "@/firebase"
import useOwner from "@/lib/useOwner"
import { Menu } from "./Menu"
import InviteUser from "./InviteUser"
import { Banner } from "./Banner"

interface NavbarProps {
  isCollapsed: boolean
  onResetWidth: () => void
}

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
  quickAccess: boolean;
}

export function Navbar({ isCollapsed, onResetWidth }: NavbarProps) {
  const params = useParams()
  const { user } = useUser()
  const roomId = params.noteId?.toString()
  const isOwner = useOwner(roomId);

  // Get the room document from Firestore
  const roomDocRef = roomId && user 
    ? doc(db, `users/${user.emailAddresses[0].toString()}/rooms/${roomId}`)
    : null

  const [roomData, loading] = useDocumentData<RoomDocument>(roomDocRef as DocumentReference<RoomDocument>);

  if (loading) {
    return (
      <nav className="bg-background dark:bg-[#1F1F1F] px-3 py-2 w-full flex justify-between gap-x-4">
        <Title.Skeleton />
        <div className="flex gap-x-2 items-center">
          <Menu.Skeleton/>
        </div>
      </nav>
    )
  }

  if (!roomData) {
    return null
  }

  return (
    <>
      <nav className="bg-background dark:bg-[#1F1F1F] px-3 py-2 w-full flex gap-x-4 items-center">
        {isCollapsed && (
          <MenuIcon
            className="w-12 h-12 text-muted-foreground"
            role="button"
            onClick={onResetWidth}
          />
        )}
        <div className="flex justify-between items-center w-full">
          <Title initialData={roomData} id={roomId} isOwner={isOwner} />
          <div className="flex gap-x-2 items-center">
            {isOwner && <InviteUser />}
            <Menu noteId={roomId} quickAccess={roomData.quickAccess} archived={roomData.archived} />
          </div>
        </div>
      </nav>
      {roomData.archived && (
        <Banner noteId={roomId} />
      )}
    </>
  )
}
