"use client";

import { ClientSideSuspense, RoomProvider, useOthers } from "@liveblocks/react/suspense";
import { Spinner } from "../Spinner";
import LiveCursorProvider from "./LiveCursorProvider";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase";
import { useEffect, useState, useCallback } from "react";
import NotesPage from "../NotesPage";

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

  return (
    <RoomProvider id={roomId} initialPresence={{ cursor: null }}>
      <ClientSideSuspense fallback={<Spinner size="lg" className="mt-32 w-full" />}>
        <LiveCursorProvider>
          <UsersPresenceDetector onPresenceChange={handlePresenceChange} />
          {useLiveblocks ? children : <NotesPage noteId={roomId} />}
        </LiveCursorProvider>
      </ClientSideSuspense>
    </RoomProvider>
  );
}

export default RoomProviderWrapper;
