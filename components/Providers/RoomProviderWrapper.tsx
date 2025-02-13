"use client";

import { ClientSideSuspense, RoomProvider, useOthers } from "@liveblocks/react/suspense";
import { Spinner } from "../Spinner";
import LiveCursorProvider from "./LiveCursorProvider";
import { collectionGroup, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import { useEffect, useState, useCallback } from "react";
import NotesPage from "../NotesPage";
import { useCollection } from "react-firebase-hooks/firestore";
import { useUser } from "@clerk/nextjs";

// Component to detect other users in the room
function UsersPresenceDetector({ onPresenceChange }: { 
  onPresenceChange: (hasOthers: boolean) => void;
}) {
  const others = useOthers();

  useEffect(() => {
    onPresenceChange(others.length > 0);
  }, [others, onPresenceChange]);

  return null;
}

function RoomProviderWrapper({
  roomId,
  children,
}: {
  roomId: string;
  children: React.ReactNode;
}) {
  const [useLiveblocks, setUseLiveblocks] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useUser();

  const [usersInRoom] = useCollection(
    user && query(collectionGroup(db, "rooms"), where("roomId", "==", roomId))
  ) || 1;

  // Callback to switch to Liveblocks if others are present
  const handlePresenceChange = useCallback((hasOthers: boolean) => {
    setUseLiveblocks(hasOthers);
  }, []);

  useEffect(() => {
    // Check if the note exists in Firestore
    const roomDocRef = doc(db, "notes", roomId);

    const unsubscribe = onSnapshot(roomDocRef, (snapshot) => {
      setIsLoading(false);

      if (!snapshot.exists()) {
        setUseLiveblocks(false); // Stay in Firebase editor if the document does not exist
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  if (isLoading) {
    return <Spinner size="lg" className="mt-32 w-full" />;
  }

  if (usersInRoom?.docs.length == 1){
    return <NotesPage noteId={roomId} />
  }

  return (
    <RoomProvider id={roomId} initialPresence={{ cursor: null }}>
      <ClientSideSuspense fallback={<div className="flex flex-col items-center space-y-2 mt-32 w-full"><Spinner size="lg" /><p className="animate-pulse">Loading Collabrative Note...</p></div>}>
        <LiveCursorProvider>
          <UsersPresenceDetector onPresenceChange={handlePresenceChange} />
          {useLiveblocks ? children : <NotesPage noteId={roomId} />}
        </LiveCursorProvider>
      </ClientSideSuspense>
    </RoomProvider>
  );
}

export default RoomProviderWrapper;
