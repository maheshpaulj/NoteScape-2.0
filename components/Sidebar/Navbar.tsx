'use client'

import React from "react"
import { useParams, usePathname } from "next/navigation"
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
  const pathname = usePathname()
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

  if (!roomId) {
    let pageTitle = "";
    if (pathname === "/home") pageTitle = "Home";
    else if (pathname === "/reminders") pageTitle = "Reminders";
    else if (pathname === "/allNotes") pageTitle = "All Notes";
    else if (pathname === "/trash") pageTitle = "Trash";
    else if (pathname === "/profile") pageTitle = "Profile";
    else pageTitle = "NoteScape";

    return (
      <nav className="bg-background dark:bg-[#1F1F1F] px-3 py-2 w-full flex gap-x-4 items-center h-12">
        {isCollapsed && (
          <MenuIcon
            className="w-10 h-10 text-muted-foreground scale-75 md:scale-100"
            role="button"
            onClick={onResetWidth}
          />
        )}
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-x-1 font-semibold text-sm max-md:text-base">
            <span>{pageTitle}</span>
          </div>
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
            className="w-10 h-10 text-muted-foreground"
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
