"use client";

import { ClientSideSuspense, RoomProvider } from "@liveblocks/react/suspense";
import { Spinner } from "../Spinner";
import LiveCursorProvider from "./LiveCursorProvider";

function RoomProviderWrapper({roomId, children}:{roomId:string; children:React.ReactNode}) {
  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null
      }}
    >
      <ClientSideSuspense fallback={<Spinner size={"lg"} className="mt-32 w-full" />}>
        <LiveCursorProvider>
          {children}
        </LiveCursorProvider>
      </ClientSideSuspense>
    </RoomProvider>
  )
} 
export default RoomProviderWrapper